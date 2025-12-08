import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  Share 
} from 'react-native';
import { Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';

export default function JobDetails({ route, navigation }) {
  const { job } = route.params;
  const [loading, setLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState(null);
  const [showOTPModal, setShowOTPModal] = useState(false);

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

  const generateOTP = async () => {
    setLoading(true);
    try {
      // Generate random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save OTP to database
      const { error } = await supabase
        .from('complaints')
        .update({ 
          otp: otp,
          otp_created_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (error) throw error;

      setGeneratedOTP(otp);
      setShowOTPModal(true);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const shareOTP = async () => {
    try {
      await Share.share({
        message: `Your complaint verification OTP is: ${generatedOTP}\n\nThis OTP is valid for 5 minutes.\n\nComplaint: ${job.asset_id}`,
      });
    } catch (error) {
      console.error('Share error:', error);
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
          <>
            <Button 
              mode="contained" 
              onPress={generateOTP}
              loading={loading}
              style={[styles.btn, { backgroundColor: '#4CAF50' }]}
              icon="key"
            >
              Generate OTP to Complete
            </Button>

            <Text style={styles.otpHint}>
              ℹ️ Generate OTP and share with user to verify completion
            </Text>
          </>
        )}

        {job.status === 'CLOSED' && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✅ This job has been completed</Text>
            {job.verified_at && (
              <Text style={styles.verifiedText}>
                Verified: {new Date(job.verified_at).toLocaleDateString()}
              </Text>
            )}
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

      {/* OTP Display Modal */}
      <Modal
        visible={showOTPModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOTPModal(false)}
      >
        <View style={styles.otpModalOverlay}>
          <View style={styles.otpModalContent}>
            <Text style={styles.otpModalTitle}>🔐 Verification OTP</Text>
            <Text style={styles.otpModalSubtitle}>
              Share this OTP with the user to verify completion
            </Text>

            <View style={styles.otpDisplay}>
              <Text style={styles.otpText}>{generatedOTP}</Text>
            </View>

            <Text style={styles.otpValidity}>Valid for 5 minutes</Text>

            <View style={styles.otpActions}>
              <Button 
                mode="contained"
                onPress={shareOTP}
                style={styles.shareBtn}
                icon="share-variant"
              >
                Share OTP
              </Button>

              <Button 
                mode="outlined"
                onPress={() => setShowOTPModal(false)}
                style={styles.closeBtn}
              >
                Close
              </Button>
            </View>

            <Text style={styles.otpNote}>
              📱 User will enter this OTP in their app to confirm the issue is resolved
            </Text>
          </View>
        </View>
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
  
  actions: {
    padding: 15,
  },
  btn: {
    marginBottom: 10,
    borderRadius: 8,
  },
  otpHint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginTop: 10,
    lineHeight: 18,
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
  verifiedText: {
    color: '#666',
    marginTop: 5,
    fontSize: 12,
  },
  
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

  // OTP Modal
  otpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  otpModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  otpModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  otpModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  otpDisplay: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 25,
    paddingHorizontal: 40,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  otpText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2196F3',
    letterSpacing: 8,
  },
  otpValidity: {
    color: '#ff9800',
    fontSize: 13,
    marginBottom: 25,
  },
  otpActions: {
    width: '100%',
    gap: 10,
  },
  shareBtn: {
    borderRadius: 10,
  },
  closeBtn: {
    borderRadius: 10,
  },
  otpNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});