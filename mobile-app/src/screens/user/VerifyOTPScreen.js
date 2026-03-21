import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TextInput as RNTextInput, Image } from 'react-native';
import { Button } from 'react-native-paper';
import { complaintsAPI, usersAPI, getFileUrl } from '../../services/api';
import ProfileMenu from '../../components/ProfileMenu';


export default function VerifyOTPScreen({ route, navigation }) {
  const { complaint } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [staffInfo, setStaffInfo] = useState(null);

  useEffect(() => {
    fetchStaffInfo();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchStaffInfo = async () => {
    if (!complaint.assigned_staff_id) return;
    try {
      // If profiles data was passed with complaint, use it
      if (complaint.profiles) {
        setStaffInfo(complaint.profiles);
        return;
      }
      // Otherwise fetch from server
      const response = await usersAPI.getById(complaint.assigned_staff_id);
      if (response.data.success) {
        setStaffInfo(response.data.data);
      }
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
      const complaintId = complaint.id || complaint._id;
      const response = await complaintsAPI.verifyOTP(complaintId, otp);

      if (response.data.success) {
        Alert.alert(
          'Verified!',
          'Complaint has been closed successfully. Thank you!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ProfileMenu/>
      <View style={styles.card}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Verify Completion</Text>
        <Text style={styles.subtitle}>Enter the 6-digit OTP provided by the staff member</Text>

        <View style={styles.complaintInfo}>
          <Text style={styles.assetId}>{complaint.asset_id}</Text>
          <Text style={styles.location}>{complaint.assets?.location}</Text>
        </View>

        {staffInfo && (
          <View style={styles.staffCard}>
            <Text style={styles.staffCardTitle}>Staff Member:</Text>
            <View style={styles.staffRow}>
              {staffInfo.photo_url ? (
                <Image source={{ uri: getFileUrl(staffInfo.photo_url) }} style={styles.staffPhoto} />
              ) : (
                <View style={styles.staffPhotoPlaceholder}>
                  <Text style={styles.staffInitial}>
                    {staffInfo.full_name ? staffInfo.full_name.charAt(0) : 'S'}
                  </Text>
                </View>
              )}
              <View style={styles.staffInfoView}>
                <Text style={styles.staffName}>{staffInfo.full_name || staffInfo.email}</Text>
                <Text style={styles.staffEmail}>{staffInfo.email}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.otpContainer}>
          <RNTextInput
            style={styles.otpInput} value={otp} onChangeText={setOtp}
            keyboardType="number-pad" maxLength={6}
            placeholder="000000" placeholderTextColor="#ccc"
          />
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Time remaining:</Text>
          <Text style={[styles.timer, timeLeft < 60 && styles.timerWarning]}>
            {formatTime(timeLeft)}
          </Text>
        </View>

        <Button mode="contained" onPress={handleVerify} loading={loading}
          disabled={loading || timeLeft === 0} style={styles.button}
        >
          Verify & Close Complaint
        </Button>

        {timeLeft === 0 && (
          <Text style={styles.expiredText}>OTP expired. Ask staff to generate a new one.</Text>
        )}
      </View>
      <Text style={styles.note}>ℹ️ The OTP is valid for 5 minutes only</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, justifyContent: 'center' },
  card: { backgroundColor: 'white', padding: 30, borderRadius: 15, alignItems: 'center', elevation: 3 },
  icon: { fontSize: 50, marginBottom: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  complaintInfo: { backgroundColor: '#e3f2fd', padding: 15, borderRadius: 8, width: '100%', marginBottom: 15, alignItems: 'center' },
  assetId: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  location: { fontSize: 12, color: '#666', marginTop: 3 },
  staffCard: { backgroundColor: '#fff3e0', padding: 15, borderRadius: 8, width: '100%', marginBottom: 20 },
  staffCardTitle: { fontSize: 12, color: '#666', marginBottom: 10 },
  staffRow: { flexDirection: 'row', alignItems: 'center' },
  staffPhoto: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  staffPhotoPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2196F3', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  staffInitial: { color: 'white', fontWeight: 'bold', fontSize: 20 },
  staffInfoView: { flex: 1 },
  staffName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  staffEmail: { fontSize: 12, color: '#666', marginTop: 2 },
  otpContainer: { width: '100%', marginBottom: 20 },
  otpInput: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', letterSpacing: 10, borderWidth: 2, borderColor: '#2196F3', borderRadius: 10, padding: 15, color: '#333' },
  timerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  timerLabel: { fontSize: 14, color: '#666', marginRight: 8 },
  timer: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  timerWarning: { color: '#ff9800' },
  button: { width: '100%', borderRadius: 8 },
  expiredText: { color: '#ff6b6b', marginTop: 15, textAlign: 'center' },
  note: { textAlign: 'center', color: '#666', marginTop: 20, fontSize: 13 },
});