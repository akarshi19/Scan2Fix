import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadAPI, getFileUrl } from '../services/api';
import { ActivityIndicator } from 'react-native-paper';

// ============================================
// PhotoPicker — REWRITTEN for MongoDB
// ============================================
// BEFORE:
//   supabase.storage.from('complaint-photos').upload(filePath, arrayBuffer)
//   supabase.storage.from('complaint-photos').getPublicUrl(filePath)
//   supabase.from('profiles').update({ photo_url }).eq('id', userId)
//
// AFTER:
//   uploadAPI.profilePhoto(photo.uri)
//   Server handles storage + DB update in one call
// ============================================

export default function PhotoPicker({ currentPhoto, userId, onPhotoUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [localPhoto, setLocalPhoto] = useState(currentPhoto);

  const pickImage = async () => {
    Alert.alert('Upload Photo', 'Choose photo source', [
      { text: '📷 Camera', onPress: openCamera },
      { text: '🖼️ Gallery', onPress: openGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) uploadPhoto(result.assets[0]);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) uploadPhoto(result.assets[0]);
  };

  const uploadPhoto = async (photo) => {
    setUploading(true);
    try {
      // ── CHANGED: One API call handles upload + DB update ──
      const response = await uploadAPI.profilePhoto(photo.uri);

      if (response.data.success) {
        const newPhotoUrl = response.data.data.photo_url;
        setLocalPhoto(newPhotoUrl);
        onPhotoUploaded(newPhotoUrl);
        Alert.alert('Success', 'Photo updated successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  // Convert relative path to full URL for display
  const displayUrl = getFileUrl(localPhoto);

  return (
    <TouchableOpacity style={styles.container} onPress={pickImage} disabled={uploading}>
      <View style={styles.photoContainer}>
        {displayUrl ? (
          <Image source={{ uri: displayUrl }} style={styles.photo} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>+</Text>
          </View>
        )}
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="white" />
          </View>
        )}
      </View>
      <Text style={styles.hint}>{uploading ? 'Uploading...' : 'Tap to change photo'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  photoContainer: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', backgroundColor: '#e0e0e0' },
  photo: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#2196F3' },
  placeholderText: { fontSize: 40, color: 'white' },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  hint: { marginTop: 8, fontSize: 12, color: '#666' },
});