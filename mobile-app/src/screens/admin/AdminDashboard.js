import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { complaintsAPI, reportsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const screenWidth = Dimensions.get('window').width;

// ============================================
// AdminDashboard — REWRITTEN for MongoDB
// ============================================
// BEFORE:
//   supabase.from('complaints').select('status, created_at, asset_id, assets(location)')
//   Then computed stats client-side
//
// AFTER:
//   reportsAPI.overview() — server computes stats
//   complaintsAPI.getAll() — for recent list
// ============================================

export default function AdminDashboard({ navigation }) {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({
    total: 0, open: 0, assigned: 0, inProgress: 0, closed: 0,
  });
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', () => { fetchData(); });
    return unsubscribe;
  }, [navigation]);

  const fetchData = async () => {
    try {
      // Fetch overview stats from server
      const overviewResponse = await reportsAPI.overview();
      if (overviewResponse.data.success) {
        const s = overviewResponse.data.data.complaints;
        setStats({
          total: s.total, open: s.open, assigned: s.assigned,
          inProgress: s.inProgress, closed: s.closed,
        });
      }

      // Fetch recent complaints
      const complaintsResponse = await complaintsAPI.getAll();
      if (complaintsResponse.data.success) {
        setRecentComplaints(complaintsResponse.data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#ff9800';
      case 'ASSIGNED': return '#2196F3';
      case 'IN_PROGRESS': return '#9C27B0';
      case 'CLOSED': return '#4CAF50';
      default: return '#666';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, Admin! 👑</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>📊 Overview</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statTotal]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ff9800' }]}>
          <Text style={styles.statNumber}>{stats.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
          <Text style={styles.statNumber}>{stats.assigned}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#9C27B0' }]}>
          <Text style={styles.statNumber}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.statNumber}>{stats.closed}</Text>
          <Text style={styles.statLabel}>Closed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Complaints')}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>View All Complaints</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#fff3e0' }]} onPress={() => navigation.navigate('Complaints')}>
          <Text style={styles.actionIcon}>🔔</Text>
          <Text style={styles.actionText}>{stats.open} Need Assignment</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>🕐 Recent Complaints</Text>
      <View style={styles.recentList}>
        {recentComplaints.map((item, index) => (
          <View key={item._id || index} style={styles.recentItem}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <View style={styles.recentInfo}>
              <Text style={styles.recentAsset}>{item.asset_id}</Text>
              <Text style={styles.recentLocation}>{item.assets?.location}</Text>
            </View>
            <Text style={styles.recentTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        ))}
        {recentComplaints.length === 0 && (
          <Text style={styles.noDataText}>No complaints yet</Text>
        )}
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#9C27B0' },
  greeting: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  subtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 3, fontSize: 13 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: 'white', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginHorizontal: 15, marginTop: 20, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  statCard: { width: (screenWidth - 45) / 3, margin: 5, padding: 15, borderRadius: 12, alignItems: 'center' },
  statTotal: { backgroundColor: '#333', width: (screenWidth - 35) / 2 - 5 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  statLabel: { color: 'rgba(255,255,255,0.9)', marginTop: 5, fontSize: 12 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 10 },
  actionCard: { flex: 1, margin: 5, padding: 20, backgroundColor: '#e3f2fd', borderRadius: 12, alignItems: 'center' },
  actionIcon: { fontSize: 30, marginBottom: 8 },
  actionText: { fontSize: 13, color: '#333', textAlign: 'center' },
  recentList: { backgroundColor: 'white', marginHorizontal: 15, borderRadius: 12, padding: 10 },
  recentItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recentInfo: { flex: 1 },
  recentAsset: { fontWeight: 'bold', color: '#333' },
  recentLocation: { color: '#666', fontSize: 12, marginTop: 2 },
  recentTime: { color: '#999', fontSize: 12 },
  noDataText: { textAlign: 'center', color: '#999', padding: 20 },
  spacer: { height: 30 },
});