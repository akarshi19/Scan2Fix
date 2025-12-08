import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  Image,
  TouchableOpacity,
  Modal 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function MyComplaints() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');

  // Tab configuration
  const tabs = [
    { key: 'ALL', label: 'All', icon: '📋', color: '#2196F3' },
    { key: 'OPEN', label: 'Open', icon: '🟡', color: '#ff9800' },
    { key: 'ASSIGNED', label: 'Assigned', icon: '🔵', color: '#2196F3' },
    { key: 'IN_PROGRESS', label: 'In Progress', icon: '🟣', color: '#9C27B0' },
    { key: 'CLOSED', label: 'Closed', icon: '✅', color: '#4CAF50' },
  ];

  useFocusEffect(
    useCallback(() => {
      fetchComplaints();
    }, [])
  );

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *, 
          assets(location, type),
          profiles!complaints_assigned_staff_id_fkey(full_name, email, photo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredComplaints = () => {
    if (activeTab === 'ALL') return complaints;
    return complaints.filter(c => c.status === activeTab);
  };

  const getTabCount = (status) => {
    if (status === 'ALL') return complaints.length;
    return complaints.filter(c => c.status === status).length;
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

  const renderComplaint = ({ item }) => (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.assetId}>{item.asset_id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusIcon(item.status)} {item.status}</Text>
        </View>
      </View>

      {/* Location */}
      <Text style={styles.location}>📍 {item.assets?.location || 'Unknown'}</Text>
      
      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      
      {/* Assigned Staff Info */}
      {item.profiles && (
        <View style={styles.staffCard}>
          <View style={styles.staffRow}>
            {item.profiles.photo_url ? (
              <Image source={{ uri: item.profiles.photo_url }} style={styles.staffPhoto} />
            ) : (
              <View style={styles.staffPhotoPlaceholder}>
                <Text style={styles.staffInitial}>
                  {item.profiles.full_name ? item.profiles.full_name.charAt(0) : 'S'}
                </Text>
              </View>
            )}
            <View style={styles.staffInfo}>
              <Text style={styles.staffLabel}>Assigned to:</Text>
              <Text style={styles.staffName}>
                {item.profiles.full_name || item.profiles.email}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Photo Thumbnail */}
      {item.photo_url && (
        <TouchableOpacity onPress={() => setSelectedImage(item.photo_url)}>
          <Image source={{ uri: item.photo_url }} style={styles.thumbnail} />
          <Text style={styles.tapToView}>Tap to view full image</Text>
        </TouchableOpacity>
      )}

      {/* Verify Button */}
      {item.status === 'IN_PROGRESS' && item.otp && (
        <TouchableOpacity 
          style={styles.verifyButton}
          onPress={() => navigation.navigate('VerifyOTP', { complaint: item })}
        >
          <Text style={styles.verifyButtonText}>🔐 Enter OTP to Verify Completion</Text>
        </TouchableOpacity>
      )}

      {/* Date */}
      <Text style={styles.date}>
        📅 {new Date(item.created_at).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>

      {/* Closed Date */}
      {item.closed_at && (
        <Text style={styles.closedDate}>
          ✅ Resolved: {new Date(item.closed_at).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tabs}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === item.key && { borderBottomColor: item.color, borderBottomWidth: 3 }
              ]}
              onPress={() => setActiveTab(item.key)}
            >
              <Text style={styles.tabIcon}>{item.icon}</Text>
              <Text style={[
                styles.tabLabel,
                activeTab === item.key && { color: item.color, fontWeight: 'bold' }
              ]}>
                {item.label}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: item.color }]}>
                <Text style={styles.tabBadgeText}>{getTabCount(item.key)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Complaints List */}
      <FlatList
        data={getFilteredComplaints()}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderComplaint}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchComplaints} />
        }
        contentContainerStyle={getFilteredComplaints().length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {activeTab === 'ALL' ? '📭' : 
               activeTab === 'OPEN' ? '🟡' :
               activeTab === 'ASSIGNED' ? '🔵' :
               activeTab === 'IN_PROGRESS' ? '🟣' : '✅'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'ALL' && 'No Complaints Yet'}
              {activeTab === 'OPEN' && 'No Open Complaints'}
              {activeTab === 'ASSIGNED' && 'No Assigned Complaints'}
              {activeTab === 'IN_PROGRESS' && 'No Complaints In Progress'}
              {activeTab === 'CLOSED' && 'No Closed Complaints'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'ALL' 
                ? 'Your submitted complaints will appear here'
                : `Complaints with "${activeTab}" status will appear here`}
            </Text>
          </View>
        }
      />

      {/* Full Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <Image 
            source={{ uri: selectedImage }} 
            style={styles.fullImage}
            resizeMode="contain"
          />
          <Text style={styles.closeHint}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
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
  
  // Tabs
  tabContainer: {
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    minWidth: 80,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#666',
  },
  tabBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Card styles
  card: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  assetId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  location: {
    color: '#666',
    marginBottom: 8,
    fontSize: 13,
  },
  description: {
    color: '#333',
    marginBottom: 10,
    lineHeight: 20,
  },
  
  // Staff Card
  staffCard: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  staffPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  staffInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  staffInfo: {
    flex: 1,
  },
  staffLabel: {
    fontSize: 11,
    color: '#666',
  },
  staffName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  
  thumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 5,
  },
  tapToView: {
    fontSize: 11,
    color: '#2196F3',
    textAlign: 'center',
    marginBottom: 10,
  },
  
  verifyButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  verifyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  date: {
    color: '#999',
    fontSize: 12,
  },
  closedDate: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 5,
  },
  
  // Empty
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 13,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '95%',
    height: '70%',
  },
  closeHint: {
    color: 'white',
    marginTop: 20,
    fontSize: 14,
  },
});