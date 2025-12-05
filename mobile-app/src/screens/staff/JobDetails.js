import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';

/**
 * JobDetails - View and update job status (Staff)
 */

export default function JobDetails({ route, navigation }) {
  const { job } = route.params;
  const [loading, setLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: newStatus,
          closed_at: newStatus === 'CLOSED' ? new Date().toISOString() : null
        })
        .eq('id', job.id);

      if (error) throw error;

      Alert.alert(
        'Success ✅', 
        `Status updated to ${newStatus}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Job Info Card */}
      <View style={styles.card}>
        <Text style={styles.assetId}>{job.asset_id}</Text>
        <Text style={styles.assetType}>{job.assets?.type}</Text>
        <Text style={styles.location}>📍 {job.assets?.location}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.label}>Issue Description:</Text>
        <Text style={styles.description}>{job.description}</Text>
        
        <Text style={styles.label}>Current Status:</Text>
        <Text style={styles.status}>{job.status}</Text>
        
        <Text style={styles.label}>Reported On:</Text>
        <Text style={styles.date}>
          {new Date(job.created_at).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>

      {/* Photo Section */}
      {job.photo_url && (
        <View style={styles.photoSection}>
          <Text style={styles.photoTitle}>📷 Photo of Issue</Text>
          <TouchableOpacity onPress={() => setShowFullImage(true)}>
            <Image source={{ uri: job.photo_url }} style={styles.photo} />
            <Text style={styles.tapToEnlarge}>Tap to enlarge</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {job.status === 'ASSIGNED' && (
          <Button 
            mode="contained" 
            onPress={() => updateStatus('IN_PROGRESS')}
            loading={loading}
            style={[styles.btn, { backgroundColor: '#2196F3' }]}
            icon="play"
          >
            Start Working
          </Button>
        )}

        {job.status === 'IN_PROGRESS' && (
          <Button 
            mode="contained" 
            onPress={() => updateStatus('CLOSED')}
            loading={loading}
            style={[styles.btn, { backgroundColor: '#4CAF50' }]}
            icon="check"
          >
            Mark as Resolved
          </Button>
        )}

        {job.status === 'CLOSED' && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✅ This job has been completed</Text>
          </View>
        )}
      </View>

      {/* Full Image Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFullImage(false)}
        >
          <Image 
            source={{ uri: job.photo_url }} 
            style={styles.fullImage}
            resizeMode="contain"
          />
          <Text style={styles.closeHint}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  assetId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  assetType: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 5,
  },
  location: {
    color: '#666',
    marginBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
    fontSize: 13,
  },
  description: {
    color: '#666',
    marginTop: 5,
    lineHeight: 22,
  },
  status: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginTop: 5,
    fontSize: 16,
  },
  date: {
    color: '#666',
    marginTop: 5,
  },
  
  // Photo Section
  photoSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  photoTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  tapToEnlarge: {
    textAlign: 'center',
    color: '#2196F3',
    marginTop: 8,
    fontSize: 12,
  },
  
  // Actions
  actions: {
    padding: 15,
  },
  btn: {
    marginBottom: 10,
    borderRadius: 8,
  },
  completedBanner: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
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
  },
});