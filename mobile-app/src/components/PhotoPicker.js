import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';
import { ActivityIndicator } from 'react-native-paper';

/**
 * PhotoPicker - Upload profile photo
 * 
 * @param {string} currentPhoto - Current photo URL
 * @param {string} userId - User ID for storage path
 * @param {function} onPhotoUploaded - Callback with new photo URL
 */

export default function PhotoPicker({ currentPhoto, userId, onPhotoUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [localPhoto, setLocalPhoto] = useState(currentPhoto);

  const pickImage = async () => {
    Alert.alert(
      'Upload Photo',
      'Choose photo source',
      [
        { text: '📷 Camera', onPress: () => openCamera() },
        { text: '🖼️ Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadPhoto(result.assets[0]);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async (photo) => {
    setUploading(true);
    try {
      // Create unique filename
      const fileExt = photo.uri.split('.').pop();
      const fileName = `profile_${userId}_${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      // Convert to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('complaint-photos')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('complaint-photos')
        .getPublicUrl(filePath);

      const newPhotoUrl = urlData.publicUrl;

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: newPhotoUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setLocalPhoto(newPhotoUrl);
      onPhotoUploaded(newPhotoUrl);
      Alert.alert('Success', 'Photo updated successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={pickImage} disabled={uploading}>
      <View style={styles.photoContainer}>
        {localPhoto ? (
          <Image source={{ uri: localPhoto }} style={styles.photo} />
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
  container: {
    alignItems: 'center',
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2196F3',
  },
  placeholderText: {
    fontSize: 40,
    color: 'white',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
});