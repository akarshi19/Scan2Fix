import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { assetsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

export default function AddAsset({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [assetId, setAssetId] = useState('');
  const [type, setType] = useState('AC');
  const [location, setLocation] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);

  const TYPES = [
  { key: 'AC',            label: t('airConditioner'), icon: 'snow-outline',  color: '#82c1f5' },
  { key: 'WATER_COOLER',  label: t('waterCooler'),    icon: 'water-outline', color: '#00BCD4' },
  { key: 'DESERT_COOLER', label: t('desertCooler'),   icon: 'leaf-outline',  color: '#FF9800' },
];

function DropdownSelect({ label, options, selected, onSelect, colors }) {
  const [visible, setVisible] = useState(false);
  const selectedOption = options.find(o => o.key === selected);

  return (
    <>
      <Text style={[s.fieldLabel, { color: colors.textSec }]}>{label}</Text>
      <TouchableOpacity
        style={[s.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        {selectedOption && (
          <View style={[s.dropdownIcon, { backgroundColor: `${selectedOption.color}15` }]}>
            <Ionicons name={selectedOption.icon} size={20} color={selectedOption.color} />
          </View>
        )}
        <Text style={[s.dropdownText, { color: colors.textPri }]}>
          {selectedOption?.label || 'Select...'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMut} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={[s.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[s.modalTitle, { color: colors.textPri }]}>{label}</Text>
            {options.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  s.modalOption,
                  selected === option.key && { backgroundColor: `${option.color}10`, borderColor: option.color },
                  { borderColor: colors.divider }
                ]}
                onPress={() => { onSelect(option.key); setVisible(false); }}
                activeOpacity={0.8}
              >
                <View style={[s.modalOptionIcon, { backgroundColor: `${option.color}15` }]}>
                  <Ionicons name={option.icon} size={22} color={option.color} />
                </View>
                <Text style={[s.modalOptionText, { color: colors.textPri }, selected === option.key && { color: option.color, fontWeight: '700' }]}>
                  {option.label}
                </Text>
                {selected === option.key && (
                  <Ionicons name="checkmark-circle" size={22} color={option.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

  const handleSubmit = async () => {
    if (!assetId.trim()) { Alert.alert(t('error'), t('assetidalert')); return; }
    if (!location.trim()) { Alert.alert(t('error'), t('locationalert')); return; }
    setLoading(true);
    try {
      const response = await assetsAPI.create({
        asset_id: assetId.trim().toUpperCase(), type,
        location: location.trim(), brand: brand.trim(), model: model.trim(),
      });
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
    } catch (error) { Alert.alert('Error', error.message || 'Failed to create asset'); }
    finally { setLoading(false); }
  };

  return (
    <ScreenLayout title={`${t('addEquipment')}`} showBack={true}>
      {/* Type Dropdown */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('equipmentType')}</Text>
        <DropdownSelect
          label=""
          options={TYPES}
          selected={type}
          onSelect={setType}
          colors={colors}
        />
      </View>

      {/* Details */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>Equipment Details</Text>

        <Text style={[s.fieldLabel, { color: colors.textSec }]}>Asset ID *</Text>
        <TextInput style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPri }]}
          value={assetId} onChangeText={setAssetId} placeholder="e.g., AC-3F-001" placeholderTextColor={colors.textMut} autoCapitalize="characters" />

        <Text style={[s.fieldLabel, { color: colors.textSec }]}>Location *</Text>
        <TextInput style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPri }]}
          value={location} onChangeText={setLocation} placeholder="e.g., 3rd Floor, Room 301" placeholderTextColor={colors.textMut} />

        <Text style={[s.fieldLabel, { color: colors.textSec }]}>Brand (Optional)</Text>
        <TextInput style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPri }]}
          value={brand} onChangeText={setBrand} placeholder="e.g., Voltas, Daikin" placeholderTextColor={colors.textMut} />

        <Text style={[s.fieldLabel, { color: colors.textSec }]}>Model (Optional)</Text>
        <TextInput style={[s.fieldInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPri }]}
          value={model} onChangeText={setModel} placeholder="e.g., 183V ADP" placeholderTextColor={colors.textMut} />
      </View>

      <TouchableOpacity style={[s.submitBtn, loading && s.submitBtnDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={s.submitBtnText}>Create Equipment</Text>
          </>
        )}
      </TouchableOpacity>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  fieldInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, borderWidth: 1, marginBottom: 12 },
  dropdown: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, marginBottom: 12 },
  dropdownIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dropdownText: { flex: 1, fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, marginBottom: 10 },
  modalOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#5BA8D4', borderRadius: 12, paddingVertical: 16, marginTop: 10, shadowColor: '#5BA8D4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  submitBtnDisabled: { backgroundColor: '#B0CDD8' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});