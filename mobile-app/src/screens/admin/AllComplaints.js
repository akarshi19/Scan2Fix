import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity,
  TextInput 
} from 'react-native';
import { supabase } from '../../services/supabase';

/**
 * AllComplaints - Admin view of all complaints with filters
 * 
 * FEATURES:
 * 1. View all complaints
 * 2. Filter by status
 * 3. Search by asset ID
 * 4. Tap to view details and assign staff
 */

export default function AllComplaints({ navigation }) {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchComplaints();
    
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchComplaints();
    });
    
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    filterComplaints();
  }, [complaints, activeFilter, searchQuery]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, assets(location, type), profiles!complaints_assigned_staff_id_fkey(full_name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaints = () => {
    let result = [...complaints];

    // Filter by status
    if (activeFilter !== 'ALL') {
      result = result.filter(c => c.status === activeFilter);
    }

    // Filter by search
    if (searchQuery) {
      result = result.filter(c => 
        c.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredComplaints(result);
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN': return '🟡';
      case 'ASSIGNED': return '🔵';
      case 'IN_PROGRESS': return '🟣';
      case 'CLOSED': return '✅';
      default: return '⚪';
    }
  };

  const filterButtons = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'CLOSED', label: 'Closed' },
  ];

  const renderComplaint = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('ComplaintDetail', { complaint: item })}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.assetId}>{item.asset_id}</Text>
          <Text style={styles.assetType}>{item.assets?.type}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>{getStatusIcon(item.status)} {item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.location}>📍 {item.assets?.location}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.profiles && (
          <Text style={styles.assignedTo}>
            👷 {item.profiles.full_name || item.profiles.email}
          </Text>
        )}
      </View>

      {/* Has Photo Indicator */}
      {item.photo_url && (
        <View style={styles.hasPhoto}>
          <Text style={styles.hasPhotoText}>📷 Has Photo</Text>
        </View>
      )}

      <Text style={styles.tapHint}>Tap to view details →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by Asset ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterButtons}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === item.key && styles.filterButtonActive
              ]}
              onPress={() => setActiveFilter(item.key)}
            >
              <Text style={[
                styles.filterButtonText,
                activeFilter === item.key && styles.filterButtonTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          Showing {filteredComplaints.length} of {complaints.length} complaints
        </Text>
      </View>

      {/* Complaints List */}
      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderComplaint}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchComplaints} />
        }
        contentContainerStyle={filteredComplaints.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No complaints found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
  },
  
  // Search
  searchContainer: {
    padding: 15,
    paddingBottom: 10,
    backgroundColor: 'white',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 14,
  },
  
  // Filters
  filterContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 13,
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Stats
  statsRow: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  statsText: {
    color: '#666',
    fontSize: 12,
  },
  
  // Card
  card: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  assetId: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
  },
  assetType: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  location: {
    color: '#666',
    fontSize: 13,
    marginBottom: 5,
  },
  description: {
    color: '#333',
    marginBottom: 10,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: '#999',
    fontSize: 12,
  },
  assignedTo: {
    color: '#2196F3',
    fontSize: 12,
  },
  hasPhoto: {
    marginTop: 10,
  },
  hasPhotoText: {
    color: '#666',
    fontSize: 12,
  },
  tapHint: {
    color: '#2196F3',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'right',
  },
  
  // Empty
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    color: '#666',
  },
});