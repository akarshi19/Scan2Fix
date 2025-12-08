import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TextInput as RNTextInput, Image } from 'react-native';
import { Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';

export default function VerifyOTPScreen({ route, navigation }) {
  const { complaint } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [staffInfo, setStaffInfo] = useState(null);

  useEffect(() => {
    fetchStaffInfo();
    
    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchStaffInfo = async () => {
    if (!complaint.assigned_staff_id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, photo_url')
        .eq('id', complaint.assigned_staff_id)
        .single();

      if (error) throw error;
      setStaffInfo(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Fetch complaint to check OTP
      const { data, error } = await supabase
        .from('complaints')
        .select('otp, otp_created_at')
        .eq('id', complaint.id)
        .single();

      if (error) throw error;

      if (!data.otp) {
        Alert.alert('Error', 'No OTP found. Ask staff to generate one.');
        setLoading(false);
        return;
      }

      // Check if OTP expired (5 minutes)
      const otpAge = (Date.now() - new Date(data.otp_created_at).getTime()) / 1000;
      if (otpAge > 300) {
        Alert.alert('Expired', 'OTP has expired. Ask staff to generate a new one.');
        setLoading(false);
        return;
      }

      // Verify OTP
      if (data.otp !== otp) {
        Alert.alert('Invalid OTP', 'The OTP you entered is incorrect.');
        setLoading(false);
        return;
      }

      // Close complaint
      const { error: updateError } = await supabase
        .from('complaints')
        .update({ 
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          otp: null // Clear OTP after verification
        })
        .eq('id', complaint.id);

      if (updateError) throw updateError;

      Alert.alert(
        'Verified! ✅',
        'Complaint has been closed successfully. Thank you!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Verify Completion</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit OTP provided by the staff member
        </Text>

        {/* Complaint Info */}
        <View style={styles.complaintInfo}>
          <Text style={styles.assetId}>{complaint.asset_id}</Text>
          <Text style={styles.location}>{complaint.assets?.location}</Text>
        </View>

        {/* Staff Member Info */}
        {staffInfo && (
          <View style={styles.staffCard}>
            <Text style={styles.staffCardTitle}>Staff Member:</Text>
            <View style={styles.staffRow}>
              {staffInfo.photo_url ? (
                <Image source={{ uri: staffInfo.photo_url }} style={styles.staffPhoto} />
              ) : (
                <View style={styles.staffPhotoPlaceholder}>
                  <Text style={styles.staffInitial}>
                    {staffInfo.full_name ? staffInfo.full_name.charAt(0) : 'S'}
                  </Text>
                </View>
              )}
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>
                  {staffInfo.full_name || staffInfo.email}
                </Text>
                <Text style={styles.staffEmail}>{staffInfo.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          <RNTextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#ccc"
          />
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Time remaining:</Text>
          <Text style={[styles.timer, timeLeft < 60 && styles.timerWarning]}>
            {formatTime(timeLeft)}
          </Text>
        </View>

        {/* Verify Button */}
        <Button
          mode="contained"
          onPress={handleVerify}
          loading={loading}
          disabled={loading || timeLeft === 0}
          style={styles.button}
        >
          Verify & Close Complaint
        </Button>

        {timeLeft === 0 && (
          <Text style={styles.expiredText}>
            OTP expired. Ask staff to generate a new one.
          </Text>
        )}
      </View>

      <Text style={styles.note}>
        ℹ️ The OTP is valid for 5 minutes only
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
  },
  icon: {
    fontSize: 50,
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  complaintInfo: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 15,
    alignItems: 'center',
  },
  assetId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  
  // Staff Card
  staffCard: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  staffCardTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  staffPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staffInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  staffEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  
  otpContainer: {
    width: '100%',
    marginBottom: 20,
  },
  otpInput: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 10,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 10,
    padding: 15,
    color: '#333',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  timer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  timerWarning: {
    color: '#ff9800',
  },
  button: {
    width: '100%',
    borderRadius: 8,
  },
  expiredText: {
    color: '#ff6b6b',
    marginTop: 15,
    textAlign: 'center',
  },
  note: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 13,
  },
});