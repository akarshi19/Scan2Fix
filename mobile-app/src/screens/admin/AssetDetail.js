import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';

const TYPE_CONFIG = {
  AC:             { icon: 'snow-outline',  color: '#2196F3', label: 'Air Conditioner' },
  WATER_COOLER:   { icon: 'water-outline', color: '#00BCD4', label: 'Water Cooler' },
  DESERT_COOLER:  { icon: 'leaf-outline',  color: '#FF9800', label: 'Desert Cooler' },
};

export default function AssetDetail({ route }) {
  const { asset } = route.params;
  const { colors } = useTheme();
  const printableRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const config = TYPE_CONFIG[asset.type] || { icon: 'cube-outline', color: '#666', label: asset.type };

  // Capture the branded QR card as image and share/save
  const handleDownloadQR = async () => {
    setDownloading(true);
    try {
      // Small delay to ensure the view is rendered
      await new Promise(resolve => setTimeout(resolve, 300));

      const uri = await captureRef(printableRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `QR Code - ${asset.asset_id}`,
        });
      } else {
        Alert.alert('Saved', 'QR code image generated successfully');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to generate QR image. ' + (error.message || ''));
    } finally {
      setDownloading(false);
    }
  };

  const handleShareQR = async () => {
    await handleDownloadQR(); // Same flow — share the branded image
  };

  return (
    <ScreenLayout title={asset.asset_id} showBack={true}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={[s.heroIcon, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon} size={48} color={config.color} />
        </View>
        <Text style={[s.heroType, { color: config.color }]}>{config.label}</Text>
        <View style={[s.statusPill, { backgroundColor: asset.is_active ? '#E8F5E9' : '#FFEBEE' }]}>
          <View style={[s.statusDot, { backgroundColor: asset.is_active ? '#4CAF50' : '#F44336' }]} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: asset.is_active ? '#2E7D32' : '#C62828' }}>
            {asset.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Details Card */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>Equipment Details</Text>
        <DetailRow icon="barcode-outline" label="Asset ID" value={asset.asset_id} colors={colors} />
        <DetailRow icon="cube-outline" label="Type" value={config.label} colors={colors} />
        <DetailRow icon="location-outline" label="Location" value={asset.location} colors={colors} />
        {asset.brand && <DetailRow icon="business-outline" label="Brand" value={asset.brand} colors={colors} />}
        {asset.model && <DetailRow icon="hardware-chip-outline" label="Model" value={asset.model} colors={colors} />}
        <DetailRow icon="calendar-outline" label="Installed"
          value={asset.install_date ? new Date(asset.install_date).toLocaleDateString('en-GB') : 'Not set'}
          colors={colors} last
        />
      </View>

      {/* QR Code Card — Visible on screen */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>QR Code</Text>

        <View style={s.qrContainer}>
          <View style={s.qrWrapper}>
            <QRCode
              value={asset.asset_id}
              size={180}
              backgroundColor="#FFFFFF"
              color="#1A1A2E"
            />
          </View>
          <Text style={[s.qrId, { color: colors.active }]}>{asset.asset_id}</Text>
          <Text style={[s.qrHint, { color: colors.textMut }]}>
            Scan this QR code with Scan2Fix app to report issues
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={s.qrActions}>
          <TouchableOpacity
            style={[s.qrBtn, { backgroundColor: colors.active }]}
            onPress={handleDownloadQR}
            disabled={downloading}
            activeOpacity={0.85}
          >
            <Ionicons name={downloading ? 'hourglass-outline' : 'download-outline'} size={20} color="#FFF" />
            <Text style={s.qrBtnText}>{downloading ? 'Generating...' : 'Download QR'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.qrBtn, { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }]}
            onPress={handleShareQR}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={20} color={colors.active} />
            <Text style={[s.qrBtnText, { color: colors.active }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════ */}
      {/* HIDDEN Printable QR Card — captured as image   */}
      {/* This is positioned off-screen but rendered     */}
      {/* so captureRef can capture it as a branded PNG  */}
      {/* ═══════════════════════════════════════════════ */}
      <View style={s.hiddenContainer} pointerEvents="none">
        <View ref={printableRef} style={s.printCard} collapsable={false}>
          {/* Header */}
          <View style={s.printHeader}>
            <Text style={s.printLogo}>🔧 Scan2Fix</Text>
          </View>

          {/* Type badge */}
          <View style={[s.printTypeBadge, { backgroundColor: `${config.color}15` }]}>
            <Ionicons name={config.icon} size={18} color={config.color} />
            <Text style={[s.printTypeText, { color: config.color }]}> {config.label}</Text>
          </View>

          {/* QR Code */}
          <View style={s.printQrWrap}>
            <QRCode
              value={asset.asset_id}
              size={220}
              backgroundColor="#FFFFFF"
              color="#1A1A2E"
            />
          </View>

          {/* Asset ID */}
          <Text style={s.printAssetId}>{asset.asset_id}</Text>

          {/* Location */}
          <View style={s.printLocationRow}>
            <Ionicons name="location" size={14} color="#5A7A8A" />
            <Text style={s.printLocation}> {asset.location}</Text>
          </View>

          {/* Brand & Model */}
          {(asset.brand || asset.model) && (
            <Text style={s.printBrand}>
              {[asset.brand, asset.model].filter(Boolean).join(' • ')}
            </Text>
          )}

          {/* Footer */}
          <View style={s.printFooter}>
            <View style={s.printFooterLine} />
            <Text style={s.printFooterText}>
              Scan this QR code with the Scan2Fix app to report issues
            </Text>
          </View>
        </View>
      </View>
    </ScreenLayout>
  );
}

function DetailRow({ icon, label, value, colors, last }) {
  return (
    <View style={[ds.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Ionicons name={icon} size={16} color={colors.textMut} style={{ marginRight: 12 }} />
      <Text style={[ds.label, { color: colors.textMut }]}>{label}</Text>
      <Text style={[ds.value, { color: colors.textPri }]}>{value || 'N/A'}</Text>
    </View>
  );
}

const ds = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  label: { width: 90, fontSize: 13, fontWeight: '500' },
  value: { flex: 1, fontSize: 14, fontWeight: '600' },
});

const s = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 20, marginBottom: 16 },
  heroIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroType: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 10, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  card: { borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEF4F8' },
  qrContainer: { alignItems: 'center', paddingVertical: 20 },
  qrWrapper: { padding: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 2, borderColor: '#EEF4F8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  qrId: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  qrHint: { fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 18 },
  qrActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  qrBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14, shadowColor: '#5BA8D4', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  qrBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // Hidden printable card (positioned off-screen)
  hiddenContainer: {
    position: 'absolute',
    left: -1000,
    top: 0,
    opacity: 1, // Must be visible for capture
  },
  printCard: {
    width: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8EFF3',
  },
  printHeader: {
    marginBottom: 16,
  },
  printLogo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  printTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  printTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  printQrWrap: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EEF4F8',
    marginBottom: 16,
  },
  printAssetId: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: 1,
    marginBottom: 8,
  },
  printLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  printLocation: {
    fontSize: 14,
    color: '#5A7A8A',
    fontWeight: '500',
  },
  printBrand: {
    fontSize: 12,
    color: '#9DB5C0',
    marginBottom: 16,
  },
  printFooter: {
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  printFooterLine: {
    width: '80%',
    height: 1,
    backgroundColor: '#EEF4F8',
    marginBottom: 12,
  },
  printFooterText: {
    fontSize: 11,
    color: '#9DB5C0',
    textAlign: 'center',
    lineHeight: 16,
  },
});