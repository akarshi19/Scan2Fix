import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity, Image,
  ActivityIndicator, TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { complaintsAPI, uploadAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

const ASSET_TYPES = [
  'Window AC', 'Split AC', 'Tower AC', 'AC Plant',
  'Water Cooler', 'Desert Cooler', 'Other',
];

export default function LodgeComplaint({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Pre-fill from user profile where available
  const [station, setStation]         = useState('');
  const [area, setArea]               = useState('');
  const [location, setLocation]       = useState('');
  const [contactName, setContactName] = useState(user?.full_name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [assetType, setAssetType]     = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Gallery access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
  };

  const uploadPhoto = async () => {
    if (!photo) return null;
    setUploadingPhoto(true);
    try {
      const res = await uploadAPI.complaintPhoto(photo.uri);
      return res.data?.data?.photo_url || res.data?.data?.url || null;
    } finally { setUploadingPhoto(false); }
  };

  const isFormValid = station.trim() && area.trim() && location.trim() &&
    contactName.trim() && contactPhone.trim().length >= 10 && assetType && description.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isFormValid) {
      Alert.alert('Incomplete', 'Please fill all required fields (minimum 10 characters for description).');
      return;
    }
    setLoading(true);
    try {
      let photoUrl = null;
      if (photo) photoUrl = await uploadPhoto();

      const response = await complaintsAPI.create({
        station:       station.trim(),
        area:          area.trim(),
        location:      location.trim(),
        contact_name:  contactName.trim(),
        contact_phone: contactPhone.trim(),
        asset_type:    assetType,
        description:   description.trim(),
        photo_url:     photoUrl,
      });

      if (response.data.success) {
        Alert.alert('Submitted!', 'Your complaint has been registered.',
          [{ text: 'OK', onPress: () => navigation.navigate('UserHome') }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => [
    s.input, focusedField === field && s.inputFocused, { color: colors.textPri },
  ];

  return (
    <ScreenLayout title="Lodge Complaint" showDecor showBack padBottom={40}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Location ── */}
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.sectionTitle, { color: colors.textPri }]}>📍 Location</Text>

          <Text style={[s.label, { color: colors.textSec }]}>Station / Site <Text style={s.req}>*</Text></Text>
          <TextInput
            style={inputStyle('station')}
            placeholder="e.g. Central Depot, North Gate"
            placeholderTextColor={colors.textMut}
            value={station}
            onChangeText={setStation}
            onFocus={() => setFocusedField('station')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={[s.label, { color: colors.textSec }]}>Area <Text style={s.req}>*</Text></Text>
          <TextInput
            style={inputStyle('area')}
            placeholder="e.g. Main Building, Workshop, Canteen"
            placeholderTextColor={colors.textMut}
            value={area}
            onChangeText={setArea}
            onFocus={() => setFocusedField('area')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={[s.label, { color: colors.textSec }]}>Exact Location <Text style={s.req}>*</Text></Text>
          <TextInput
            style={inputStyle('location')}
            placeholder="e.g. 2nd Floor, Room 201, Near Lift"
            placeholderTextColor={colors.textMut}
            value={location}
            onChangeText={setLocation}
            onFocus={() => setFocusedField('location')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {/* ── Your Details ── */}
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.sectionTitle, { color: colors.textPri }]}>👤 Your Details</Text>

          <Text style={[s.label, { color: colors.textSec }]}>Full Name <Text style={s.req}>*</Text></Text>
          <TextInput
            style={inputStyle('name')}
            placeholder="Your full name"
            placeholderTextColor={colors.textMut}
            value={contactName}
            onChangeText={setContactName}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={[s.label, { color: colors.textSec }]}>Contact Number <Text style={s.req}>*</Text></Text>
          <TextInput
            style={inputStyle('phone')}
            placeholder="10-digit mobile number"
            placeholderTextColor={colors.textMut}
            value={contactPhone}
            onChangeText={v => setContactPhone(v.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {/* ── Issue ── */}
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.sectionTitle, { color: colors.textPri }]}>🔧 Issue Details</Text>

          <Text style={[s.label, { color: colors.textSec }]}>Type of Asset <Text style={s.req}>*</Text></Text>
          <TouchableOpacity
            style={[s.picker, { borderColor: assetType ? colors.active : colors.divider }]}
            onPress={() => setShowTypePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={[s.pickerTxt, { color: assetType ? colors.textPri : colors.textMut }]}>
              {assetType || 'Select asset type'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMut} />
          </TouchableOpacity>

          <Text style={[s.label, { color: colors.textSec }]}>Description <Text style={s.req}>*</Text></Text>
          <TextInput
            style={[inputStyle('desc'), s.textarea]}
            placeholder="Describe the defect in detail (minimum 10 characters)"
            placeholderTextColor={colors.textMut}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={() => setFocusedField('desc')}
            onBlur={() => setFocusedField(null)}
          />
          <Text style={[s.charCount, { color: description.length >= 10 ? '#22C55E' : colors.textMut }]}>
            {description.length} characters{description.length >= 10 ? ' ✓' : ' (min 10)'}
          </Text>

          {/* Photo */}
          <Text style={[s.label, { color: colors.textSec }]}>
            Photo <Text style={[s.label, { color: colors.textMut, fontWeight: '400' }]}>(optional)</Text>
          </Text>
          {!photo ? (
            <View style={s.photoRow}>
              <TouchableOpacity style={[s.photoBtn, { borderColor: colors.divider }]} onPress={takePhoto} activeOpacity={0.8}>
                <View style={[s.photoBtnIcon, { backgroundColor: `${colors.active}12` }]}>
                  <Ionicons name="camera-outline" size={22} color={colors.active} />
                </View>
                <Text style={[s.photoBtnLbl, { color: colors.textPri }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.photoBtn, { borderColor: colors.divider }]} onPress={pickFromGallery} activeOpacity={0.8}>
                <View style={[s.photoBtnIcon, { backgroundColor: `${colors.active}12` }]}>
                  <Ionicons name="images-outline" size={22} color={colors.active} />
                </View>
                <Text style={[s.photoBtnLbl, { color: colors.textPri }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.previewWrap}>
              <Image source={{ uri: photo.uri }} style={s.preview} />
              <TouchableOpacity style={s.removeBtn} onPress={() => setPhoto(null)}>
                <Ionicons name="close-circle" size={28} color="#E53935" />
              </TouchableOpacity>
              <View style={s.previewOverlay}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={s.previewTxt}> Photo attached</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, (!isFormValid || loading || uploadingPhoto) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isFormValid || loading || uploadingPhoto}
          activeOpacity={0.85}
        >
          {(loading || uploadingPhoto) ? (
            <View style={s.row}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.submitTxt}>{uploadingPhoto ? '  Uploading photo…' : '  Submitting…'}</Text>
            </View>
          ) : (
            <View style={s.row}>
              <Ionicons name="send-outline" size={18} color="#FFF" />
              <Text style={s.submitTxt}>  Submit Complaint</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={[s.cancelTxt, { color: colors.textMut }]}>Cancel</Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>

      {/* Asset Type Picker Modal */}
      {showTypePicker && (
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: colors.cardBg }]}>
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: colors.textPri }]}>Select Asset Type</Text>
            {ASSET_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[s.typeOption, assetType === type && { backgroundColor: `${colors.active}12` }]}
                onPress={() => { setAssetType(type); setShowTypePicker(false); }}
                activeOpacity={0.7}
              >
                <Text style={[s.typeOptionTxt, { color: assetType === type ? colors.active : colors.textPri, fontWeight: assetType === type ? '700' : '500' }]}>
                  {type}
                </Text>
                {assetType === type && <Ionicons name="checkmark-circle" size={18} color={colors.active} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.modalCancel, { backgroundColor: colors.navBg }]} onPress={() => setShowTypePicker(false)}>
              <Text style={[s.modalCancelTxt, { color: colors.textSec }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 2 },
  req: { color: '#E53935' },
  input: {
    borderWidth: 1.5, borderColor: '#E0EBF0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    marginBottom: 12, backgroundColor: '#F8FAFB',
  },
  inputFocused: { borderColor: '#5BA8D4', backgroundColor: '#F0F8FF' },
  textarea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  charCount: { fontSize: 11, marginBottom: 12, marginTop: -8 },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 12, backgroundColor: '#F8FAFB',
  },
  pickerTxt: { fontSize: 14 },
  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  photoBtn: {
    flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 18, alignItems: 'center', gap: 6,
  },
  photoBtnIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  photoBtnLbl: { fontSize: 13, fontWeight: '700' },
  previewWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  preview: { width: '100%', height: 180, borderRadius: 12 },
  removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14 },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.92)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 6,
  },
  previewTxt: { fontSize: 12, fontWeight: '600', color: '#4CAF50' },
  submitBtn: {
    backgroundColor: '#004e68', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    shadowColor: '#004e68', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitBtnDisabled: { backgroundColor: '#B0CDD8', shadowOpacity: 0, elevation: 0 },
  submitTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  cancelTxt: { fontWeight: '600', fontSize: 14 },
  // Modal
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  typeOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 10, borderRadius: 10, marginBottom: 4 },
  typeOptionTxt: { fontSize: 15 },
  modalCancel: { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelTxt: { fontSize: 14, fontWeight: '600' },
});
