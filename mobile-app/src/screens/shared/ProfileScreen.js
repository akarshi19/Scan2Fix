import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TouchableOpacity 
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import PhotoPicker from '../../components/PhotoPicker';

export default function ProfileScreen() {
  const { user, role, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setPhotoUrl(data.photo_url || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
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
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName.trim(),
          phone: phone.trim() 
        })
        .eq('id', user.id);

      if (error) throw error;
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return '#9C27B0';
      case 'STAFF': return '#4CAF50';
      case 'USER': return '#2196F3';
      default: return '#666';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN': return '👑';
      case 'STAFF': return '🔧';
      case 'USER': return '👤';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header with Photo */}
      <View style={styles.header}>
        <PhotoPicker 
          currentPhoto={photoUrl}
          userId={user.id}
          onPhotoUploaded={(newUrl) => setPhotoUrl(newUrl)}
        />
        
        <Text style={styles.userName}>{fullName || 'User'}</Text>
        
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) }]}>
          <Text style={styles.roleText}>{getRoleIcon(role)} {role}</Text>
        </View>
      </View>

      {/* Profile Form */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        
        <TextInput
          label="Full Name *"
          value={fullName}
          onChangeText={setFullName}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Email"
          value={user?.email || ''}
          mode="outlined"
          disabled
          style={styles.input}
          left={<TextInput.Icon icon="email" />}
        />

        <TextInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
          placeholder="Enter phone number"
          left={<TextInput.Icon icon="phone" />}
        />

        <TextInput
          label="Role"
          value={role || 'USER'}
          mode="outlined"
          disabled
          style={styles.input}
          left={<TextInput.Icon icon="shield-account" />}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          Save Changes
        </Button>
      </View>

      {/* Account Actions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => setShowLogoutDialog(true)}
        >
          <Text style={styles.menuIcon}>🚪</Text>
          <Text style={styles.menuText}>Logout</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>🔧 Scan2Fix</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
      </View>

      {/* Logout Confirmation */}
      <ConfirmDialog
        visible={showLogoutDialog}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          setShowLogoutDialog(false);
          signOut();
        }}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  roleBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  
  // Card
  card: {
    backgroundColor: 'white',
    margin: 15,
    marginBottom: 0,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    marginBottom: 15,
  },
  saveButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  
  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  menuArrow: {
    color: '#999',
    fontSize: 18,
  },
  
  // App Info
  appInfo: {
    alignItems: 'center',
    padding: 30,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appVersion: {
    color: '#999',
    marginTop: 5,
  },
});