import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export default function ScanQR({ navigation }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    // The universal QR points to the web complaint URL.
    // When scanned in the app, open the LodgeComplaint screen instead.
    navigation.navigate('LodgeComplaint');
  };

  const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: '#000' },
    center:     { flex: 1, backgroundColor: colors.pageBg, justifyContent: 'center', alignItems: 'center', padding: 30 },
    camera:     { flex: 1 },
    icon:       { fontSize: 60, marginBottom: 20 },
    title:      { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    subtitle:   { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    permBtn:    { backgroundColor: '#004e68', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 10 },
    permBtnTxt: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    overlay:    { flex: 1 },
    top:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 },
    headerTxt:  { color: 'white', fontSize: 20, fontWeight: 'bold' },
    middle:     { flexDirection: 'row' },
    side:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    frame:      { width: 260, height: 260, position: 'relative', justifyContent: 'center', alignItems: 'center' },
    bottom:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', paddingTop: 30 },
    instructions: { color: 'white', fontSize: 15, textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 },
    resetBtn:   { backgroundColor: '#004e68', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
    resetTxt:   { color: 'white', fontSize: 14, fontWeight: 'bold' },
    corner:     { position: 'absolute', width: 40, height: 40, borderColor: '#004e68' },
    topLeft:    { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
    topRight:   { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
    botLeft:    { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
    botRight:   { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  });

  if (!permission) {
    return <View style={styles.center}><Text style={{ color: colors.textSec }}>Requesting camera…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>📷</Text>
        <Text style={[styles.title, { color: colors.textPri }]}>{t('cameraAccessNeeded')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSec }]}>{t('cameraPermissionDesc')}</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnTxt}>{t('grantPermission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      {/* Overlay uses absolute positioning — CameraView must have no children */}
      <View style={[styles.overlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
        <View style={styles.top}>
          <Text style={styles.headerTxt}>Scan QR Code</Text>
        </View>
        <View style={styles.middle}>
          <View style={styles.side} />
          <View style={styles.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.botLeft]} />
            <View style={[styles.corner, styles.botRight]} />
          </View>
          <View style={styles.side} />
        </View>
        <View style={styles.bottom}>
          <Text style={styles.instructions}>Point camera at the Scan2Fix QR code to lodge a complaint</Text>
          {scanned && (
            <TouchableOpacity style={styles.resetBtn} onPress={() => setScanned(false)}>
              <Text style={styles.resetTxt}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
