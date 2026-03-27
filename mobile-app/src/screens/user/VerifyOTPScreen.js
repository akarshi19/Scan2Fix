import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, TextInput as RNTextInput,
  Image, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { complaintsAPI, usersAPI, getFileUrl } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

const ACTIVE = '#5BA8D4';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#5A7A8A';
const TEXT_MUT = '#9DB5C0';
const CARD_BG = '#FFFFFF';
const OTP_LENGTH = 6;

export default function VerifyOTPScreen({ route, navigation }) {
  const { complaint } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [staffInfo, setStaffInfo] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    fetchStaffInfo();
    // Auto focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 300);

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
      if (complaint.profiles) {
        setStaffInfo(complaint.profiles);
        return;
      }
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

  // ════════════════════════════════════════
  // OTP Input Handlers
  // ════════════════════════════════════════
  const handleOtpChange = (value, index) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace — go to previous input
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const getOtpString = () => otp.join('');
  const isOtpComplete = otp.every(d => d !== '');

  const handleVerify = async () => {
    const otpString = getOtpString();
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const complaintId = complaint.id || complaint._id;
      const response = await complaintsAPI.verifyOTP(complaintId, otpString);

      if (response.data.success) {
        Alert.alert(
          'Verified! ✅',
          'Complaint has been closed successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Verification failed');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const isExpired = timeLeft === 0;

  return (
    <ScreenLayout title="Verify Complaint" showBack showDecor padBottom={40}>

      {/* Main Card */}
      <View style={s.mainCard}>

        {/* Icon */}
        <View style={s.iconWrap}>
          <Ionicons name="key" size={32} color="#004e68" />
        </View>

        <Text style={s.title}>Verify Completion</Text>
        <Text style={s.subtitle}>Enter the 6-digit OTP provided by maintenance staff</Text>

        {/* Complaint Info */}
        <View style={s.complaintInfo}>
          <View style={s.complaintInfoRow}>
            <Ionicons name="barcode-outline" size={16} color={ACTIVE} />
            <Text style={s.complaintAssetId}> {complaint.asset_id}</Text>
          </View>
          <View style={s.complaintInfoRow}>
            <Ionicons name="location-outline" size={14} color={TEXT_MUT} />
            <Text style={s.complaintLocation}> {complaint.assets?.location}</Text>
          </View>
        </View>

        {/* Staff Info */}
        {staffInfo && (
          <View style={s.staffCard}>
            <View style={s.staffRow}>
              {staffInfo.photo_url ? (
                <Image
                  source={{ uri: getFileUrl(staffInfo.photo_url) }}
                  style={s.staffPhoto}
                />
              ) : (
                <View style={s.staffPlaceholder}>
                  <Text style={s.staffInitial}>
                    {staffInfo.full_name?.charAt(0) || 'S'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.staffLabel}>Maintenance Staff</Text>
                <Text style={s.staffName}>
                  {staffInfo.full_name || staffInfo.email}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════ */}
        {/* OTP Input — Individual Digit Boxes       */}
        {/* ════════════════════════════════════════ */}
        <Text style={s.otpLabel}>Enter OTP</Text>
        <View style={s.otpRow}>
          {otp.map((digit, index) => (
            <View
              key={index}
              style={[
                s.otpBox,
                digit ? s.otpBoxFilled : null,
                isExpired && s.otpBoxExpired,
              ]}
            >
              <RNTextInput
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={s.otpInput}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!isExpired}
              />
            </View>
          ))}
        </View>

        {/* Timer */}
        <View style={[s.timerRow, isExpired && s.timerRowExpired]}>
          <Ionicons
            name={isExpired ? 'alert-circle' : 'time-outline'}
            size={16}
            color={isExpired ? '#E53935' : '#4CAF50'}
          />
          <Text style={[s.timerText, isExpired && s.timerTextExpired]}>
            {isExpired ? ' OTP Expired' : ` ${formatTime(timeLeft)} remaining`}
          </Text>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            s.verifyBtn,
            (!isOtpComplete || loading || isExpired) && s.verifyBtnDisabled,
          ]}
          onPress={handleVerify}
          disabled={!isOtpComplete || loading || isExpired}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.verifyBtnText}>  Verifying...</Text>
            </View>
          ) : (
            <View style={s.loadingRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#FFF" />
              <Text style={s.verifyBtnText}>  Verify & Close Complaint</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Expired message */}
        {isExpired && (
          <View style={s.expiredBox}>
            <Ionicons name="warning-outline" size={18} color="#E65100" />
            <Text style={s.expiredText}>
              OTP has expired. Please ask staff to generate a new one.
            </Text>
          </View>
        )}

        {/* Help note */}
        <View style={s.noteRow}>
          <Ionicons name="information-circle-outline" size={14} color={TEXT_MUT} />
          <Text style={s.noteText}>
            The maintenance staff will provide you this OTP after completing the repair work.
            OTP is valid for 5 minutes.
          </Text>
        </View>
      </View>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  // Main Card
  mainCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 24,
    marginTop: 0,
    shadowColor: '#A0BDD0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },

  // Icon
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#004e6812',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },

  title: { fontSize: 20, fontWeight: '800', color: TEXT_PRI, marginBottom: 6 },
  subtitle: {
    fontSize: 13, color: TEXT_SEC, textAlign: 'center',
    lineHeight: 19, marginBottom: 20,
  },

  // Complaint Info
  complaintInfo: {
    backgroundColor: '#EEF6FB',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 14,
    gap: 6,
  },
  complaintInfoRow: { flexDirection: 'row', alignItems: 'center' },
  complaintAssetId: { fontSize: 16, fontWeight: '800', color: TEXT_PRI },
  complaintLocation: { fontSize: 13, color: TEXT_SEC },

  // Staff Card
  staffCard: {
    backgroundColor: '#EEF6FB',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  staffRow: { flexDirection: 'row', alignItems: 'center' },
  staffPhoto: {
    width: 40, height: 40, borderRadius: 20, marginRight: 12,
    borderWidth: 2, borderColor: ACTIVE,
  },
  staffPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#004e68', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
    borderWidth: 2, borderColor: '#FFF',
  },
  staffInitial: { color: '#fff', fontWeight: '700', fontSize: 15 },
  staffLabel: { fontSize: 10, color: TEXT_MUT },
  staffName: { fontSize: 14, fontWeight: '700', color: TEXT_PRI, marginTop: 1 },

  // ════════════════════════════════════════
  // OTP Input Boxes
  // ════════════════════════════════════════
  otpLabel: { fontSize: 13, fontWeight: '600', color: TEXT_SEC, marginBottom: 10 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0EBF0',
    backgroundColor: '#F8FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: ACTIVE,
    backgroundColor: '#EEF6FB',
  },
  otpBoxExpired: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '800',
    color: '#004e68',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },

  // Timer
  timerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E8F5E9', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 20, marginBottom: 20,
    gap: 4,
  },
  timerRowExpired: { backgroundColor: '#FFEBEE' },
  timerText: { fontSize: 13, fontWeight: '600', color: '#4CAF50' },
  timerTextExpired: { color: '#E53935' },

  // Verify Button
  verifyBtn: {
    backgroundColor: '#004e68',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#004e68',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  verifyBtnDisabled: {
    backgroundColor: '#B0CDD8',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  // Expired
  expiredBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF3E0', borderRadius: 10,
    padding: 12, width: '100%', gap: 8, marginBottom: 12,
  },
  expiredText: { flex: 1, fontSize: 12, color: '#E65100', lineHeight: 18 },

  // Note
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F8FAFB', borderRadius: 10,
    padding: 12, gap: 8, width: '100%',
  },
  noteText: { flex: 1, fontSize: 11, color: TEXT_MUT, lineHeight: 17 },
});