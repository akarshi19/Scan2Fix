import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Alert, TouchableOpacity,
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { usersAPI, getFileUrl } from '../../services/api';

// ============================================
// UserDetail — REWRITTEN for MongoDB
// ============================================

export default function UserDetail({ route, navigation }) {
  const { user: userParam } = route.params;
  const [user, setUser] = useState(userParam);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [designation, setDesignation] = useState(user.designation || '');
  const [employeeId, setEmployeeId] = useState(user.employee_id || '');

  const getRoleColor = (role) => {
    switch (role) { case 'ADMIN': return '#9C27B0'; case 'STAFF': return '#4CAF50'; case 'USER': return '#2196F3'; default: return '#666'; }
  };
  const getRoleIcon = (role) => {
    switch (role) { case 'ADMIN': return '👑'; case 'STAFF': return '🔧'; case 'USER': return '👤'; default: return '❓'; }
  };

  const toggleLeaveStatus = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.toggleLeave(user.id);
      if (response.data.success) {
        const newStatus = !user.is_on_leave;
        setUser({ ...user, is_on_leave: newStatus });
        Alert.alert('Success', response.data.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.update(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        designation: designation || null,
        employee_id: employeeId || null,
      });

      if (response.data.success) {
        setUser({
          ...user, full_name: fullName.trim(), phone: phone.trim(),
          designation, employee_id: employeeId,
        });
        setEditing(false);
        Alert.alert('Success', 'User details updated');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const photoUrl = getFileUrl(user.photo_url);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: getRoleColor(user.role) }]}>
            <Text style={styles.avatarText}>{user.full_name ? user.full_name.charAt(0) : '?'}</Text>
          </View>
        )}
        <Text style={styles.userName}>{user.full_name || 'No Name'}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
          <Text style={styles.roleText}>{getRoleIcon(user.role)} {user.role}</Text>
        </View>
        {user.is_on_leave && (
          <View style={styles.leaveBadge}><Text style={styles.leaveBadgeText}>🏠 Currently On Leave</Text></View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>User Details</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editButton}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <>
            <TextInput label="Full Name" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} />
            <TextInput label="Phone" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} />
            {user.role === 'STAFF' && (
              <>
                <TextInput label="Employee ID" value={employeeId} onChangeText={setEmployeeId} mode="outlined" style={styles.input} />
                <TextInput label="Designation" value={designation} onChangeText={setDesignation} mode="outlined" style={styles.input} placeholder="JUNIOR or SENIOR" />
              </>
            )}
            <View style={styles.editActions}>
              <Button mode="contained" onPress={handleSave} loading={loading} style={styles.saveButton}>Save</Button>
              <Button mode="text" onPress={() => setEditing(false)}>Cancel</Button>
            </View>
          </>
        ) : (
          <>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>📧 Email:</Text><Text style={styles.detailValue}>{user.email}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>📱 Phone:</Text><Text style={styles.detailValue}>{user.phone || 'Not provided'}</Text></View>
            {user.role === 'STAFF' && (
              <>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>🆔 Employee ID:</Text><Text style={styles.detailValue}>{user.employee_id || 'Not provided'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>💼 Designation:</Text><Text style={styles.detailValue}>{user.designation || 'Not set'}</Text></View>
              </>
            )}
            <View style={styles.detailRow}><Text style={styles.detailLabel}>📅 Joined:</Text><Text style={styles.detailValue}>{new Date(user.created_at).toLocaleDateString()}</Text></View>
          </>
        )}
      </View>

      {user.role === 'STAFF' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Staff Actions</Text>
          <Button
            mode={user.is_on_leave ? 'contained' : 'outlined'}
            onPress={toggleLeaveStatus} loading={loading}
            style={styles.actionButton} icon={user.is_on_leave ? 'check' : 'home'}
          >
            {user.is_on_leave ? 'Mark as Available' : 'Mark as On Leave'}
          </Button>
        </View>
      )}

      <View style={styles.footer}>
        <Button mode="text" onPress={() => navigation.goBack()} icon="arrow-left">Back to Users List</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { alignItems: 'center', padding: 30, backgroundColor: 'white' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 15 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { color: 'white', fontSize: 40, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  userEmail: { fontSize: 14, color: '#666', marginBottom: 15 },
  roleBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  roleText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  leaveBadge: { backgroundColor: '#ff9800', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  leaveBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  card: { backgroundColor: 'white', margin: 15, marginBottom: 0, padding: 20, borderRadius: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  editButton: { color: '#2196F3', fontSize: 14 },
  detailRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { width: 120, fontSize: 14, color: '#666' },
  detailValue: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  input: { marginBottom: 12, backgroundColor: 'white' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  saveButton: { marginRight: 10 },
  actionButton: { marginTop: 10 },
  footer: { padding: 20, alignItems: 'center' },
});