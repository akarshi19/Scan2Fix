import React, { useState } from 'react';
import {
  View, Image, TouchableOpacity, Text, StyleSheet,
  Alert, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadAPI, getFileUrl } from '../services/api';

const ACTIVE = '#5BA8D4';
const TEXT_PRI = '#1A1A2E';
const TEXT_MUT = '#9DB5C0';
const AVATAR_SIZE = 96;

export default function PhotoPicker({ currentPhoto, userId, onPhotoUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [localPhoto, setLocalPhoto] = useState(currentPhoto);
  const [showModal, setShowModal] = useState(false);

  const openCamera = async () => {
    setShowModal(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera access is required'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) uploadPhoto(result.assets[0]);
  };

  const openGallery = async () => {
    setShowModal(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Denied', 'Gallery access is required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) uploadPhoto(result.assets[0]);
  };

  const uploadPhoto = async (photo) => {
    setUploading(true);
    try {
      const r = await uploadAPI.profilePhoto(photo.uri);
      if (r.data.success) {
        const newUrl = r.data.data.photo_url;
        setLocalPhoto(newUrl); onPhotoUploaded(newUrl);
        Alert.alert('Success', 'Photo updated successfully!');
      }
    } catch (e) { Alert.alert('Upload Failed', e.message || 'Please try again'); }
    finally { setUploading(false); }
  };

  const displayUrl = getFileUrl(localPhoto);

  return (
    <>
      <TouchableOpacity onPress={() => !uploading && setShowModal(true)} activeOpacity={0.9} disabled={uploading}>
        <View style={s.avatarWrap}>
          {displayUrl ? (
            <Image source={{ uri: displayUrl }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#FFF" />
            </View>
          )}
          {uploading && (
            <View style={s.uploadingOverlay}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          )}
          {!uploading && (
            <View style={s.cameraBadge}>
              <Ionicons name="camera" size={13} color="#FFF" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Update Profile Photo</Text>
            <Text style={s.sheetSub}>Choose a source for your new photo</Text>

            <View style={s.optionsRow}>
              <TouchableOpacity style={s.optionBtn} onPress={openCamera} activeOpacity={0.85}>
                <View style={[s.optionIconWrap, { backgroundColor: '#E8F5FB' }]}>
                  <Ionicons name="camera-outline" size={32} color={ACTIVE} />
                </View>
                <Text style={s.optionLabel}>Camera</Text>
                <Text style={s.optionSub}>Take a new photo</Text>
              </TouchableOpacity>

              <View style={s.divider} />

              <TouchableOpacity style={s.optionBtn} onPress={openGallery} activeOpacity={0.85}>
                <View style={[s.optionIconWrap, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="images-outline" size={32} color="#9C27B0" />
                </View>
                <Text style={s.optionLabel}>Gallery</Text>
                <Text style={s.optionSub}>Choose from library</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)} activeOpacity={0.8}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 4, borderColor: '#FFF', shadowColor: ACTIVE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  avatar: { width: '100%', height: '100%', borderRadius: AVATAR_SIZE / 2 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: AVATAR_SIZE / 2, backgroundColor: ACTIVE, alignItems: 'center', justifyContent: 'center' },
  uploadingOverlay: { position: 'absolute', inset: 0, borderRadius: AVATAR_SIZE / 2, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: ACTIVE, borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 20 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDE6EC', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRI, textAlign: 'center', marginBottom: 4 },
  sheetSub: { fontSize: 13, color: TEXT_MUT, textAlign: 'center', marginBottom: 28 },
  optionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  optionBtn: { flex: 1, alignItems: 'center', gap: 8 },
  optionIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  optionLabel: { fontSize: 14, fontWeight: '700', color: TEXT_PRI },
  optionSub: { fontSize: 11, color: TEXT_MUT },
  divider: { width: 1, height: 60, backgroundColor: '#EEF4F8', marginHorizontal: 10 },
  cancelBtn: { backgroundColor: '#EEF4F8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#5A7A8A' },
});