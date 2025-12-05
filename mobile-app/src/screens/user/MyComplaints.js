import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

/**
 * MyComplaints - Shows history of user's complaints with photos
 */

export default function MyComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, assets(location, type)')
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
      
      {/* Photo Thumbnail */}
      {item.photo_url && (
        <TouchableOpacity onPress={() => setSelectedImage(item.photo_url)}>
          <Image source={{ uri: item.photo_url }} style={styles.thumbnail} />
          <Text style={styles.tapToView}>Tap to view full image</Text>
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
      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderComplaint}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchComplaints} />
        }
        contentContainerStyle={complaints.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Complaints Yet</Text>
            <Text style={styles.emptyText}>
              Your submitted complaints will appear here
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
  date: {
    color: '#999',
    fontSize: 12,
  },
  closedDate: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 5,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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