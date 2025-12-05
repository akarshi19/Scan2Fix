import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

/**
 * StaffDashboard - Shows jobs assigned to staff member
 */

export default function StaffDashboard({ navigation }) {
  const { user, signOut } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, assets(location, type)')
        .eq('assigned_staff_id', user.id)
        .neq('status', 'CLOSED')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderJob = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('JobDetails', { job: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.assetId}>{item.asset_id}</Text>
        <Text style={styles.type}>{item.assets?.type}</Text>
      </View>
      <Text style={styles.location}>📍 {item.assets?.location}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      <Text style={styles.tapHint}>Tap to view details →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs 🔧</Text>
        <Text style={styles.count}>{jobs.length} pending</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderJob}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchJobs} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>No pending jobs!</Text>
          </View>
        }
      />

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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  count: {
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  assetId: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  type: {
    color: '#2196F3',
  },
  location: {
    color: '#666',
    marginBottom: 5,
  },
  description: {
    color: '#333',
  },
  tapHint: {
    color: '#2196F3',
    marginTop: 10,
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyIcon: {
    fontSize: 50,
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
  },
  logoutBtn: {
    padding: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ff6b6b',
  },
});