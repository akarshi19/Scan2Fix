import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

/**
 * UserDashboard - Main screen for USER role
 * 
 * Features:
 * - Welcome message
 * - Big "Scan QR" button to report issues
 * - Quick stats (optional)
 */

export default function UserDashboard({ navigation }) {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello! 👋</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Main Action - Scan QR */}
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => navigation.navigate('ScanQR')}
      >
        <Text style={styles.scanIcon}>📷</Text>
        <Text style={styles.scanTitle}>Scan QR Code</Text>
        <Text style={styles.scanSubtitle}>Report an issue with AC/Cooler</Text>
      </TouchableOpacity>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works:</Text>
        <Text style={styles.infoStep}>1. 📷 Scan QR code on the machine</Text>
        <Text style={styles.infoStep}>2. 📝 Describe the problem</Text>
        <Text style={styles.infoStep}>3. 📸 Take a photo (optional)</Text>
        <Text style={styles.infoStep}>4. ✅ Submit and track status</Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  scanIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  scanTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  scanSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoStep: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  logoutBtn: {
    padding: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ff6b6b',
    fontSize: 16,
  },
});