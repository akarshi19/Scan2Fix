import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { assetsAPI } from '../../services/api';

// ============================================
// ScanQR — REWRITTEN for MongoDB
// ============================================
// BEFORE:
//   const { data: asset, error } = await supabase
//     .from('assets').select('*').eq('id', assetId).single();
//
// AFTER:
//   const response = await assetsAPI.getByQR(assetId);
// ============================================

export default function ScanQR({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAssetId, setManualAssetId] = useState('');

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.icon}>📷</Text>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          We need camera permission to scan QR codes on machines
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manualEntryLink}
          onPress={() => setShowManualEntry(true)}
        >
          <Text style={styles.manualEntryLinkText}>Or enter Asset ID manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    console.log('📷 QR Scanned:', data);
    await lookupAsset(data.trim());
  };

  const lookupAsset = async (assetId) => {
    try {
      // ── CHANGED: supabase.from('assets') → assetsAPI.getByQR() ──
      const response = await assetsAPI.getByQR(assetId);

      if (response.data.success) {
        const asset = response.data.data;
        console.log('Asset found:', asset);

        navigation.navigate('LodgeComplaint', {
          assetId: asset.id,
          assetType: asset.type,
          assetLocation: asset.location,
          assetBrand: asset.brand,       
          assetModel: asset.model,        
          assetInstallDate: asset.install_date,  
        });
      }
    } catch (err) {
      console.error('Lookup error:', err);

      if (err.status === 404) {
        Alert.alert(
          'Asset Not Found ❌',
          `No machine found with ID: "${assetId}"\n\nMake sure you're scanning a valid Scan2Fix QR code.`,
          [
            { text: 'Try Again', onPress: resetScanner },
            { text: 'Enter Manually', onPress: () => { resetScanner(); setShowManualEntry(true); } }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to process QR code. Please try again.',
          [{ text: 'OK', onPress: resetScanner }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setLoading(false);
  };

  const handleManualSubmit = () => {
    if (!manualAssetId.trim()) {
      Alert.alert('Error', 'Please enter an Asset ID');
      return;
    }
    setShowManualEntry(false);
    setScanned(true);
    setLoading(true);
    lookupAsset(manualAssetId.trim().toUpperCase());
    setManualAssetId('');
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.overlayTop}>
            <Text style={styles.headerText}>Scan QR Code</Text>
          </View>
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {loading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>🔍 Looking up asset...</Text>
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.instructions}>Point camera at QR code on the machine</Text>
            <TouchableOpacity style={styles.manualButton} onPress={() => setShowManualEntry(true)}>
              <Text style={styles.manualButtonText}>⌨️ Enter ID Manually</Text>
            </TouchableOpacity>
            {scanned && !loading && (
              <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
                <Text style={styles.scanAgainText}>🔄 Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>

      <Modal visible={showManualEntry} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Asset ID</Text>
            <Text style={styles.modalSubtitle}>
              Enter the ID printed on the machine (e.g., AC-101, WC-201)
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., AC-101"
              value={manualAssetId}
              onChangeText={setManualAssetId}
              autoCapitalize="characters"
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setShowManualEntry(false); setManualAssetId(''); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleManualSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 30 },
  camera: { flex: 1 },
  icon: { fontSize: 60, marginBottom: 20 },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  message: { color: 'white', fontSize: 16 },
  permissionButton: { backgroundColor: '#004e68', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 10 },
  permissionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  manualEntryLink: { marginTop: 20, padding: 10 },
  manualEntryLinkText: { color: '#004e68', fontSize: 14 },
  overlay: { flex: 1 },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 },
  headerText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  overlayMiddle: { flexDirection: 'row' },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', paddingTop: 30 },
  scanFrame: { width: 260, height: 260, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#004e68' },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  loadingContainer: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  loadingText: { color: 'white', fontSize: 14 },
  instructions: { color: 'white', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  manualButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, marginBottom: 15 },
  manualButtonText: { color: 'white', fontSize: 14 },
  scanAgainButton: { backgroundColor: '#004e68', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  scanAgainText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 25, width: '100%', maxWidth: 350 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center', lineHeight: 20 },
  modalInput: { borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 10, padding: 15, fontSize: 18, textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f0f0f0', marginRight: 10 },
  cancelButtonText: { color: '#666', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#004e68', marginLeft: 10 },
  submitButtonText: { color: 'white', fontWeight: 'bold' },
});