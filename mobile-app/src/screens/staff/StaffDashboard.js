import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { complaintsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ============================================
// StaffDashboard — REWRITTEN for MongoDB
// ============================================

export default function StaffDashboard({ navigation }) {
  const { user, signOut } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ASSIGNED');
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const tabs = [
    { key: 'ASSIGNED', label: 'Not Started', icon: '📋', color: '#2196F3' },
    { key: 'IN_PROGRESS', label: 'In Progress', icon: '🔧', color: '#9C27B0' },
    { key: 'CLOSED', label: 'Completed', icon: '✅', color: '#4CAF50' },
  ];

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
      fetchLeaveStatus();
    }, [activeTab])
  );

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await complaintsAPI.getStaffJobs(activeTab);
      if (response.data.success) {
        setJobs(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveStatus = async () => {
    try {
      const response = await usersAPI.getLeaveStatus();
      if (response.data.success) {
        setIsOnLeave(response.data.data?.is_on_leave || false);
      }
    } catch (error) {
      console.error('Error fetching leave status:', error);
    }
  };

  const toggleLeaveStatus = async () => {
    setLeaveLoading(true);
    const actionText = !isOnLeave ? 'Mark as On Leave' : 'Mark as Available';
    const message = !isOnLeave
      ? 'You will not receive new task assignments while on leave. Continue?'
      : 'You will start receiving new task assignments. Continue?';

    Alert.alert(
      !isOnLeave ? '🏠 Mark as On Leave' : '✅ Mark as Available',
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setLeaveLoading(false) },
        {
          text: `Yes, ${actionText}`,
          onPress: async () => {
            try {
              const response = await usersAPI.toggleSelfLeave();
              if (response.data.success) {
                setIsOnLeave(!isOnLeave);
                Alert.alert('Success', response.data.message);
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLeaveLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderJob = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JobDetails', { job: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.assetId}>{item.asset_id}</Text>
        <Text style={styles.assetType}>{item.assets?.type}</Text>
      </View>
      <Text style={styles.location}>📍 {item.assets?.location}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      {item.photo_url && <Text style={styles.photoIndicator}>📷 Has attached photo</Text>}
      <View style={styles.cardFooter}>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
        <Text style={styles.tapHint}>Tap to view →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>My Jobs 🔧</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={[styles.leaveButton, isOnLeave ? styles.leaveButtonActive : styles.leaveButtonInactive]}
          onPress={toggleLeaveStatus} disabled={leaveLoading}
        >
          <Text style={styles.leaveButtonText}>{isOnLeave ? '🏠 On Leave' : '✅ Available'}</Text>
        </TouchableOpacity>
      </View>

      {isOnLeave && (
        <View style={styles.leaveBanner}>
          <Text style={styles.leaveBannerText}>⚠️ You are currently marked as On Leave. New tasks won't be assigned to you.</Text>
        </View>
      )}

      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: tab.color, borderBottomWidth: 3 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && { color: tab.color, fontWeight: 'bold' }]}>{tab.label}</Text>
            <View style={[styles.tabBadge, { backgroundColor: tab.color }]}>
              <Text style={styles.tabBadgeText}>{jobs.length}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id?.toString() || item._id?.toString()}
        renderItem={renderJob}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchJobs} />}
        contentContainerStyle={jobs.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{activeTab === 'ASSIGNED' ? '📋' : activeTab === 'IN_PROGRESS' ? '🔧' : '🎉'}</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'ASSIGNED' && 'No new tasks'}
              {activeTab === 'IN_PROGRESS' && 'No tasks in progress'}
              {activeTab === 'CLOSED' && 'No completed tasks yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'ASSIGNED' && 'New assigned tasks will appear here'}
              {activeTab === 'IN_PROGRESS' && "Tasks you're working on will appear here"}
              {activeTab === 'CLOSED' && 'Completed tasks will appear here'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#4CAF50' },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  leaveButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  leaveButtonActive: { backgroundColor: '#ff9800' },
  leaveButtonInactive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  leaveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  leaveBanner: { backgroundColor: '#fff3e0', padding: 12, borderBottomWidth: 1, borderBottomColor: '#ffe0b2' },
  leaveBannerText: { color: '#e65100', fontSize: 13, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabIcon: { fontSize: 20, marginBottom: 4 },
  tabLabel: { fontSize: 11, color: '#666' },
  tabBadge: { position: 'absolute', top: 5, right: 15, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 18, alignItems: 'center' },
  tabBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  card: { backgroundColor: 'white', margin: 10, padding: 15, borderRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  assetId: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  assetType: { color: '#2196F3', fontSize: 12, fontWeight: '600' },
  location: { color: '#666', fontSize: 13, marginBottom: 5 },
  description: { color: '#333', lineHeight: 20, marginBottom: 8 },
  photoIndicator: { color: '#666', fontSize: 12, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  date: { color: '#999', fontSize: 12 },
  tapHint: { color: '#2196F3', fontSize: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 300 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  emptySubtitle: { fontSize: 13, color: '#666', textAlign: 'center' },
});