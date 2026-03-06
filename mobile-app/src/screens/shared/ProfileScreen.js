import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { authAPI, getFileUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import PhotoPicker from '../../components/PhotoPicker';

// ============================================
// ProfileScreen — REWRITTEN for MongoDB
// ============================================
// BEFORE:
//   supabase.from('profiles').select('*').eq('id', user.id).single()
//   supabase.from('profiles').update({ full_name, phone }).eq('id', user.id)
//
// AFTER:
//   authAPI.getMe() — fetches current user profile
//   authAPI.updateProfile({ full_name, phone }) — updates profile
// ============================================

export default function ProfileScreen() {
  const { user, role, signOut, refreshUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // User data is already in AuthContext, but fetch fresh from server
      const response = await authAPI.getMe();
      if (response.data.success) {
        const profile = response.data.data.user;
        setFullName(profile.full_name || '');
        setPhone(profile.phone || '');
        setPhotoUrl(profile.photo_url || '');
      }
    } catch (error) {
      // Fall back to cached user data
      setFullName(user?.full_name || '');
      setPhone(user?.phone || '');
      setPhotoUrl(user?.photo_url || '');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setSaving(true);
    try {
      const response = await authAPI.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });

      if (response.data.success) {
        await refreshUser(); // Update AuthContext with new data
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (r) => {
    switch (r) { case 'ADMIN': return '#9C27B0'; case 'STAFF': return '#4CAF50'; case 'USER': return '#2196F3'; default: return '#666'; }
  };
  const getRoleIcon = (r) => {
    switch (r) { case 'ADMIN': return '👑'; case 'STAFF': return '🔧'; case 'USER': return '👤'; default: return '❓'; }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><Text>Loading profile...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <PhotoPicker
          currentPhoto={photoUrl}
          userId={user?.id}
          onPhotoUploaded={(newUrl) => {
            setPhotoUrl(newUrl);
            refreshUser();
          }}
        />
        <Text style={styles.userName}>{fullName || 'User'}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) }]}>
          <Text style={styles.roleText}>{getRoleIcon(role)} {role}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <TextInput label="Full Name *" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="account" />} />
        <TextInput label="Email" value={user?.email || ''} mode="outlined" disabled style={styles.input} left={<TextInput.Icon icon="email" />} />
        <TextInput label="Phone Number" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} placeholder="Enter phone number" left={<TextInput.Icon icon="phone" />} />
        <TextInput label="Role" value={role || 'USER'} mode="outlined" disabled style={styles.input} left={<TextInput.Icon icon="shield-account" />} />
        <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.saveButton}>Save Changes</Button>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowLogoutDialog(true)}>
          <Text style={styles.menuIcon}>🚪</Text>
          <Text style={styles.menuText}>Logout</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.appInfo}>
        <Text style={styles.appName}>🔧 Scan2Fix</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
      </View>

      <ConfirmDialog
        visible={showLogoutDialog} title="Logout" message="Are you sure you want to logout?"
        confirmText="Logout" cancelText="Cancel" type="danger"
        onConfirm={() => { setShowLogoutDialog(false); signOut(); }}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: 'white' },
  userName: { fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 10, color: '#333' },
  roleBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  roleText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: 'white', margin: 15, marginBottom: 0, padding: 20, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  input: { marginBottom: 15 },
  saveButton: { marginTop: 10, borderRadius: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  menuIcon: { fontSize: 20, marginRight: 15 },
  menuText: { flex: 1, fontSize: 16, color: '#333' },
  menuArrow: { color: '#999', fontSize: 18 },
  appInfo: { alignItems: 'center', padding: 30 },
  appName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  appVersion: { color: '#999', marginTop: 5 },
});