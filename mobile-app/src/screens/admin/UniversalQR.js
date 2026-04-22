import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import { SERVER_URL } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';

const QR_URL = `${SERVER_URL}/complaint`;

export default function UniversalQR() {
  const { colors } = useTheme();
  const qrRef = useRef(null);
  const [sharing, setSharing]   = useState(false);
  const [printing, setPrinting] = useState(false);

  const handleShareQR = async () => {
    try {
      setSharing(true);
      const uri = await captureRef(qrRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share QR Code' });
      } else {
        Alert.alert('Saved', `QR saved to:\n${uri}`);
      }
    } catch { Alert.alert('Error', 'Could not share QR code.'); }
    finally { setSharing(false); }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      const qrBase64 = await getQRBase64();

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8f8f8; }
  .card { background:white; border-radius:16px; padding:36px 40px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.1); max-width:320px; width:100%; }
  .logo { font-size:28px; font-weight:800; color:#004e68; margin-bottom:4px; }
  .tagline { font-size:13px; color:#5A7A8A; margin-bottom:20px; }
  .qr-box { background:#fff; padding:12px; border:2px solid #E8EFF4; border-radius:10px; display:inline-block; margin-bottom:20px; }
  .qr-box img { display:block; width:220px; height:220px; }
  .instruction { font-size:12px; color:#888; line-height:1.6; margin-bottom:8px; }
  .url { font-size:10px; color:#bbb; word-break:break-all; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">🔧 Scan2Fix</div>
    <div class="tagline">Maintenance Issue Reporting</div>
    <div class="qr-box">${qrBase64 ? `<img src="${qrBase64}" alt="QR"/>` : ''}</div>
    <div class="instruction">Scan this QR code with your phone camera<br/>to report a maintenance issue.<br/><strong>No app download required.</strong></div>
    <div class="url">${QR_URL}</div>
  </div>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Print / Save QR', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Saved', `PDF saved to:\n${uri}`);
      }
    } catch { Alert.alert('Error', 'Could not generate print file.'); }
    finally { setPrinting(false); }
  };

  function getQRBase64() {
    return new Promise((resolve) => {
      if (!qrRef.current) return resolve('');
      captureRef(qrRef, { format: 'png', quality: 1 })
        .then(uri => fetch(uri))
        .then(r => r.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        })
        .catch(() => resolve(''));
    });
  }

  const s = StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
    qrCard: {
      backgroundColor: colors.cardBg, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
      marginBottom: 24,
    },
    qrWrap: { padding: 14, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E8EFF4', marginBottom: 18 },
    qrInstruction: { fontSize: 13, color: colors.textSec, textAlign: 'center', lineHeight: 20, marginBottom: 6 },
    urlText: { fontSize: 10, color: colors.textMut + '80', textAlign: 'center' },
    btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
    btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12 },
    btnPrimary: { backgroundColor: colors.button },
    btnSecondary: { backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.button },
    btnText: { fontSize: 14, fontWeight: '700' },
    btnTextPrimary: { color: '#fff' },
    btnTextSecondary: { color: colors.button },
  });

  return (
    <ScreenLayout title="Universal QR Code" showDecor>
      <View style={s.wrap}>
        <View style={s.qrCard}>
          <View style={s.qrWrap} ref={qrRef} collapsable={false}>
            <QRCode value={QR_URL} size={210} backgroundColor="#FFFFFF" color="#004e68" />
          </View>
          <Text style={s.qrInstruction}>
            Scan with any phone camera{'\n'}
            <Text style={{ fontWeight: '700' }}>No app download required</Text>
          </Text>
          <Text style={s.urlText}>{QR_URL}</Text>
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handlePrint} disabled={printing} activeOpacity={0.8}>
            {printing ? <ActivityIndicator size={18} color="#fff" /> : <Ionicons name="print-outline" size={18} color="#fff" />}
            <Text style={[s.btnText, s.btnTextPrimary]}>{printing ? 'Preparing…' : 'Print / PDF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={handleShareQR} disabled={sharing} activeOpacity={0.8}>
            {sharing ? <ActivityIndicator size={18} color={colors.button} /> : <Ionicons name="share-outline" size={18} color={colors.button} />}
            <Text style={[s.btnText, s.btnTextSecondary]}>{sharing ? 'Sharing…' : 'Share Image'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}
