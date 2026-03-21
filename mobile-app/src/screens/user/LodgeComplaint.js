import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { complaintsAPI, uploadAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ProfileMenu from '../../components/ProfileMenu';

// ============================================
// LodgeComplaint — REWRITTEN for MongoDB
// ============================================
// BEFORE:
//   1. supabase.storage.from('complaint-photos').upload(...)
//   2. supabase.storage.from('complaint-photos').getPublicUrl(...)
//   3. supabase.from('complaints').insert({...})
//
// AFTER:
//   1. uploadAPI.complaintPhoto(photo.uri) → get URL
//   2. complaintsAPI.create({...}) → create complaint with URL
// ============================================

export default function LodgeComplaint({ route, navigation }) {
  const { assetId, assetType, assetLocation } = route.params || {};
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const getAssetIcon = (type) => {
    switch (type) {
      case 'AC': return '❄️';
      case 'WATER_COOLER': return '💧';
      case 'DESERT_COOLER': return '🌀';
      default: return '🔧';
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
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera access is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [4, 3], quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Gallery access is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [4, 3], quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Choose how to add a photo of the issue', [
      { text: '📷 Take Photo', onPress: takePhoto },
      { text: '🖼️ Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── CHANGED: Upload to server instead of Supabase Storage ──
  const uploadPhoto = async () => {
    if (!photo) return null;
    try {
      setUploadingPhoto(true);
      const response = await uploadAPI.complaintPhoto(photo.uri);
      if (response.data.success) {
        console.log('✅ Photo uploaded:', response.data.data.photo_url);
        return response.data.data.photo_url;
      }
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── CHANGED: Create complaint via API instead of Supabase ──
  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Error', 'Please provide more details (at least 10 characters)');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = null;
      if (photo) {
        photoUrl = await uploadPhoto();
      }

      const response = await complaintsAPI.create({
        asset_id: assetId,
        description: description.trim(),
        photo_url: photoUrl,
      });

      if (response.data.success) {
        Alert.alert(
          'Complaint Submitted! ✅',
          `Your complaint for ${assetId} has been submitted successfully.\n\nWe will resolve it as soon as possible.`,
          [{ text: 'OK', onPress: () => navigation.navigate('UserHome') }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <ProfileMenu/>
      <View style={styles.assetCard}>
        <View style={styles.assetHeader}>
          <Text style={styles.assetIcon}>{getAssetIcon(assetType)}</Text>
          <View style={styles.assetInfo}>
            <Text style={styles.assetId}>{assetId || 'Unknown'}</Text>
            <Text style={styles.assetType}>{getAssetTypeName(assetType)}</Text>
          </View>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.assetLocation}>{assetLocation || 'Unknown'}</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>What's the problem?</Text>
        <Text style={styles.formSubtitle}>Describe the issue in detail so our team can fix it quickly.</Text>

        <TextInput
          mode="outlined"
          placeholder="E.g., AC is not cooling properly, making loud noise..."
          value={description}
          onChangeText={setDescription}
          multiline numberOfLines={4}
          style={styles.textArea}
          outlineColor="#e0e0e0" activeOutlineColor="#2196F3"
        />

        <View style={styles.quickIssues}>
          {['Not cooling', 'Making noise', 'Water leaking', 'Not turning on'].map((issue) => (
            <TouchableOpacity
              key={issue}
              style={[styles.quickIssueChip, description.includes(issue) && styles.quickIssueChipActive]}
              onPress={() => {
                if (description.includes(issue)) {
                  setDescription(description.replace(issue + '. ', ''));
                } else {
                  setDescription(prev => prev ? `${prev} ${issue}.` : `${issue}.`);
                }
              }}
            >
              <Text style={[styles.quickIssueText, description.includes(issue) && styles.quickIssueTextActive]}>
                {issue}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>📷 Add Photo (Optional)</Text>
        <Text style={styles.sectionSubtitle}>A photo helps our team understand the issue better</Text>

        {!photo ? (
          <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
            <Text style={styles.addPhotoIcon}>📷</Text>
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photo.uri }} style={styles.previewImage} />
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={handleAddPhoto}>
                <Text style={styles.changePhotoText}>🔄 Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhoto(null)}>
                <Text style={styles.removePhotoText}>🗑️ Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Button
          mode="contained" onPress={handleSubmit}
          loading={loading} disabled={loading || uploadingPhoto}
          style={styles.submitBtn} contentStyle={styles.submitBtnContent}
        >
          {uploadingPhoto ? 'Uploading Photo...' : loading ? 'Submitting...' : 'Submit Complaint'}
        </Button>

        <Button mode="text" onPress={() => navigation.goBack()} style={styles.cancelBtn} textColor="#666" disabled={loading}>
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  assetCard: { backgroundColor: '#2196F3', margin: 15, padding: 20, borderRadius: 15, elevation: 5 },
  assetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  assetIcon: { fontSize: 40, marginRight: 15 },
  assetInfo: { flex: 1 },
  assetId: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  assetType: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 8 },
  locationIcon: { fontSize: 16, marginRight: 8 },
  assetLocation: { color: 'white', fontSize: 14, flex: 1 },
  form: { padding: 15 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  formSubtitle: { fontSize: 14, color: '#666', marginBottom: 15, lineHeight: 20 },
  textArea: { backgroundColor: 'white', minHeight: 100 },
  quickIssues: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginBottom: 25 },
  quickIssueChip: { backgroundColor: '#e0e0e0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  quickIssueChipActive: { backgroundColor: '#2196F3' },
  quickIssueText: { fontSize: 13, color: '#666' },
  quickIssueTextActive: { color: 'white' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  sectionSubtitle: { fontSize: 13, color: '#666', marginBottom: 15 },
  addPhotoButton: { backgroundColor: 'white', borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed', borderRadius: 15, padding: 30, alignItems: 'center', marginBottom: 20 },
  addPhotoIcon: { fontSize: 40, marginBottom: 10 },
  addPhotoText: { fontSize: 16, color: '#666' },
  photoPreview: { backgroundColor: 'white', borderRadius: 15, overflow: 'hidden', marginBottom: 20 },
  previewImage: { width: '100%', height: 200, resizeMode: 'cover' },
  photoActions: { flexDirection: 'row', justifyContent: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  changePhotoBtn: { paddingHorizontal: 20, paddingVertical: 8, marginRight: 10 },
  changePhotoText: { color: '#2196F3', fontSize: 14 },
  removePhotoBtn: { paddingHorizontal: 20, paddingVertical: 8 },
  removePhotoText: { color: '#ff6b6b', fontSize: 14 },
  submitBtn: { borderRadius: 10, marginBottom: 10 },
  submitBtnContent: { paddingVertical: 8 },
  cancelBtn: { marginBottom: 30 },
});