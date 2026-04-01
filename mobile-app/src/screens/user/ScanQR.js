import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { assetsAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

// ============================================
// ScanQR — REWRITTEN for MongoDB with i18n
// ============================================

export default function ScanQR({ navigation }) {
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAssetId, setManualAssetId] = useState('');

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.message}>{t('requestingPermission')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.icon}>📷</Text>
        <Text style={styles.title}>{t('cameraAccessNeeded')}</Text>
        <Text style={styles.subtitle}>
          {t('cameraPermissionDesc')}
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>{t('grantPermission')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manualEntryLink}
          onPress={() => setShowManualEntry(true)}
        >
          <Text style={styles.manualEntryLinkText}>{t('enterManuallyLink')}</Text>
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
          t('assetNotFound'),
          `${t('assetNotFoundMsg')} "${assetId}"\n\n${t('invalidQrHint')}`,
          [
            { text: t('tryAgain'), onPress: resetScanner },
            { 
              text: t('enterManually'), 
              onPress: () => { 
                resetScanner(); 
                setShowManualEntry(true); 
              } 
            }
          ]
        );
      } else {
        Alert.alert(
          t('error'),
          t('scanFailed'),
          [{ text: t('ok'), onPress: resetScanner }]
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
      Alert.alert(t('error'), t('enterAssetError'));
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
            <Text style={styles.headerText}>{t('scanQrCode')}</Text>
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
                  <Text style={styles.loadingText}>🔍 {t('lookingUpAsset')}</Text>
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.instructions}>{t('scanInstructions')}</Text>
            <TouchableOpacity 
              style={styles.manualButton} 
              onPress={() => setShowManualEntry(true)}
            >
              <Text style={styles.manualButtonText}>⌨️ {t('enterIdManually')}</Text>
            </TouchableOpacity>
            {scanned && !loading && (
              <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
                <Text style={styles.scanAgainText}>🔄 {t('scanAgain')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>

      {/* Manual Entry Modal */}
      <Modal visible={showManualEntry} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('enterAssetId')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('enterAssetHint')}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('assetPlaceholder')}
              value={manualAssetId}
              onChangeText={setManualAssetId}
              autoCapitalize="characters"
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { 
                  setShowManualEntry(false); 
                  setManualAssetId(''); 
                }}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleManualSubmit}
              >
                <Text style={styles.submitButtonText}>{t('submit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  centerContainer: { 
    flex: 1, 
    backgroundColor: '#1a1a2e', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 30 
  },
  camera: { 
    flex: 1 
  },
  icon: { 
    fontSize: 60, 
    marginBottom: 20 
  },
  title: { 
    color: 'white', 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  subtitle: { 
    color: '#888', 
    fontSize: 14, 
    textAlign: 'center', 
    marginBottom: 30, 
    lineHeight: 22 
  },
  message: { 
    color: 'white', 
    fontSize: 16 
  },
  permissionButton: { 
    backgroundColor: '#004e68', 
    paddingVertical: 15, 
    paddingHorizontal: 40, 
    borderRadius: 10 
  },
  permissionButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  manualEntryLink: { 
    marginTop: 20, 
    padding: 10 
  },
  manualEntryLinkText: { 
    color: '#004e68', 
    fontSize: 14 
  },
  overlay: { 
    flex: 1 
  },
  overlayTop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    paddingBottom: 20 
  },
  headerText: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  overlayMiddle: { 
    flexDirection: 'row' 
  },
  overlaySide: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)' 
  },
  overlayBottom: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    alignItems: 'center', 
    paddingTop: 30 
  },
  scanFrame: { 
    width: 260, 
    height: 260, 
    position: 'relative', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  corner: { 
    position: 'absolute', 
    width: 40, 
    height: 40, 
    borderColor: '#004e68' 
  },
  topLeft: { 
    top: 0, 
    left: 0, 
    borderTopWidth: 4, 
    borderLeftWidth: 4, 
    borderTopLeftRadius: 10 
  },
  topRight: { 
    top: 0, 
    right: 0, 
    borderTopWidth: 4, 
    borderRightWidth: 4, 
    borderTopRightRadius: 10 
  },
  bottomLeft: { 
    bottom: 0, 
    left: 0, 
    borderBottomWidth: 4, 
    borderLeftWidth: 4, 
    borderBottomLeftRadius: 10 
  },
  bottomRight: { 
    bottom: 0, 
    right: 0, 
    borderBottomWidth: 4, 
    borderRightWidth: 4, 
    borderBottomRightRadius: 10 
  },
  loadingContainer: { 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20 
  },
  loadingText: { 
    color: 'white', 
    fontSize: 14 
  },
  instructions: { 
    color: 'white', 
    fontSize: 16, 
    textAlign: 'center', 
    marginBottom: 20 
  },
  manualButton: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingVertical: 12, 
    paddingHorizontal: 25, 
    borderRadius: 25, 
    marginBottom: 15 
  },
  manualButtonText: { 
    color: 'white', 
    fontSize: 14 
  },
  scanAgainButton: { 
    backgroundColor: '#004e68', 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    borderRadius: 25 
  },
  scanAgainText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: 'white', 
    borderRadius: 15, 
    padding: 25, 
    width: '100%', 
    maxWidth: 350 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 10, 
    textAlign: 'center' 
  },
  modalSubtitle: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 20, 
    textAlign: 'center', 
    lineHeight: 20 
  },
  modalInput: { 
    borderWidth: 2, 
    borderColor: '#e0e0e0', 
    borderRadius: 10, 
    padding: 15, 
    fontSize: 18, 
    textAlign: 'center', 
    marginBottom: 20, 
    fontWeight: 'bold' 
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  modalButton: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  cancelButton: { 
    backgroundColor: '#f0f0f0', 
    marginRight: 10 
  },
  cancelButtonText: { 
    color: '#666', 
    fontWeight: 'bold' 
  },
  submitButton: { 
    backgroundColor: '#004e68', 
    marginLeft: 10 
  },
  submitButtonText: { 
    color: 'white', 
    fontWeight: 'bold' 
  },
});