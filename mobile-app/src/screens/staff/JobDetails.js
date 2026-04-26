import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, Image,
  TouchableOpacity, Modal, TextInput as RNTextInput, ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { complaintsAPI, uploadAPI, getFileUrl } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';


export default function JobDetails({ route, navigation }) {
  const { job } = route.params;
  const { colors } = useTheme();
  const { t } = useLanguage();

  const STATUS_COLORS = {
    OPEN: { bg: '#FFF3E0', text: colors.open, dot: colors.open },
    ASSIGNED: { bg: '#fad4e1', text: colors.assigned, dot: colors.assigned },
    IN_PROGRESS: { bg: '#f4d4f9', text: colors.inProgress, dot: colors.inProgress },
    FINISHING: { bg: '#fbdaefc9', text: colors.finishing, dot: colors.finishing },
    CLOSED: { bg: '#e8fce8', text: colors.closed, dot: colors.closed },
  };

  const STATUS_LABEL_KEYS = {
    OPEN: 'open',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'inProgress',
    FINISHING: 'finishing',
    CLOSED: 'closed',
  };


  const [loading, setLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showVerifyOTPModal, setShowVerifyOTPModal] = useState(false);
  const [enteredOTP, setEnteredOTP] = useState(['', '', '', '', '', '']);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [ackPhoto, setAckPhoto] = useState(null);
  const [ackLoading, setAckLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [showAckFallback, setShowAckFallback] = useState(false);
  const inputRefs = useRef([]);

  const statusInfo = STATUS_COLORS[job.status] ?? { bg: '#F5F5F5', text: '#666', dot: '#999' };
  const photoUrl = getFileUrl(job.photo_url);
  const isClosed = job.status === 'CLOSED';

  // OTP flow only when there is an actual email — never rely on source alone
  const hasRealEmail = !!(job.contact_email && !job.contact_email.includes('@noreply.scan2fix'));

  const getStatusLabel = (status) => {
    const key = STATUS_LABEL_KEYS[status];
    return key ? t(key) : status;
  };

  const reporterName = job.source === 'WEB'
    ? job.contact_name
    : (job.reporter?.full_name
      || job.reporter?.email
      || job.user?.full_name
      || job.user?.email
      || t('unknown'));

  const resolverName = job.profiles?.full_name
    || job.profiles?.email
    || t('unknown');

  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      const jobId = job.id || job._id;
      const response = await complaintsAPI.updateStatus(jobId, newStatus);
      if (response.data.success) {
        setLoading(false);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(t('error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setSendingOTP(true);
    try {
      const jobId = job.id || job._id;
      const response = await complaintsAPI.sendOTP(jobId);
      if (response.data.success) {
        setShowVerifyOTPModal(true);
        setTimeout(() => inputRefs.current[0]?.focus(), 500);
      }
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOTP(false);
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
      Alert.alert(t('error'), t('otpIncomplete'));
      return;
    }

    setVerifyingOTP(true);
    try {
      const jobId = job.id || job._id;
      const response = await complaintsAPI.verifyOTP(jobId, otpString);

      if (response.data.success) {
        setVerifyingOTP(false);
        setShowVerifyOTPModal(false);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('invalidOtp'));
      setEnteredOTP(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifyingOTP(false);
    }
  };

  const isOtpComplete = enteredOTP.every(d => d !== '');

  const takeAckPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), 'Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setAckPhoto(result.assets[0]);
  };

  const pickAckPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), 'Gallery permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setAckPhoto(result.assets[0]);
  };

  const submitAck = async () => {
    if (!ackPhoto) return;
    setAckLoading(true);
    try {
      const uploadRes = await uploadAPI.complaintPhoto(ackPhoto);
      const ackPhotoUrl = uploadRes.data?.data?.photo_url;
      if (!ackPhotoUrl) throw new Error('Photo upload failed');

      const jobId = job.id || job._id;
      const res = await complaintsAPI.closeWithAck(jobId, ackPhotoUrl);
      if (res.data.success) {
        setAckLoading(false);
        navigation.goBack();
      }
    } catch (error) {
      setAckLoading(false);
      Alert.alert(t('error'), error.response?.data?.message || error.message || 'Failed to upload acknowledgement. Please try again.');
    }
  };

  const s = StyleSheet.create({
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
    cardTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    cardTitle: { fontSize: 15, fontWeight: '800' },
    cardTitleSimple: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 16,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
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
    assetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    assetHeaderInfo: { flex: 1 },
    assetIdText: { fontSize: 17, fontWeight: '800' },
    assetTypeText: { fontSize: 12, marginTop: 2 },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
    },
    infoLabel: { width: 90, fontSize: 12, fontWeight: '600' },
    infoValue: { flex: 1, fontSize: 14, fontWeight: '500' },
    sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
    descTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    descriptionBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    description: { fontSize: 14, lineHeight: 22, color: colors.textPri },
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
    startBtn: {
      backgroundColor: colors.button,
      borderRadius: 12,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: colors.button,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: 10,
    },
    otpBtn: {
      backgroundColor: colors.button,
      borderRadius: 12,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: colors.button,
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
      backgroundColor: colors.navBg,
      borderRadius: 10,
      padding: 12,
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    hintText: { flex: 1, fontSize: 12, lineHeight: 18 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImage: { width: '95%', height: '70%' },
    closeHintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
    closeHint: { color: 'rgb(245, 242, 242)', fontSize: 13 },
    otpModalOverlay: {
      flex: 1,
      //backgroundColor: colors.inputBorder,
      justifyContent: 'center',
      alignItems: 'center',
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
      backgroundColor: colors.shadowColor,
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
      backgroundColor: colors.navBg,
      borderWidth: 2,
      borderColor: colors.active,
      alignItems: 'center',
      justifyContent: 'center',
    },
    otpDigit: { fontSize: 28, fontWeight: '800', color: colors.button },
    validityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF8E1',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 24,
    },
    validityText: { fontSize: 12, fontWeight: '600', color: colors.open },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.button,
      borderRadius: 12,
      paddingVertical: 14,
      width: '100%',
      shadowColor: colors.button,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
      marginBottom: 10,
    },
    shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    otpBackRow: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    otpBackBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    closeOtpBtn: {
      backgroundColor: colors.navBg,
      borderRadius: 12,
      paddingVertical: 14,
      width: '100%',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    closeOtpBtnText: { color: colors.textSec, fontWeight: '600', fontSize: 14,  },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.navBg,
      borderRadius: 10,
      padding: 12,
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    noteText: { flex: 1, fontSize: 11, lineHeight: 17 },
    verifyOtpBtn: {
      backgroundColor: colors.button,
      borderRadius: 12,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: colors.button,
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
      backgroundColor: colors.navBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    otpInputBoxFilled: {
      borderColor: colors.active,
      backgroundColor: colors.navBg,
    },
    otpInputField: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.button,
      textAlign: 'center',
      width: '100%',
      height: '100%',
      padding: 0,
    },
    verifyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.button,
      borderRadius: 12,
      paddingVertical: 14,
      width: '100%',
      shadowColor: colors.button,
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
    ackPickRow: {
      flexDirection: 'row', gap: 10, marginBottom: 12, marginTop: 10,
    },
    ackPickBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, borderRadius: 12,
      backgroundColor: colors.navBg, borderWidth: 1, borderColor: colors.inputBorder,
    },
    ackPickText: { fontSize: 13, fontWeight: '600' },
    ackPreviewWrap: {
      borderRadius: 12, overflow: 'hidden', marginBottom: 4, position: 'relative',
    },
    ackPreview: { width: '100%', height: 160, borderRadius: 12 },
    ackPreviewRemove: {
      position: 'absolute', top: 8, right: 8,
      backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12,
    },
    ackBtn: {
      backgroundColor: colors.button,
      borderRadius: 12,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: colors.button,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: 10,
    },
    ackBtnDisabled: {
      backgroundColor: '#5fa4bbbf',
      shadowOpacity: 0,
      elevation: 0,
    },
    switchMethodBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 10, paddingHorizontal: 12,
      borderRadius: 10, backgroundColor: colors.navBg,
      marginTop: 10, alignSelf: 'flex-start',
    },
    switchMethodText: { fontSize: 12, fontWeight: '600', color: colors.open },
    finishBtn: {
      backgroundColor: colors.open,
      borderRadius: 12,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: colors.open,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: 10,
    },
  });

  /* ═══════════════════════════════════════ */
  /* Reusable Info Row                       */
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
        <Text style={[s.infoValue, { color: valueColor || colors.textPri }]}>{value || t('na')}</Text>
      </View>
    );
  }

  return (
    <ScreenLayout title={t('jobDetails')} showDecor showBack padBottom={100}>

      {/* ════════════════════════════════════════ */}
      {/* Job Info Card                            */}
      {/* ════════════════════════════════════════ */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>

        {/* Title row — "Job Details" + Status badge + Source badge */}
        <View style={s.cardTitleRow}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('jobDetails')}</Text>
          <View style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <View style={[s.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <View style={[s.statusDot, { backgroundColor: statusInfo.dot }]} />
              <Text style={[s.statusBadgeText, { color: statusInfo.text }]}>
                {getStatusLabel(job.status)}
              </Text>
            </View>
            {job.source && (
              <View style={[s.statusBadge, { backgroundColor: job.source === 'WEB' ? '#E8F5E9' : '#E1F5FE' }]}>
                <Text style={[s.statusBadgeText, { color: job.source === 'WEB' ? colors.web : colors.app }]}>
                  {job.source}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Complaint header */}
        <View style={s.assetHeader}>
          <View style={s.assetHeaderInfo}>
            <Text style={[s.assetIdText, { color: colors.textPri }]}>{job.complaint_number}</Text>
            <Text style={[s.assetTypeText, { color: colors.textSec }]}>{job.asset_type}</Text>
          </View>
        </View>

        {/* Location */}
        <InfoRow icon="business-outline"  label={t('station')+ ":"}  value={job.station}  colors={colors} iconColor={colors.icon} />
        <InfoRow icon="map-outline"       label={t('area')+ ":"}     value={job.area}     colors={colors} iconColor={colors.icon} />
        <InfoRow icon="location-outline"  label={t('location')+ ":"} value={job.location} colors={colors} iconColor={colors.icon} />

        {/* Complaint Meta */}
        <InfoRow icon="calendar-outline" label={t('reportedOn') + ':'} value={
          new Date(job.created_at).toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        } colors={colors} iconColor={colors.icon} />

        <InfoRow icon="person-outline" label={t('reportedBy') + ':'} value={reporterName} colors={colors} iconColor={colors.icon} />

        {/* Contact info — always show phone if available, email only if it's a real one */}
        <InfoRow icon="call-outline" label={t('phone')+ ":"} value={job.contact_phone} colors={colors} iconColor={colors.icon} />
        {hasRealEmail && (
          <InfoRow icon="mail-outline" label={t('email') + ':'} value={job.contact_email} colors={colors} iconColor={colors.icon}/>
        )}

        {job.complaint_number && (
          <InfoRow icon="document-text-outline" label={t('complaintNo') + ':'} value={job.complaint_number} colors={colors} iconColor={colors.icon} />
        )}

        {isClosed && (
          <>
            <InfoRow icon="checkmark-done-outline" label={t('resolvedBy') + ':'} value={resolverName} colors={colors} valueColor={colors.textPri} iconColor={colors.icon} />
            <InfoRow icon="calendar-outline" label={t('resolvedOn') + ':'} value={
              new Date(job.closed_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })
            } colors={colors} valueColor={colors.textPri} iconColor={colors.icon} />
            {job.verified_at && (
              <InfoRow icon="shield-checkmark-outline" label={t('verifiedOn') + ':'} value={
                new Date(job.verified_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })
              } colors={colors} valueColor={colors.textPri} iconColor={colors.icon} />
            )}
          </>
        )}

        {/* Issue Description */}
        <View style={s.descTitleRow}>
          <Text style={[s.sectionLabel, { color: colors.textPri }]}>{t('issueDescription')}</Text>
        </View>
        <View style={s.descriptionBox}>
          <Text style={[s.description, { color: colors.textSec }]}>
            {job.description}
          </Text>
        </View>
      </View>

      {/* Photo Card */}
      {photoUrl && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>{t('photoOfIssue')}</Text>
          <TouchableOpacity onPress={() => setShowFullImage(true)} activeOpacity={0.9}>
            <View style={s.photoWrap}>
              <Image source={{ uri: photoUrl }} style={s.photo} />
              <View style={s.enlargeOverlay}>
                <Ionicons name="expand-outline" size={13} color={colors.active} />
                <Text style={{ fontSize: 12, color: colors.active, fontWeight: '500' }}> {t('tapToEnlarge')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Acknowledgement Photo Card — shown when closed via written ack */}
      {isClosed && job.ack_photo_url && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>{t('ackPhoto')}</Text>
          <View style={s.photoWrap}>
            <Image source={{ uri: getFileUrl(job.ack_photo_url) }} style={s.photo} />
          </View>
        </View>
      )}

      {/* Action Card */}
      {!isClosed && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>{t('actions')}</Text>

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
                {loading ? t('updating') : t('startWorking')}
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
                  {loading ? t('updating') : t('finishWorking')}
                </Text>
              </TouchableOpacity>

              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.active} />
                <Text style={[s.hintText, { color: colors.textSec }]}>
                  {t('finishHint')}
                </Text>
              </View>
            </>
          )}

          {/* Step 3a: OTP method — primary when complainant has a real email and fallback not chosen */}
          {job.status === 'FINISHING' && hasRealEmail && !showAckFallback && (
            <>
              <TouchableOpacity
                style={[s.verifyOtpBtn, sendingOTP && { opacity: 0.7 }]}
                onPress={handleSendOTP}
                disabled={sendingOTP}
                activeOpacity={0.85}
              >
                {sendingOTP ? (
                  <>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={s.actionBtnText}>  Sending OTP…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={20} color="#FFF" />
                    <Text style={s.actionBtnText}>{t('enterOtpToComplete')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.active} />
                <Text style={[s.hintText, { color: colors.textSec }]}>
                  An OTP will be sent to <Text style={{ fontWeight: '700' }}>{job.contact_email}</Text>. Ask the complainant to check their inbox.
                </Text>
              </View>

              {/* Fallback link */}
              <TouchableOpacity
                style={s.switchMethodBtn}
                onPress={() => setShowAckFallback(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="camera-outline" size={14} color={colors.open} />
                <Text style={s.switchMethodText}>OTP not working? Close with photo instead</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3b: Ack photo — for no-email complaints OR when OTP fallback is chosen */}
          {job.status === 'FINISHING' && (!hasRealEmail || showAckFallback) && (
            <>
              {/* Switch-back link when in fallback mode */}
              {showAckFallback && (
                <TouchableOpacity
                  style={[s.switchMethodBtn, { marginBottom: 10 }]}
                  onPress={() => { setShowAckFallback(false); setAckPhoto(null); }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="mail-outline" size={14} color={colors.active} />
                  <Text style={[s.switchMethodText, { color: colors.active }]}>Switch back to OTP</Text>
                </TouchableOpacity>
              )}

              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.active} />
                <Text style={[s.hintText, { color: colors.textSec }]}>
                  Take a photo of the signed acknowledgement from the complainant to close this complaint.
                </Text>
              </View>

              {/* Photo preview */}
              {ackPhoto && (
                <TouchableOpacity onPress={() => setAckPhoto(null)} activeOpacity={0.85} style={s.ackPreviewWrap}>
                  <Image source={{ uri: ackPhoto.uri }} style={s.ackPreview} />
                  <View style={s.ackPreviewRemove}>
                    <Ionicons name="close-circle" size={22} color="#E53935" />
                  </View>
                </TouchableOpacity>
              )}

              {/* Camera / Gallery buttons */}
              <View style={s.ackPickRow}>
                <TouchableOpacity style={s.ackPickBtn} onPress={takeAckPhoto} activeOpacity={0.85}>
                  <Ionicons name="camera-outline" size={18} color={colors.active} />
                  <Text style={[s.ackPickText, { color: colors.active }]}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.ackPickBtn} onPress={pickAckPhoto} activeOpacity={0.85}>
                  <Ionicons name="images-outline" size={18} color={colors.active} />
                  <Text style={[s.ackPickText, { color: colors.active }]}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Submit button — only active when photo selected */}
              <TouchableOpacity
                style={[s.ackBtn, (!ackPhoto || ackLoading) && s.ackBtnDisabled]}
                onPress={submitAck}
                disabled={!ackPhoto || ackLoading}
                activeOpacity={0.85}
              >
                {ackLoading ? (
                  <>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={s.actionBtnText}>  Uploading…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                    <Text style={s.actionBtnText}>Close Complaint</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Full Image Modal */}
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
            <Text style={s.closeHint}> {t('tapToClose')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* OTP Modal */}
      <Modal
        visible={showVerifyOTPModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVerifyOTPModal(false)}
      >
          <View style={s.otpModalOverlay}>
            <View style={[s.otpModalContent, { backgroundColor: colors.cardBg }]}>

              {/* Back button row */}
              <View style={s.otpBackRow}>
                <TouchableOpacity
                  style={[s.otpBackBtn, { backgroundColor: colors.navBg }]}
                  onPress={() => {
                    setShowVerifyOTPModal(false);
                    setEnteredOTP(['', '', '', '', '', '']);
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.textPri} />
                </TouchableOpacity>
              </View>

              <View style={s.otpHandle} />

              <View style={s.otpIconWrap}>
                <Ionicons name="shield-checkmark" size={35} color={colors.button} />
              </View>

              <Text style={[s.otpTitle, { color: colors.textPri }]}>{t('enterCompletionOtp')}</Text>
              <Text style={[s.otpSubtitle, { color: colors.textSec }]}>
                {t('otpSubtitle')}
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
                    <Text style={s.verifyButtonText}>  {t('verifying')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                    <Text style={s.verifyButtonText}>  {t('verifyAndClose')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 8, width: '100%', marginBottom: 10 }}>
                <TouchableOpacity
                  style={[s.closeOtpBtn, { flex: 1, marginBottom: 0 }]}
                  onPress={() => {
                    setShowVerifyOTPModal(false);
                    setEnteredOTP(['', '', '', '', '', '']);
                  }}
                >
                  <Text style={s.closeOtpBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.closeOtpBtn, { flex: 1, marginBottom: 0, backgroundColor: colors.navBg }]}
                  onPress={async () => {
                    setEnteredOTP(['', '', '', '', '', '']);
                    try {
                      const jobId = job.id || job._id;
                      await complaintsAPI.sendOTP(jobId);
                      Alert.alert('OTP Resent', `A new OTP has been sent to ${job.contact_email}`);
                    } catch (e) {
                      Alert.alert(t('error'), e.response?.data?.message || 'Failed to resend OTP.');
                    }
                  }}
                >
                  <Text style={[s.closeOtpBtnText, { color: colors.active }]}>Resend OTP</Text>
                </TouchableOpacity>
              </View>

              {/* Fallback: switch to photo from inside the modal */}
              <TouchableOpacity
                style={[s.closeOtpBtn, { width: '100%', marginBottom: 10, backgroundColor: colors.navBg, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}
                onPress={() => {
                  setShowVerifyOTPModal(false);
                  setEnteredOTP(['', '', '', '', '', '']);
                  setShowAckFallback(true);
                }}
              >
                <Ionicons name="camera-outline" size={15} color={colors.open} />
                <Text style={[s.closeOtpBtnText, { color: colors.open }]}>Use Photo Instead</Text>
              </TouchableOpacity>

              <View style={s.noteRow}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textMut} />
                <Text style={[s.noteText, { color: colors.textMut }]}>
                  {t('otpNote')}
                </Text>
              </View>
            </View>
          </View>
      </Modal>
    </ScreenLayout>
  );
}