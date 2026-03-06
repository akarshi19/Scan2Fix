import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { usersAPI } from '../../services/api';

// ============================================
// AddUser — REWRITTEN for MongoDB
// ============================================
// BEFORE:
//   1. supabase.auth.signUp({ email, password })
//   2. supabase.from('profiles').insert({...})
//
// AFTER:
//   usersAPI.create({...}) — one call does everything
// ============================================

export default function AddUser({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('USER');
  const [designation, setDesignation] = useState('JUNIOR');
  const [employeeId, setEmployeeId] = useState('');

  const validateForm = () => {
    if (!fullName.trim()) { Alert.alert('Error', 'Please enter full name'); return false; }
    if (!email.trim()) { Alert.alert('Error', 'Please enter email'); return false; }
    if (!password || password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return false; }
    if (!phone.trim()) { Alert.alert('Error', 'Please enter phone number'); return false; }
    if (role === 'STAFF' && !employeeId.trim()) { Alert.alert('Error', 'Please enter employee ID for staff'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await usersAPI.create({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        phone: phone.trim(),
        designation: role === 'STAFF' ? designation : null,
        employee_id: role === 'STAFF' ? employeeId.trim() : null,
      });

      if (response.data.success) {
        Alert.alert(
          'User Created! ✅',
          response.data.message,
          [{
            text: 'OK', onPress: () => {
              setFullName(''); setEmail(''); setPassword('');
              setPhone(''); setEmployeeId('');
              navigation.goBack();
            }
          }]
        );
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 User Role *</Text>
        <View style={styles.roleContainer}>
          {[
            { key: 'USER', icon: '👤', label: 'User' },
            { key: 'STAFF', icon: '🔧', label: 'Staff' },
            { key: 'ADMIN', icon: '👑', label: 'Admin' },
          ].map(r => (
            <TouchableOpacity key={r.key}
              style={[styles.roleOption, role === r.key && styles.roleOptionActive]}
              onPress={() => setRole(r.key)}
            >
              <Text style={styles.roleIcon}>{r.icon}</Text>
              <Text style={[styles.roleLabel, role === r.key && styles.roleLabelActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Basic Information</Text>
        <TextInput label="Full Name *" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="account" />} />
        <TextInput label="Email *" value={email} onChangeText={setEmail} mode="outlined" keyboardType="email-address" autoCapitalize="none" style={styles.input} left={<TextInput.Icon icon="email" />} />
        <TextInput label="Password *" value={password} onChangeText={setPassword} mode="outlined" secureTextEntry style={styles.input} left={<TextInput.Icon icon="lock" />} />
        <TextInput label="Phone Number *" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} left={<TextInput.Icon icon="phone" />} />
      </View>

      {role === 'STAFF' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Staff Details</Text>
          <TextInput label="Employee ID *" value={employeeId} onChangeText={setEmployeeId} mode="outlined" style={styles.input} left={<TextInput.Icon icon="badge-account" />} placeholder="e.g., EMP001" />
          <Text style={styles.label}>Designation:</Text>
          <View style={styles.radioRow}>
            {['JUNIOR', 'SENIOR'].map(d => (
              <TouchableOpacity key={d}
                style={[styles.radioOption, designation === d && styles.radioOptionActive]}
                onPress={() => setDesignation(d)}
              >
                <Text style={[styles.radioLabel, designation === d && styles.radioLabelActive]}>{d} Staff</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.submitSection}>
        <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.submitButton} contentStyle={styles.submitButtonContent}>
          Create {role === 'STAFF' ? 'Staff Member' : role === 'ADMIN' ? 'Admin' : 'User'}
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()} disabled={loading} style={styles.cancelButton}>Cancel</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  section: { backgroundColor: 'white', margin: 10, marginBottom: 0, padding: 15, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  input: { marginBottom: 12 },
  label: { fontSize: 14, color: '#666', marginBottom: 8 },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  roleOption: { flex: 1, alignItems: 'center', padding: 15, borderRadius: 10, backgroundColor: '#f5f5f5', marginHorizontal: 5, borderWidth: 2, borderColor: 'transparent' },
  roleOptionActive: { backgroundColor: '#e3f2fd', borderColor: '#2196F3' },
  roleIcon: { fontSize: 28, marginBottom: 5 },
  roleLabel: { fontSize: 12, color: '#666' },
  roleLabelActive: { color: '#2196F3', fontWeight: 'bold' },
  radioRow: { flexDirection: 'row', marginBottom: 15 },
  radioOption: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  radioOptionActive: { backgroundColor: '#e3f2fd', borderColor: '#2196F3' },
  radioLabel: { fontSize: 13, color: '#666' },
  radioLabelActive: { color: '#2196F3', fontWeight: 'bold' },
  submitSection: { padding: 15, paddingBottom: 30 },
  submitButton: { borderRadius: 10 },
  submitButtonContent: { paddingVertical: 8 },
  cancelButton: { marginTop: 10 },
});