import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert,
  TouchableOpacity, Image, ActivityIndicator, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { complaintsAPI, uploadAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

const ACTIVE = '#5BA8D4';
const SKY = '#7DD3F0';
const CARD_BG = '#FFFFFF';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#5A7A8A';
const TEXT_MUT = '#9DB5C0';

export default function LodgeComplaint({ route, navigation }) {
  const {
    assetId,
    assetType,
    assetLocation,
    assetBrand,
    assetModel,
    assetInstallDate,
  } = route.params || {};

  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  const getAssetIcon = (type) => {
    switch (type) {
      case 'AC': return 'snow-outline';
      case 'WATER_COOLER': return 'water-outline';
      case 'DESERT_COOLER': return 'thunderstorm-outline';
      default: return 'build-outline';
    }
  };

  const getAssetTypeName = (type) => {
    switch (type) {
      case 'AC': return 'Air Conditioner';
      case 'WATER_COOLER': return 'Water Cooler';
      case 'DESERT_COOLER': return 'Desert Cooler';
      default: return 'Equipment';
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Gallery access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
  };

  const uploadPhoto = async () => {
    if (!photo) return null;
    try {
      setUploadingPhoto(true);
      const response = await uploadAPI.complaintPhoto(photo.uri);
      return response.data.data.photo_url;
    } catch (error) { throw error; }
    finally { setUploadingPhoto(false); }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }
    setLoading(true);
    try {
      let photoUrl = null;
      if (photo) photoUrl = await uploadPhoto();
      const response = await complaintsAPI.create({
        asset_id: assetId,
        description: description.trim(),
        photo_url: photoUrl,
      });
      if (response.data.success) {
        Alert.alert('Success', 'Complaint submitted successfully',
          [{ text: 'OK', onPress: () => navigation.navigate('UserHome') }]
        );
      }
    } catch (error) { Alert.alert('Error', error.message); }
    finally { setLoading(false); }
  };

  return (
    <ScreenLayout title="Lodge Complaint" showDecor showBack padBottom={100}>
      <View style={s.mainCard}>

        {/* ════════════════════════════════════════ */}
        {/* Asset Info Header                        */}
        {/* ════════════════════════════════════════ */}
        <View style={s.assetHeader}>
          <View style={s.assetInfo}>
            <Text style={s.assetId}>{assetId}</Text>
            <Text style={s.assetType}>{getAssetTypeName(assetType)}</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════ */}
        {/* Full Asset Details                       */}
        {/* ════════════════════════════════════════ */}
        <View style={s.detailsGrid}>
          <DetailRow icon="location-outline" label="Location:" value={assetLocation} iconColor={TEXT_MUT} />
          {assetBrand ? (
            <DetailRow icon="pricetag-outline" label="Brand:" value={assetBrand} />
          ) : null}
          {assetModel ? (
            <DetailRow icon="hardware-chip-outline" label="Model:" value={assetModel} />
          ) : null}
          {assetInstallDate ? (
            <DetailRow
              icon="construct-outline"
              label="Installed On:"
              value={new Date(assetInstallDate).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
              last
            />
          ) : null}
        </View>

        <View style={s.divider} />

        {/* ════════════════════════════════════════ */}
        {/* Description                              */}
        {/* ════════════════════════════════════════ */}
        <Text style={s.sectionLabel}>Describe the Issue</Text>
        <View style={[s.inputWrap, descFocused && s.inputWrapFocused]}>
          <TextInput
            style={s.input}
            placeholder="What's the problem? Be as detailed as possible..."
            placeholderTextColor={TEXT_MUT}
            multiline
            value={description}
            onChangeText={setDescription}
            onFocus={() => setDescFocused(true)}
            onBlur={() => setDescFocused(false)}
          />
          <View style={s.charCount}>
            <Text style={[s.charCountText, description.length > 0 && { color: ACTIVE }]}>
              {description.length} characters
            </Text>
          </View>
        </View>

        {/* ════════════════════════════════════════ */}
        {/* Photo Section                            */}
        {/* ════════════════════════════════════════ */}
        <Text style={s.sectionLabel}>Attach Photo (Optional)</Text>
        {!photo ? (
          <View style={s.photoPickerRow}>
            <TouchableOpacity style={s.photoOption} onPress={takePhoto} activeOpacity={0.8}>
              <View style={s.photoOptionIcon}>
                <Ionicons name="camera-outline" size={24} color={ACTIVE} />
              </View>
              <Text style={s.photoOptionLabel}>Camera</Text>
              <Text style={s.photoOptionHint}>Take a photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoOption} onPress={pickFromGallery} activeOpacity={0.8}>
              <View style={s.photoOptionIcon}>
                <Ionicons name="images-outline" size={24} color={ACTIVE} />
              </View>
              <Text style={s.photoOptionLabel}>Gallery</Text>
              <Text style={s.photoOptionHint}>Choose existing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.previewWrap}>
            <Image source={{ uri: photo.uri }} style={s.preview} />
            <TouchableOpacity style={s.removePhotoBtn} onPress={() => setPhoto(null)} activeOpacity={0.8}>
              <Ionicons name="close-circle" size={28} color="#E53935" />
            </TouchableOpacity>
            <View style={s.previewOverlay}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={s.previewText}> Photo attached</Text>
            </View>
          </View>
        )}

        <View style={s.divider} />

        {/* ════════════════════════════════════════ */}
        {/* Submit                                   */}
        {/* ════════════════════════════════════════ */}
        <TouchableOpacity
          style={[s.submitBtn, (loading || uploadingPhoto || !description.trim()) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || uploadingPhoto || !description.trim()}
          activeOpacity={0.85}
        >
          {(loading || uploadingPhoto) ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.submitText}>
                {uploadingPhoto ? '  Uploading photo...' : '  Submitting...'}
              </Text>
            </View>
          ) : (
            <View style={s.loadingRow}>
              <Ionicons name="send-outline" size={18} color="#FFF" />
              <Text style={s.submitText}>  Submit Complaint</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

// ════════════════════════════════════════
// Detail Row Component
// ════════════════════════════════════════
function DetailRow({ icon, label, value, iconColor, last }) {
  if (!value) return null;
  return (
    <View style={[s.detailRow, !last && s.detailRowBorder]}>
      <Ionicons
        name={icon}
        size={15}
        color={iconColor || TEXT_MUT}
        style={{ marginRight: 8, width: 22, textAlign: 'center' }}
      />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  mainCard: {
    backgroundColor: CARD_BG, borderRadius: 18, padding: 20,
    marginTop: 0, shadowColor: '#A0BDD0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },

  // Asset Header
  assetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  assetIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: `${ACTIVE}15`, alignItems: 'center',
    justifyContent: 'center', marginRight: 14,
  },
  assetInfo: { flex: 1 },
  assetId: { fontSize: 18, fontWeight: '800', color: TEXT_PRI },
  assetType: { fontSize: 13, color: TEXT_SEC, marginTop: 2 },

  // Asset Details Grid
  detailsGrid: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF4F8',
    overflow: 'hidden',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F8',
  },
  detailLabel: {
    width: 100,
    fontSize: 12,
    color: TEXT_MUT,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: TEXT_PRI,
    fontWeight: '500',
    textAlign: 'left',
  },

  // Divider
  divider: { height: 1, backgroundColor: '#EEF4F8', marginVertical: 6 },

  // Section label
  sectionLabel: { fontSize: 14, fontWeight: '700', color: TEXT_PRI, marginBottom: 10 },

  // Description input
  inputWrap: {
    backgroundColor: '#F8FAFB', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#EEF4F8', marginBottom: 20, overflow: 'hidden',
  },
  inputWrapFocused: { borderColor: SKY, backgroundColor: '#F0F8FF' },
  input: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    minHeight: 120, fontSize: 14, color: TEXT_PRI,
    textAlignVertical: 'top', lineHeight: 21,
  },
  charCount: { alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 10 },
  charCountText: { fontSize: 11, color: TEXT_MUT },

  // Photo picker
  photoPickerRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  photoOption: {
    flex: 1, backgroundColor: '#F8FAFB', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#EEF4F8', borderStyle: 'dashed',
    paddingVertical: 20, alignItems: 'center', gap: 6,
  },
  photoOptionIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: `${ACTIVE}12`, alignItems: 'center',
    justifyContent: 'center', marginBottom: 4,
  },
  photoOptionLabel: { fontSize: 14, fontWeight: '700', color: TEXT_PRI },
  photoOptionHint: { fontSize: 11, color: TEXT_MUT },

  // Photo preview
  previewWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  preview: { width: '100%', height: 200, borderRadius: 14 },
  removePhotoBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: 2,
  },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.92)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 8,
  },
  previewText: { fontSize: 12, fontWeight: '600', color: '#4CAF50' },

  // Buttons
  submitBtn: {
    backgroundColor: '#004e68', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACTIVE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitBtnDisabled: { backgroundColor: '#B0CDD8', shadowOpacity: 0, elevation: 0 },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cancelBtn: {
    backgroundColor: '#F2F6F8', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 10,
  },
  cancelText: { color: TEXT_SEC, fontWeight: '600', fontSize: 14 },
});