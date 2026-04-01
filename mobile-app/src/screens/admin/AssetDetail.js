import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
  TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import DateTimePicker from '@react-native-community/datetimepicker';
import { assetsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

const ACTIVE_COLOR = '#5BA8D4';
const TEXT_SEC = '#5A7A8A';
const TEXT_MUT = '#9DB5C0';

export default function AssetDetail({ route, navigation }) {
  const { asset } = route.params;
  const { colors } = useTheme();
  const { t } = useLanguage();
  const printableRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // Editable state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState(asset.location || '');
  const [brand, setBrand] = useState(asset.brand || '');
  const [model, setModel] = useState(asset.model || '');
  const [installDate, setInstallDate] = useState(
    asset.install_date ? new Date(asset.install_date) : null
  );
  const [isActive, setIsActive] = useState(asset.is_active !== false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Dynamic type label — handles custom types
  const getTypeLabel = (typeKey) => {
    const labels = {
      'AC': t('airConditioners'),
      'WATER_COOLER': t('waterCoolers'),
      'DESERT_COOLER': t('desertCoolers'),
    };
    return labels[typeKey] || typeKey?.replace(/_/g, ' ') || t('equipment');
  };

  const typeLabel = getTypeLabel(asset.type);

  // Cancel editing
  const handleCancelEdit = () => {
    setLocation(asset.location || '');
    setBrand(asset.brand || '');
    setModel(asset.model || '');
    setInstallDate(asset.install_date ? new Date(asset.install_date) : null);
    setEditing(false);
  };

  // Save changes
  const handleSave = async () => {
    if (!location.trim()) {
      Alert.alert(t('error'), t('locationRequired'));
      return;
    }

    setSaving(true);
    try {
      const assetMongoId = asset._id || asset.id;
      const response = await assetsAPI.update(assetMongoId, {
        location: location.trim(),
        brand: brand.trim(),
        model: model.trim(),
        install_date: installDate ? installDate.toISOString() : null,
      });

      if (response.data.success) {
        asset.location = location.trim();
        asset.brand = brand.trim();
        asset.model = model.trim();
        asset.install_date = installDate ? installDate.toISOString() : null;

        setEditing(false);
        Alert.alert(t('success'), t('updateSuccess'));
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Toggle active/inactive — separate API call
  const handleToggleActive = () => {
    const action = isActive ? t('deactivate') : t('activate');
    const message = isActive ? t('deactivateMessage') : t('activateMessage');

    Alert.alert(
      isActive ? t('deactivateEquipment') : t('activateEquipment'),
      message,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: action,
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            setToggling(true);
            try {
              const assetMongoId = asset._id || asset.id;
              const response = await assetsAPI.toggleActive(assetMongoId);
              if (response.data.success) {
                setIsActive(!isActive);
                asset.is_active = !isActive;
                Alert.alert(t('success'), response.data.message);
              }
            } catch (error) {
              Alert.alert(t('error'), error.message || t('toggleFailed'));
            } finally {
              setToggling(false);
            }
          },
        },
      ]
    );
  };

  // Date formatting
  const formatDate = (date) => {
    if (!date) return t('notSet');
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) setInstallDate(selectedDate);
  };

  // QR download
  const handleDownloadQR = async () => {
    setDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const uri = await captureRef(printableRef, {
        format: 'png', quality: 1, result: 'tmpfile',
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `QR Code - ${asset.asset_id}`,
        });
      } else {
        Alert.alert(t('success'), t('qrSaved'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('qrFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return ( 
    <ScreenLayout title={t('equipmentId')} showBack showDecor padBottom={90}>
      {/* Details Card — Editable */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <View style={s.cardTitleRow}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('equipmentDetails')}</Text>
          <TouchableOpacity
            style={[s.editIconBtn, editing && s.editIconBtnActive]}
            onPress={() => editing ? handleCancelEdit() : setEditing(true)}
            activeOpacity={0.8}
          >
            {editing
              ? <AntDesign name="close" size={13} color="#E53935" />
              : <Ionicons name="pencil-outline" size={16} color={ACTIVE_COLOR} />
            }
          </TouchableOpacity>
        </View>

        {!editing ? (
          <>
            <DetailRow icon="barcode-outline" label={t('equipmentId')} value={asset.asset_id} colors={colors} t={t} />
            <DetailRow icon="cube-outline" label={t('type')} value={typeLabel} colors={colors} t={t} />
            <DetailRow icon="location-outline" label={t('location')} value={location} colors={colors} t={t} />
            {brand ? <DetailRow icon="business-outline" label={t('brand')} value={brand} colors={colors} t={t} /> : null}
            {model ? <DetailRow icon="hardware-chip-outline" label={t('model')} value={model} colors={colors} t={t} /> : null}
            <DetailRow icon="calendar-outline" label={t('installedOn')} value={formatDate(installDate)} colors={colors} t={t} last />
          </>
        ) : (
          <>
            {/* Asset ID — not editable */}
            <View style={s.readOnlyField}>
              <Ionicons name="barcode-outline" size={16} color={TEXT_MUT} />
              <Text style={s.readOnlyLabel}>{t('assetId')}</Text>
              <Text style={s.readOnlyValue}>{asset.asset_id}</Text>
              <Ionicons name="lock-closed-outline" size={14} color={TEXT_MUT} />
            </View>

            {/* Type — not editable */}
            <View style={s.readOnlyField}>
              <Ionicons name="cube-outline" size={16} color={TEXT_MUT} />
              <Text style={s.readOnlyLabel}>{t('type')}</Text>
              <Text style={s.readOnlyValue}>{typeLabel}</Text>
              <Ionicons name="lock-closed-outline" size={14} color={TEXT_MUT} />
            </View>

            <EditField
              label={t('editLocation')}
              icon="location-outline"
              value={location}
              onChangeText={setLocation}
              placeholder={t('locationPlaceholder')}
              colors={colors}
              t={t}
            />

            <EditField
              label={t('editBrand')}
              icon="business-outline"
              value={brand}
              onChangeText={setBrand}
              placeholder={t('brandPlaceholder')}
              colors={colors}
              t={t}
            />

            <EditField
              label={t('editModel')}
              icon="hardware-chip-outline"
              value={model}
              onChangeText={setModel}
              placeholder={t('modelPlaceholder')}
              colors={colors}
              t={t}
            />

            {/* Install Date */}
            <Text style={[s.editLabel, { color: colors.textSec }]}>{t('installedDate')}</Text>
            <TouchableOpacity
              style={[s.dateBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={16} color={installDate ? ACTIVE_COLOR : TEXT_MUT} />
              <Text style={[s.dateBtnText, { color: installDate ? colors.textPri : TEXT_MUT }]}>
                {installDate ? formatDate(installDate) : t('selectInstallDate')}
              </Text>
              {installDate && (
                <TouchableOpacity
                  onPress={() => setInstallDate(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={16} color={TEXT_MUT} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {showDatePicker && (
              Platform.OS === 'ios' ? (
                <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                  <TouchableOpacity style={s.dateModalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
                    <View style={[s.dateModalContent, { backgroundColor: colors.cardBg }]}>
                      <View style={s.dateModalHeader}>
                        <Text style={[s.dateModalTitle, { color: colors.textPri }]}>{t('selectDateTitle')}</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={[s.dateModalDone, { color: ACTIVE_COLOR }]}>{t('done')}</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={installDate || new Date()}
                        mode="date"
                        display="spinner"
                        maximumDate={new Date()}
                        onChange={(e, date) => { if (date) setInstallDate(date); }}
                        style={{ height: 200 }}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>
              ) : (
                <DateTimePicker
                  value={installDate || new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
              )
            )}

            {/* Save / Cancel */}
            <View style={s.editActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={handleCancelEdit}>
                <Text style={s.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={17} color="#FFF" />
                    <Text style={s.saveBtnText}>{t('saveChanges')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Equipment Status Card */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <View style={s.statusRow}>
          <View style={s.statusInfo}>
            <View style={[
              s.statusIndicator,
              { backgroundColor: isActive ? '#E8F5E9' : '#FFEBEE' },
            ]}>
              <View style={[
                s.statusDotLg,
                { backgroundColor: isActive ? '#4CAF50' : '#F44336' },
              ]} />
            </View>
            <View>
              <Text style={[s.statusTitle, { color: colors.textPri }]}>
                {isActive ? t('active') : t('inactiveStatus')}
              </Text>
              <Text style={[s.statusSubtext, { color: colors.textMut }]}>
                {isActive ? t('availableForComplaints') : t('hiddenFromQR')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              s.toggleBtn,
              isActive ? s.toggleBtnDeactivate : s.toggleBtnActivate,
            ]}
            onPress={handleToggleActive}
            disabled={toggling}
            activeOpacity={0.8}
          >
            {toggling ? (
              <ActivityIndicator size="small" color={isActive ? '#F44336' : '#4CAF50'} />
            ) : (
              <>
                <Ionicons
                  name={isActive ? 'close-circle-outline' : 'checkmark-circle-outline'}
                  size={14}
                  color={isActive ? '#F44336' : '#4CAF50'}
                />
                <Text style={[
                  s.toggleBtnText,
                  { color: isActive ? '#F44336' : '#4CAF50' },
                ]}>
                  {isActive ? ` ${t('deactivate')}` : ` ${t('activate')}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Code Card  */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>{t('qrCode')}</Text>
        <View style={s.qrContainer}>
          <View style={s.qrWrapper}>
            <QRCode value={asset.asset_id} size={180} backgroundColor="#FFFFFF" color="#1A1A2E" />
          </View>
          <Text style={[s.qrId, { color: '#004e68' }]}>{asset.asset_id}</Text>
          <Text style={[s.qrHint, { color: colors.textMut }]}>
            {t('scanHint')}
          </Text>
        </View>
        <View style={s.qrActions}>
          <TouchableOpacity
            style={[s.qrBtn, { backgroundColor: '#004e68' }]}
            onPress={handleDownloadQR}
            disabled={downloading}
            activeOpacity={0.85}
          >
            <Ionicons
              name={downloading ? 'hourglass-outline' : 'download-outline'}
              size={20}
              color="#FFF"
            />
            <Text style={s.qrBtnText}>
              {downloading ? t('generating') : t('getQrCode')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hidden Printable QR Card */}
      <View style={s.hiddenContainer} pointerEvents="none">
        <View ref={printableRef} style={s.printCard} collapsable={false}>
          <View style={s.printHeader}>
            <Text style={s.printLogo}>🔧 Scan2Fix</Text>
          </View>
          <View style={[s.printTypeBadge, { backgroundColor: `${ACTIVE_COLOR}15` }]}>
            <Ionicons name="cube-outline" size={18} color={ACTIVE_COLOR} />
            <Text style={[s.printTypeText, { color: ACTIVE_COLOR }]}> {typeLabel}</Text>
          </View>
          <View style={s.printQrWrap}>
            <QRCode value={asset.asset_id} size={220} backgroundColor="#FFFFFF" color="#1A1A2E" />
          </View>
          <Text style={s.printAssetId}>{asset.asset_id}</Text>
          <View style={s.printLocationRow}>
            <Ionicons name="location" size={14} color="#5A7A8A" />
            <Text style={s.printLocation}> {location}</Text>
          </View>
          {(brand || model) && (
            <Text style={s.printBrand}>{[brand, model].filter(Boolean).join(' • ')}</Text>
          )}
          <View style={s.printFooter}>
            <View style={s.printFooterLine} />
            <Text style={s.printFooterText}>
              {t('scanHint')}
            </Text>
          </View>
        </View>
      </View>
    </ScreenLayout>
  );
}

// ════════════════════════════════════════
// Helper Components
// ════════════════════════════════════════

function DetailRow({ icon, label, value, colors, t, last }) {
  return (
    <View style={[ds.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Ionicons name={icon} size={16} color={colors.textMut} style={{ marginRight: 12 }} />
      <Text style={[ds.label, { color: colors.textMut }]}>{label}</Text>
      <Text style={[ds.value, { color: colors.textPri }]}>{value || t('na')}</Text>
    </View>
  );
}

function EditField({ label, icon, value, onChangeText, placeholder, colors, t }) {
  return (
    <>
      <Text style={[s.editLabel, { color: colors.textSec }]}>{label}</Text>
      <View style={[s.editInputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
        <Ionicons name={icon} size={16} color={TEXT_MUT} />
        <TextInput
          style={[s.editInput, { color: colors.textPri }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={TEXT_MUT}
        />
      </View>
    </>
  );
}

// ════════════════════════════════════════
// Styles (remain exactly the same)
// ════════════════════════════════════════

const ds = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  label: { width: 150, fontSize: 13, fontWeight: '500' },
  value: { flex: 1, fontSize: 14, fontWeight: '600' },
});

const s = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroType: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#A0BDD0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotLg: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  toggleBtnDeactivate: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  toggleBtnActivate: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F8',
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardTitleSimple: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F8',
  },
  editIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconBtnActive: { backgroundColor: '#FDECEA' },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F8FA',
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0EBF0',
  },
  readOnlyLabel: { width: 65, fontSize: 12, color: TEXT_MUT, fontWeight: '500' },
  readOnlyValue: { flex: 1, fontSize: 14, color: TEXT_SEC, fontWeight: '600' },
  editLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  editInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  dateBtnText: { flex: 1, fontSize: 14 },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dateModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateModalTitle: { fontSize: 18, fontWeight: '700' },
  dateModalDone: { fontSize: 16, fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#EEF4F8',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: { color: TEXT_SEC, fontWeight: '600', fontSize: 14 },
  saveBtn: {
    flex: 2,
    backgroundColor: '#004e68',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: ACTIVE_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: { backgroundColor: '#B0CDD8', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  qrContainer: { alignItems: 'center', paddingVertical: 20 },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#EEF4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  qrId: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  qrHint: { fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 18 },
  qrActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  qrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
    shadowColor: '#5BA8D4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  qrBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  hiddenContainer: { position: 'absolute', left: -1000, top: 0, opacity: 1 },
  printCard: {
    width: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8EFF3',
  },
  printHeader: { marginBottom: 16 },
  printLogo: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  printTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  printTypeText: { fontSize: 14, fontWeight: '600' },
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
  printLocationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  printLocation: { fontSize: 14, color: '#5A7A8A', fontWeight: '500' },
  printBrand: { fontSize: 12, color: '#9DB5C0', marginBottom: 16 },
  printFooter: { alignItems: 'center', marginTop: 10, width: '100%' },
  printFooterLine: { width: '80%', height: 1, backgroundColor: '#EEF4F8', marginBottom: 12 },
  printFooterText: { fontSize: 11, color: '#9DB5C0', textAlign: 'center', lineHeight: 16 },
});