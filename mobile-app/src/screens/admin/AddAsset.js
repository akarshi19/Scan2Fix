import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { assetsAPI } from '../../services/api';

import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

export default function AddAsset({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [assetId, setAssetId] = useState('');
  const [idLoading, setIdLoading] = useState(false);
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [location, setLocation] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [installDate, setInstallDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [existingTypes, setExistingTypes] = useState([]);
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);

  // Fetch existing asset types on mount
  useEffect(() => {
    fetchAssetTypes();
  }, []);

  const fetchNextId = async (selectedType) => {
    if (!selectedType) return;
    setIdLoading(true);
    try {
      const res = await assetsAPI.getNextId(selectedType);
      if (res.data.success) setAssetId(res.data.data);
    } catch (_) {
      // silently fail — user can type manually
    } finally {
      setIdLoading(false);
    }
  };

  const fetchAssetTypes = async () => {
    try {
      const response = await assetsAPI.getTypes();
      if (response.data.success) {
        setExistingTypes(response.data.data || []);
        // Auto-select first type if available
        if (response.data.data?.length > 0 && !type) {
          setType(response.data.data[0]);
          fetchNextId(response.data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
      // Fallback defaults
      setExistingTypes(['AC', 'WATER_COOLER', 'DESERT_COOLER']);
      if (!type) setType('AC');
    }
  };

  const getTypeLabel = (typeKey) => {
    const labels = {
      'AC': t('airConditioners'),
      'WATER_COOLER': t('waterCoolers'),
      'DESERT_COOLER': t('desertCoolers'),
    };
    return labels[typeKey] || typeKey.replace(/_/g, ' ');
  };

  const handleAddCustomType = () => {
    const trimmed = customType.trim().toUpperCase().replace(/\s+/g, '_');
    if (!trimmed) {
      Alert.alert(t('error'), t('enterTypeName'));
      return;
    }
    if (trimmed.length < 2) {
      Alert.alert(t('error'), t('typeMinLength'));
      return;
    }
    if (existingTypes.includes(trimmed)) {
      Alert.alert(t('error'), t('alreadyExists'));
      setType(trimmed);
      setCustomType('');
      setIsAddingCustomType(false);
      setShowTypeModal(false);
      return;
    }

    // Add to local list and select it
    setExistingTypes(prev => [...prev, trimmed]);
    setType(trimmed);
    fetchNextId(trimmed);
    setCustomType('');
    setIsAddingCustomType(false);
    setShowTypeModal(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setInstallDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    console.log("Submit clicked with:", { assetId, type, location, brand, model, installDate });
    if (!assetId.trim()) {
      Alert.alert(t('error'), t('assetidalert'));
      return;
    }
    if (!type) {
      Alert.alert(t('error'), t('selectEquipmentType'));
      return;
    }
    if (!location.trim()) {
      Alert.alert(t('error'), t('locationalert'));
      return;
    }
    if (!installDate) {
      Alert.alert(t('error'), t('installdatealert'));
      return;
    }

    setLoading(true);
    console.log("Submitting Asset:", { assetId, type, location, brand, model, installDate });
    try {
      const response = await assetsAPI.create({
        asset_id: assetId.trim().toUpperCase(),
        type: type,
        location: location.trim(),
        brand: brand.trim(),
        model: model.trim(),
        install_date: installDate ? installDate.toISOString() : null,
      });
      console.log("Create Asset Response:", response.data);
      if (response.data.success) {
        Alert.alert(
          t('createalert'),
          `${assetId.toUpperCase()} ${t('hasbeenadded')}`,
          [
            {
              text: t('viewAsset'),
              onPress: () =>
                navigation.replace('AssetDetail', { asset: response.data.data }),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  // Styles remain exactly the same
  const s = StyleSheet.create({
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
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 14,
    },
    typeSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
    },
    typeSelectorIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    typeSelectorText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
    },
    selectedTypeRow: {
      marginTop: 10,
    },
    selectedTypePill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
    },
    selectedTypeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 6,
      marginTop: 4,
    },
    fieldInput: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 14,
      borderWidth: 1,
      marginBottom: 2,
    },
    datePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      marginBottom: 2,
      gap: 10,
    },
    datePickerText: {
      flex: 1,
      fontSize: 14,
    },
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
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.button,
      borderRadius: 12,
      paddingVertical: 16,
      marginTop: 10,
      shadowColor: colors.button,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: 62,
    },
    submitBtnDisabled: { backgroundColor: `${colors.assigned}80` },
    submitBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 34,
      paddingTop: 12,
      maxHeight: '75%',
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#DDD',
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 16,
    },
    typesList: {
      maxHeight: 280,
    },
    typeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 4,
      gap: 12,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    typeOptionActive: {
      backgroundColor: `${colors.active}15`,
    },
    typeOptionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeOptionLabel: {
      fontSize: 15,
      fontWeight: '500',
    },
    typeOptionKey: {
      fontSize: 11,
      marginTop: 2,
    },
    noTypes: {
      padding: 20,
      alignItems: 'center',
    },
    noTypesText: {
      fontSize: 13,
    },
    modalDivider: {
      height: 1,
      marginVertical: 12,
    },
    addTypeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      gap: 12,
    },
    addTypeIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTypeText: {
      fontSize: 15,
      fontWeight: '600',
    },
    customTypeWrap: {
      marginBottom: 8,
    },
    customTypeLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
    },
    customTypeInputRow: {
      marginBottom: 6,
    },
    customTypeInput: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      borderWidth: 1.5,
    },
    customTypePreview: {
      fontSize: 11,
      marginBottom: 10,
      marginLeft: 4,
    },
    customTypeActions: {
      flexDirection: 'row',
      gap: 8,
    },
    customTypeCancelBtn: {
      flex: 1,
      backgroundColor: colors.pageBg,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    customTypeCancelText: {
      color: colors.textSec,
      fontWeight: '600',
      fontSize: 13,
    },
    customTypeAddBtn: {
      flex: 1.5,
      backgroundColor: colors.button,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    customTypeAddBtnDisabled: {
      backgroundColor: `${colors.button}80`,
    },
    customTypeAddText: {
      color: colors.white,
      fontWeight: '700',
      fontSize: 13,
    },
    modalCloseBtn: {
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalCloseBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSec,
    },
  });

  return (
    <ScreenLayout title={t('addEquipment')} showBack scroll={true} showDecor>
      {/* Equipment Type Card */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('equipmentType')}</Text>

        <TouchableOpacity
          style={[s.typeSelector, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          onPress={() => setShowTypeModal(true)}
          activeOpacity={0.8}
        >
          <View style={[s.typeSelectorIcon, { backgroundColor: type ? `${colors.active}15` : colors.pageBg }]}>
            <Ionicons name="cube-outline" size={20} color={type ? colors.active : colors.textMut} />
          </View>
          <Text style={[s.typeSelectorText, { color: type ? colors.textPri : colors.textMut }]}>
            {type ? getTypeLabel(type) : t('selectEquipmentType')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMut} />
        </TouchableOpacity>

        {type && (
          <View style={s.selectedTypeRow}>
            <View style={[s.selectedTypePill, { backgroundColor: `${colors.active}10` }]}>
              <Text style={[s.selectedTypeText, { color: colors.active }]}>
                {t('selectedType')}: {type}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ════════════════════════════════════════ */}
      {/* Equipment Details Card                   */}
      {/* ════════════════════════════════════════ */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('equipmentDetails')}</Text>

        <Text style={[s.fieldLabel, { color: colors.textSec }]}>{t('assetId')} *</Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPri, paddingRight: idLoading ? 40 : 14 }]}
            value={assetId}
            onChangeText={setAssetId}
            placeholder={idLoading ? 'Generating ID…' : t('assetIdPlaceholder')}
            placeholderTextColor={colors.textMut}
            autoCapitalize="characters"
            editable={!idLoading}
          />
          {idLoading && (
            <ActivityIndicator
              size={16}
              color={colors.active}
              style={{ position: 'absolute', right: 12, top: 14 }}
            />
          )}
        </View>

        <Text style={[s.fieldLabel, { color: colors.textSec }]}>{t('location')} *</Text>
        <TextInput
          style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPri }]}
          value={location}
          onChangeText={setLocation}
          placeholder={t('locationPlaceholder')}
          placeholderTextColor={colors.textMut}
        />

        <Text style={[s.fieldLabel, { color: colors.textSec }]}>{t('brand')}</Text>
        <TextInput
          style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPri }]}
          value={brand}
          onChangeText={setBrand}
          placeholder={t('brandPlaceholder')}
          placeholderTextColor={colors.textMut}
        />

        <Text style={[s.fieldLabel, { color: colors.textSec }]}>{t('model')}</Text>
        <TextInput
          style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPri }]}
          value={model}
          onChangeText={setModel}
          placeholder={t('modelPlaceholder')}
          placeholderTextColor={colors.textMut}
        />

        {/* Install Date */}
        <Text style={[s.fieldLabel, { color: colors.textSec }]}>{t('installDate')} *</Text>
        <TouchableOpacity
          style={[s.datePickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={18} color={installDate ? colors.active : colors.textMut} />
          <Text style={[s.datePickerText, { color: installDate ? colors.textPri : colors.textMut }]}>
            {installDate ? formatDate(installDate) : t('selectInstallDate')}
          </Text>
          {installDate && (
            <TouchableOpacity
              onPress={() => setInstallDate(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMut} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {showDatePicker && (
          Platform.OS === 'ios' ? (
            <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
              <TouchableOpacity
                style={s.dateModalOverlay}
                activeOpacity={1}
                onPress={() => setShowDatePicker(false)}
              >
                <View style={[s.dateModalContent, { backgroundColor: colors.cardBg }]}>
                  <View style={s.dateModalHeader}>
                    <Text style={[s.dateModalTitle, { color: colors.textPri }]}>{t('selectDate')}</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={[s.dateModalDone, { color: colors.active }]}>{t('done')}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={installDate || new Date()}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(event, date) => { if (date) setInstallDate(date); }}
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
      </View>

      {/* ════════════════════════════════════════ */}
      {/* Submit Button                            */}
      {/* ════════════════════════════════════════ */}
      <TouchableOpacity
        style={[s.submitBtn, loading && s.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={20} color={colors.white} />
            <Text style={s.submitBtnText}>{t('createEquipment')}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* ════════════════════════════════════════ */}
      {/* Type Selection Modal                     */}
      {/* ════════════════════════════════════════ */}
      <Modal
        visible={showTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowTypeModal(false);
          setIsAddingCustomType(false);
          setCustomType('');
        }}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowTypeModal(false);
            setIsAddingCustomType(false);
            setCustomType('');
          }}
        >
          <View
            style={[s.modalContent, { backgroundColor: colors.cardBg }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: colors.textPri }]}>{t('selectEquipmentTypeTitle')}</Text>

            {/* Existing Types List */}
            <FlatList
              data={existingTypes}
              keyExtractor={(item) => item}
              style={s.typesList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.typeOption,
                    type === item && s.typeOptionActive,
                    { borderColor: colors.divider },
                  ]}
                  onPress={() => {
                    setType(item);
                    fetchNextId(item);
                    setShowTypeModal(false);
                    setIsAddingCustomType(false);
                    setCustomType('');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    s.typeOptionIcon,
                    { backgroundColor: type === item ? `${colors.active}15` : colors.pageBg },
                  ]}>
                    <Ionicons
                      name="cube-outline"
                      size={18}
                      color={type === item ? colors.active : colors.textMut}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      s.typeOptionLabel,
                      type === item && { fontWeight: '700', color: colors.active },
                      { color: colors.textPri },
                    ]}>
                      {getTypeLabel(item)}
                    </Text>
                    <Text style={[s.typeOptionKey, { color: colors.textMut }]}>
                      {item}
                    </Text>
                  </View>
                  {type === item && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.active} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={s.noTypes}>
                  <Text style={[s.noTypesText, { color: colors.textMut }]}>
                    {t('noTypes')}
                  </Text>
                </View>
              }
            />

            {/* Divider */}
            <View style={[s.modalDivider, { backgroundColor: colors.divider }]} />

            {/* Add Custom Type */}
            {!isAddingCustomType ? (
              <TouchableOpacity
                style={s.addTypeBtn}
                onPress={() => setIsAddingCustomType(true)}
                activeOpacity={0.8}
              >
                <View style={[s.addTypeIcon, { backgroundColor: `${colors.active}15` }]}>
                  <Ionicons name="add" size={20} color={colors.active} />
                </View>
                <Text style={[s.addTypeText, { color: colors.textPri }]}>
                  {t('addNewType')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={s.customTypeWrap}>
                <Text style={[s.customTypeLabel, { color: colors.textSec }]}>
                  {t('newTypeName')}
                </Text>
                <View style={s.customTypeInputRow}>
                  <TextInput
                    style={[s.customTypeInput, {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.active,
                      color: colors.textPri,
                    }]}
                    value={customType}
                    onChangeText={setCustomType}
                    placeholder={t('customTypePlaceholder')}
                    placeholderTextColor={colors.textMut}
                    autoCapitalize="characters"
                    autoFocus
                  />
                </View>
                {customType.trim() && (
                  <Text style={[s.customTypePreview, { color: colors.textMut }]}>
                    {t('willBeSavedAs')} {customType.trim().toUpperCase().replace(/\s+/g, '_')}
                  </Text>
                )}
                <View style={s.customTypeActions}>
                  <TouchableOpacity
                    style={s.customTypeCancelBtn}
                    onPress={() => {
                      setIsAddingCustomType(false);
                      setCustomType('');
                    }}
                  >
                    <Text style={s.customTypeCancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.customTypeAddBtn,
                      !customType.trim() && s.customTypeAddBtnDisabled,
                    ]}
                    onPress={handleAddCustomType}
                    disabled={!customType.trim()}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                    <Text style={s.customTypeAddText}> {t('addAndSelect')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={[s.modalCloseBtn, { backgroundColor: colors.pageBg }]}
              onPress={() => {
                setShowTypeModal(false);
                setIsAddingCustomType(false);
                setCustomType('');
              }}
            >
              <Text style={s.modalCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}