import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image, Alert,
} from 'react-native';
import { FAB, Searchbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { usersAPI, getFileUrl } from '../../services/api';

// ============================================
// ManageUsers — REWRITTEN for MongoDB
// ============================================

export default function ManageUsers() {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  useFocusEffect(useCallback(() => { fetchUsers(); }, []));

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll();
      if (response.data.success) {
        setUsers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUsers = () => {
    let filtered = [...users];
    if (filterRole !== 'ALL') {
      filtered = filtered.filter(u => u.role === filterRole);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.employee_id?.toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  const toggleAvailability = async (userId, currentStatus, userName) => {
    const newStatus = !currentStatus;
    const statusText = newStatus ? 'On Leave' : 'Available';

    Alert.alert(
      newStatus ? '🏠 Mark On Leave' : '✅ Mark Available',
      `Are you sure you want to mark ${userName} as ${statusText}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await usersAPI.toggleLeave(userId);
              if (response.data.success) {
                setUsers(prevUsers =>
                  prevUsers.map(user =>
                    user.id === userId ? { ...user, is_on_leave: newStatus } : user
                  )
                );
                Alert.alert('Success', `${userName} is now ${statusText}`);
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role) => {
    switch (role) { case 'ADMIN': return '#9C27B0'; case 'STAFF': return '#4CAF50'; case 'USER': return '#2196F3'; default: return '#666'; }
  };
  const getRoleIcon = (role) => {
    switch (role) { case 'ADMIN': return '👑'; case 'STAFF': return '🔧'; case 'USER': return '👤'; default: return '❓'; }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, item.is_on_leave && styles.cardOnLeave]}
      onPress={() => navigation.navigate('UserDetail', { user: item })}
    >
      <View style={styles.cardContent}>
        {item.photo_url ? (
          <Image source={{ uri: getFileUrl(item.photo_url) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.avatarText}>{item.full_name ? item.full_name.charAt(0) : '?'}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.full_name || 'No Name'}</Text>
            {item.is_on_leave && (
              <View style={styles.leaveBadge}><Text style={styles.leaveBadgeText}>On Leave</Text></View>
            )}
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.employee_id && <Text style={styles.employeeId}>ID: {item.employee_id}</Text>}
          {item.designation && <Text style={styles.designation}>{item.designation} Staff</Text>}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleText}>{getRoleIcon(item.role)}</Text>
        </View>
      </View>

      {item.role === 'STAFF' && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, item.is_on_leave ? styles.actionButtonAvailable : styles.actionButtonLeave]}
            onPress={() => toggleAvailability(item.id, item.is_on_leave, item.full_name || item.email)}
          >
            <Text style={[styles.actionButtonText, item.is_on_leave ? styles.actionButtonTextAvailable : styles.actionButtonTextLeave]}>
              {item.is_on_leave ? '✅ Mark Available' : '🏠 Mark On Leave'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const filterButtons = [
    { key: 'ALL', label: 'All' },
    { key: 'ADMIN', label: '👑 Admin' },
    { key: 'STAFF', label: '🔧 Staff' },
    { key: 'USER', label: '👤 Users' },
  ];

  const onLeaveCount = users.filter(u => u.role === 'STAFF' && u.is_on_leave).length;
  const availableCount = users.filter(u => u.role === 'STAFF' && !u.is_on_leave).length;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar placeholder="Search by name, email, or ID..." value={searchQuery} onChangeText={setSearchQuery} style={styles.searchBar} />
      </View>

      <View style={styles.filterContainer}>
        {filterButtons.map((filter) => (
          <TouchableOpacity key={filter.key}
            style={[styles.filterButton, filterRole === filter.key && styles.filterButtonActive]}
            onPress={() => setFilterRole(filter.key)}
          >
            <Text style={[styles.filterButtonText, filterRole === filter.key && styles.filterButtonTextActive]}>{filter.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{getFilteredUsers().length} users</Text>
        <View style={styles.statsRight}>
          <Text style={styles.statsAvailable}>✅ {availableCount} available</Text>
          <Text style={styles.statsLeave}>🏠 {onLeaveCount} on leave</Text>
        </View>
      </View>

      <FlatList
        data={getFilteredUsers()}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchUsers} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyIcon}>👥</Text><Text style={styles.emptyText}>No users found</Text></View>
        }
      />

      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('AddUser')} label="Add User" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchContainer: { padding: 10, backgroundColor: 'white' },
  searchBar: { elevation: 0, backgroundColor: '#f5f5f5' },
  filterContainer: { flexDirection: 'row', padding: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterButton: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderRadius: 15, backgroundColor: '#f0f0f0' },
  filterButtonActive: { backgroundColor: '#2196F3' },
  filterButtonText: { fontSize: 12, color: '#666' },
  filterButtonTextActive: { color: 'white', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  statsText: { fontSize: 12, color: '#666' },
  statsRight: { flexDirection: 'row' },
  statsAvailable: { fontSize: 11, color: '#4CAF50', marginRight: 10 },
  statsLeave: { fontSize: 11, color: '#ff9800' },
  card: { backgroundColor: 'white', marginHorizontal: 10, marginBottom: 10, borderRadius: 12, elevation: 2, overflow: 'hidden' },
  cardOnLeave: { opacity: 0.8, borderLeftWidth: 4, borderLeftColor: '#ff9800' },
  cardContent: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 20 },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  leaveBadge: { backgroundColor: '#ff9800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  leaveBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  userEmail: { fontSize: 12, color: '#666', marginTop: 2 },
  employeeId: { fontSize: 11, color: '#999', marginTop: 2 },
  designation: { fontSize: 11, color: '#4CAF50', marginTop: 2 },
  roleBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  roleText: { fontSize: 16 },
  quickActions: { padding: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actionButton: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionButtonLeave: { backgroundColor: '#fff3e0' },
  actionButtonAvailable: { backgroundColor: '#e8f5e9' },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
  actionButtonTextLeave: { color: '#e65100' },
  actionButtonTextAvailable: { color: '#2e7d32' },
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyText: { color: '#666' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#9C27B0' },
});