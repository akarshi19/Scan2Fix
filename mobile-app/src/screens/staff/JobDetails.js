import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, Image,
  TouchableOpacity, Modal, TextInput as RNTextInput , ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { complaintsAPI, getFileUrl } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';

const STATUS_COLORS = {
  OPEN:        { bg: '#FFF3E0', text: '#E65100', dot: '#FF9800' },
  ASSIGNED:    { bg: '#E3F2FD', text: '#1565C0', dot: '#2196F3' },
  IN_PROGRESS: { bg: '#F3E5F5', text: '#6A1B9A', dot: '#9C27B0' },
  FINISHING:   { bg: '#FFF8E1', text: '#F57C00', dot: '#FF9800' },
  CLOSED:      { bg: '#E8F5E9', text: '#2E7D32', dot: '#4CAF50' },
};

export default function JobDetails({ route, navigation }) {
  const { job } = route.params;
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showVerifyOTPModal, setShowVerifyOTPModal] = useState(false);
  const [enteredOTP, setEnteredOTP] = useState(['', '', '', '', '', '']);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const inputRefs = useRef([]);


  const statusInfo = STATUS_COLORS[job.status] ?? { bg: '#F5F5F5', text: '#666', dot: '#999' };
  const photoUrl = getFileUrl(job.photo_url);
  const isClosed = job.status === 'CLOSED';

  const getAssetTypeName = (type) => {
    switch (type) {
      case 'AC': return 'Air Conditioner';
      case 'WATER_COOLER': return 'Water Cooler';
      case 'DESERT_COOLER': return 'Desert Cooler';
      default: return 'Equipment';
    }
  };

  const reporterName = job.reporter?.full_name
    || job.reporter?.email
    || job.user?.full_name
    || job.user?.email
    || 'Unknown';

  const resolverName = job.profiles?.full_name
    || job.profiles?.email
    || 'Unknown';

  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      const jobId = job.id || job._id;
      const response = await complaintsAPI.updateStatus(jobId, newStatus);
      if (response.data.success) {
        Alert.alert('Success ', `Status updated to ${newStatus}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...enteredOTP];
    newOtp[index] = value;
    setEnteredOTP(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !enteredOTP[index] && index > 0) {
      const newOtp = [...enteredOTP];
      newOtp[index - 1] = '';
      setEnteredOTP(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = enteredOTP.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    setVerifyingOTP(true);
    try {
      const jobId = job.id || job._id;
      const response = await complaintsAPI.verifyOTP(jobId, otpString);

      if (response.data.success) {
        Alert.alert(
          'Verified! ✅',
          'Complaint has been closed successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Invalid OTP');
      setEnteredOTP(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifyingOTP(false);
    }
  };

  const isOtpComplete = enteredOTP.every(d => d !== '');

  return (
    <ScreenLayout title="Job Details" showDecor showBack padBottom={100}>

      {/* ════════════════════════════════════════ */}
      {/* Job Info Card                            */}
      {/* ════════════════════════════════════════ */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>

        {/* Title row — "Job Details" + Status badge */}
        <View style={s.cardTitleRow}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>Job Details</Text>
          <View style={[s.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <View style={[s.statusDot, { backgroundColor: statusInfo.dot }]} />
            <Text style={[s.statusBadgeText, { color: statusInfo.text }]}>
              {job.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Asset Header — ID + type */}
        <View style={s.assetHeader}>
          <View style={s.assetHeaderInfo}>
            <Text style={[s.assetIdText, { color: colors.textPri }]}>{job.asset_id}</Text>
            <Text style={[s.assetTypeText, { color: colors.textSec }]}>
              {getAssetTypeName(job.assets?.type)}
            </Text>
          </View>
        </View>

        {/* All Asset Details */}
        <InfoRow icon="location-outline" label="Location:" value={job.assets?.location} colors={colors} iconColor={colors.active} />
        <InfoRow icon="pricetag-outline" label="Brand:" value={job.assets?.brand} colors={colors} />
        <InfoRow icon="hardware-chip-outline" label="Model:" value={job.assets?.model} colors={colors} />
        {job.assets?.install_date && (
          <InfoRow icon="construct-outline" label="Installed On:" value={
            new Date(job.assets.install_date).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric'
            })
          } colors={colors} />
        )}

        {/* Complaint Meta */}
        <InfoRow icon="calendar-outline" label="Reported On:" value={
          new Date(job.created_at).toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        } colors={colors} />

        <InfoRow icon="person-outline" label="Reported By:" value={reporterName} colors={colors} />

        {job.complaint_number && (
          <InfoRow icon="document-text-outline" label="Complaint No:" value={job.complaint_number} colors={colors} />
        )}

        {isClosed && (
          <>
            <InfoRow icon="checkmark-done-outline" label="Resolved By:" value={resolverName} colors={colors} valueColor="#000" />
            <InfoRow icon="calendar-outline" label="Resolved On:" value={
              new Date(job.closed_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })
            } colors={colors} valueColor="#000" />
            {job.verified_at && (
              <InfoRow icon="shield-checkmark-outline" label="Verified On:" value={
                new Date(job.verified_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })
              } colors={colors} valueColor="#000" last />
            )}
          </>
        )}

        {/* Issue Description */}
        <View style={s.descTitleRow}>
          <Text style={[s.sectionLabel, { color: colors.textPri }]}>Issue Description</Text>
        </View>
        <View style={s.descriptionBox}>
          <Text style={[s.description, { color: colors.textSec }]}>
            {job.description}
          </Text>
        </View>
      </View>
      {/* Photo Card  */}
      {photoUrl && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>Photo of Issue</Text>
          <TouchableOpacity onPress={() => setShowFullImage(true)} activeOpacity={0.9}>
            <View style={s.photoWrap}>
              <Image source={{ uri: photoUrl }} style={s.photo} />
              <View style={s.enlargeOverlay}>
                <Ionicons name="expand-outline" size={13} color={colors.active} />
                <Text style={{ fontSize: 12, color: colors.active, fontWeight: '500' }}> Tap to enlarge</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
      {/* Action Card  */}
      {!isClosed && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>Actions</Text>

          {/* Step 1: Start Working */}
          {job.status === 'ASSIGNED' && (
            <TouchableOpacity
              style={s.startBtn}
              onPress={() => updateStatus('IN_PROGRESS')}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="play-circle-outline" size={20} color="#FFF" />
              <Text style={s.actionBtnText}>
                {loading ? 'Updating...' : 'Start Working'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Step 2: Finish Working */}
          {job.status === 'IN_PROGRESS' && (
            <>
              <TouchableOpacity
                style={s.finishBtn}
                onPress={() => updateStatus('FINISHING')}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Ionicons name="flag-outline" size={20} color="#FFF" />
                <Text style={s.actionBtnText}>
                  {loading ? 'Updating...' : 'Finish Working'}
                </Text>
              </TouchableOpacity>

              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.active} />
                <Text style={[s.hintText, { color: colors.textSec }]}>
                  Click when work is completed. User will then generate OTP for verification.
                </Text>
              </View>
            </>
          )}

          {/* Step 3: Verify OTP (after user generates it) */}
          {job.status === 'FINISHING' && (
            <>
              <TouchableOpacity
                style={s.verifyOtpBtn}
                onPress={() => {
                  setShowVerifyOTPModal(true);
                  // Auto-focus first input after modal opens
                  setTimeout(() => inputRefs.current[0]?.focus(), 500);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#FFF" />
                <Text style={s.actionBtnText}>Enter OTP to Complete</Text>
              </TouchableOpacity>

              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.active} />
                <Text style={[s.hintText, { color: colors.textSec }]}>
                  Ask the user for the completion OTP to verify and close this job
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Full Image Modal   */}
      <Modal
        visible={showFullImage}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFullImage(false)}
        >
          <Image source={{ uri: photoUrl }} style={s.fullImage} resizeMode="contain" />
          <View style={s.closeHintRow}>
            <Ionicons name="close-circle-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={s.closeHint}> Tap anywhere to close</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* OTP Modal   */}
      <Modal
        visible={showVerifyOTPModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVerifyOTPModal(false)}
      >
        <View style={s.otpModalOverlay}>
          <View style={[s.otpModalContent, { backgroundColor: colors.cardBg }]}>
            <View style={s.otpHandle} />

            <View style={s.otpIconWrap}>
              <Ionicons name="shield-checkmark" size={32} color="#004e68" />
            </View>

            <Text style={[s.otpTitle, { color: colors.textPri }]}>Enter Completion OTP</Text>
            <Text style={[s.otpSubtitle, { color: colors.textSec }]}>
              Ask the user for the 6-digit OTP to verify completion
            </Text>

            {/* OTP Input Boxes */}
            <View style={s.otpInputRow}>
              {enteredOTP.map((digit, index) => (
                <View
                  key={index}
                  style={[s.otpInputBox, digit && s.otpInputBoxFilled]}
                >
                  <RNTextInput
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={s.otpInputField}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[s.verifyButton, (!isOtpComplete || verifyingOTP) && s.verifyButtonDisabled]}
              onPress={handleVerifyOTP}
              disabled={!isOtpComplete || verifyingOTP}
              activeOpacity={0.85}
            >
              {verifyingOTP ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.verifyButtonText}>  Verifying...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                  <Text style={s.verifyButtonText}>  Verify & Close Job</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.closeOtpBtn}
              onPress={() => {
                setShowVerifyOTPModal(false);
                setEnteredOTP(['', '', '', '', '', '']);
              }}
            >
              <Text style={s.closeOtpBtnText}>Cancel</Text>
            </TouchableOpacity>

            <View style={s.noteRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMut} />
              <Text style={[s.noteText, { color: colors.textMut }]}>
                User generates this OTP from their app after you complete the work
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

/* ═══════════════════════════════════════ */
/* Reusable Info Row (same as ComplaintDetail) */
/* ═══════════════════════════════════════ */
function InfoRow({ icon, label, value, colors, iconColor, valueColor, last }) {
  if (!value && value !== 0) return null;
  return (
    <View style={[s.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Ionicons
        name={icon}
        size={16}
        color={iconColor || colors.textMut}
        style={{ marginRight: 8, width: 24, textAlign: 'center' }}
      />
      <Text style={[s.infoLabel, { color: colors.textMut }]}>{label}</Text>
      <Text style={[s.infoValue, { color: valueColor || colors.textPri }]}>{value || 'N/A'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Card
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#A0BDD0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  // Title row — title + status in same line
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F8',
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardTitleSimple: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F8',
  },

  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  // Asset header
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  assetHeaderInfo: { flex: 1 },
  assetIdText: { fontSize: 17, fontWeight: '800' },
  assetTypeText: { fontSize: 12, marginTop: 2 },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  infoLabel: { width: 90, fontSize: 12, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500' },

  // Section label
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  descTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },

  // Description box
  descriptionBox: {
    backgroundColor: '#F8FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF4F8',
  },
  description: { fontSize: 14, lineHeight: 22 },

  // Photo
  photoWrap: { borderRadius: 12, overflow: 'hidden' },
  photo: { width: '100%', height: 200, borderRadius: 12 },
  enlargeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  // Action Buttons — EXPLICIT background colors
  startBtn: {
    backgroundColor: '#004e68',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#004e68',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  otpBtn: {
    backgroundColor: '#004e68',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#004e68',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },

  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF6FB',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18 },
  // Full Image Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: { width: '95%', height: '70%' },
  closeHintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  closeHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  // OTP Modal
  otpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  otpModalContent: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  otpHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    marginBottom: 20,
  },
  otpIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#004e6812',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  otpTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  otpSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19 },
  otpDisplay: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpDigitBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EEF6FB',
    borderWidth: 2,
    borderColor: '#5BA8D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: { fontSize: 28, fontWeight: '800', color: '#004e68' },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  validityText: { fontSize: 12, fontWeight: '600', color: '#FF9800' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#004e68',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    shadowColor: '#004e68',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  closeOtpBtn: {
    backgroundColor: '#F2F6F8',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeOtpBtnText: { color: '#5A7A8A', fontWeight: '600', fontSize: 14 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFB',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  noteText: { flex: 1, fontSize: 11, lineHeight: 17 },

  verifyOtpBtn: {
  backgroundColor: '#004e68',
  borderRadius: 12,
  paddingVertical: 16,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  shadowColor: '#004e68',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 8,
  elevation: 6,
  marginBottom: 10,
},
otpInputRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 8,
  marginBottom: 24,
  width: '100%',
},
otpInputBox: {
  width: 46,
  height: 54,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#E0EBF0',
  backgroundColor: '#F8FAFB',
  alignItems: 'center',
  justifyContent: 'center',
},
otpInputBoxFilled: {
  borderColor: '#5BA8D4',
  backgroundColor: '#EEF6FB',
},
otpInputField: {
  fontSize: 24,
  fontWeight: '800',
  color: '#004e68',
  textAlign: 'center',
  width: '100%',
  height: '100%',
  padding: 0,
},
verifyButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#004e68',
  borderRadius: 12,
  paddingVertical: 14,
  width: '100%',
  shadowColor: '#004e68',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 5,
  marginBottom: 10,
},
verifyButtonDisabled: {
  backgroundColor: '#004e685e',
  shadowOpacity: 0,
},
verifyButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
finishBtn: {
  backgroundColor: '#FF9800',
  borderRadius: 12,
  paddingVertical: 16,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  shadowColor: '#FF9800',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 8,
  elevation: 6,
  marginBottom: 10,
},
verifyOtpBtn: {
  backgroundColor: '#004e68',
  borderRadius: 12,
  paddingVertical: 16,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  shadowColor: '#004e68',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 8,
  elevation: 6,
  marginBottom: 10,
},
});