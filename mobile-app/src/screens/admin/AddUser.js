import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usersAPI, uploadAPI, authAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

export default function AddUser({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('USER');
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Photo upload states
  const [photoUri, setPhotoUri] = useState(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  // Email verification states
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [needsManualVerification, setNeedsManualVerification] = useState(false);

  // Designation picker state
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [existingDesignations, setExistingDesignations] = useState([]);
  const [isAddingCustomDesignation, setIsAddingCustomDesignation] = useState(false);
  const [customDesignation, setCustomDesignation] = useState('');

  useEffect(() => {
    fetchDesignations();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
      Alert.alert(
        t('permissionsRequired'),
        t('cameraPermissionMsg'),
      );
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await usersAPI.getDesignations();
      if (response.data.success) {
        setExistingDesignations(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      setExistingDesignations(['HELPER', 'SR.STAFF']);
    }
  };

  const handleAddCustomDesignation = () => {
    const trimmed = customDesignation.trim().toUpperCase();
    if (!trimmed) { 
      Alert.alert(t('error'), t('enterDesignation')); 
      return; 
    }
    if (trimmed.length < 2) { 
      Alert.alert(t('error'), t('designationMin')); 
      return; 
    }
    if (existingDesignations.includes(trimmed)) {
      setDesignation(trimmed);
      setCustomDesignation('');
      setIsAddingCustomDesignation(false);
      setShowDesignationModal(false);
      return;
    }
    setExistingDesignations(prev => [...prev, trimmed].sort());
    setDesignation(trimmed);
    setCustomDesignation('');
    setIsAddingCustomDesignation(false);
    setShowDesignationModal(false);
  };

  const handlePhotoOptionPress = (option) => {
    setShowPhotoOptions(false);
    if (option === 'camera') {
      handleTakePhoto();
    } else {
      handlePickPhoto();
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        await handleUploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(t('error'), t('photoUploadFailed'));
    }
  };

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        await handleUploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Photo picker error:', error);
      Alert.alert(t('error'), t('photoUploadFailed'));
    }
  };

  const handleUploadPhoto = async (uri) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri,
        type: 'image/jpeg',
        name: `user_photo_${Date.now()}.jpg`,
      });

      const response = await uploadAPI.uploadPhoto(formData);
      if (response.data.success) {
        setUploadedPhotoUrl(response.data.data.url);
        Alert.alert(t('success'), t('photoUploaded'));
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert(t('error'), t('photoUploadFailed'));
      setPhotoUri(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const autoVerifyEmail = async (emailToVerify) => {
    try {
      const testPayload = {
        email: emailToVerify,
        password: 'temp123',
        full_name: fullName.trim() || 'Test',
        role,
        phone: '9999999999',
        employee_id: role === 'STAFF' ? (employeeId || 'TEMP') : null,
      };

      const response = await usersAPI.create(testPayload);
      
      setIsEmailVerified(true);
      setNeedsManualVerification(false);
      
    } catch (error) {
      if (error.response?.data?.requiresManualVerification) {
        setNeedsManualVerification(true);
        setIsEmailVerified(false);
        Alert.alert(
          t('emailVerificationRequired'),
          t('cameraPermissionMsg'),
        );
      } else if (error.response?.data?.message?.includes('already registered')) {
        Alert.alert(t('error'), t('emailAlreadyExists'));
        setIsEmailVerified(false);
      } else {
        setIsEmailVerified(true);
        setNeedsManualVerification(false);
      }
    }
  };

  const handleEmailBlur = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (email.trim() && emailRegex.test(email.trim())) {
      autoVerifyEmail(email.trim());
    }
  };

  const handleSendVerificationCode = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('error'), t('enterFullName'));
      return;
    }

    setSendingCode(true);
    try {
      const response = await authAPI.sendVerificationCode(email.trim(), fullName.trim());
      if (response.data.success) {
        setShowVerification(true);
        Alert.alert(
          t('codeSent'),
          t('codeSentMsg'),
        );
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToSendCode'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert(t('error'), t('enterVerificationCode'));
      return;
    }

    setVerifyingCode(true);
    try {
      const response = await authAPI.verifyEmailCode(email.trim(), verificationCode);
      if (response.data.success) {
        setIsEmailVerified(true);
        setNeedsManualVerification(false);
        setShowVerification(false);
        Alert.alert(t('success'), t('emailVerified'));
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('verificationFailed'));
    } finally {
      setVerifyingCode(false);
    }
  };

  const validateForm = () => {
    if (!fullName.trim()) { 
      Alert.alert(t('error'), t('enterFullName')); 
      return false; 
    }
    
    if (!email.trim()) { 
      Alert.alert(t('error'), t('enterEmail')); 
      return false; 
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) { 
      Alert.alert(t('invalidEmail'), t('enterValidEmail')); 
      return false; 
    }

    if (!isEmailVerified) {
      Alert.alert(
        t('emailNotVerified'),
        needsManualVerification 
          ? t('cameraPermissionMsg')
          : t('verifyEmailFirst'),
      );
      return false;
    }

    if (!password || password.length < 6) { 
      Alert.alert(t('error'), t('passwordMin')); 
      return false; 
    }

    if (!phone.trim()) { 
      Alert.alert(t('error'), t('enterPhone')); 
      return false; 
    }
    
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      Alert.alert(t('error'), t('phoneMustBe10'));
      return false;
    }
    if (!/^[6-9]/.test(phoneDigits)) {
      Alert.alert(t('error'), t('invalidPhoneStart'));
      return false;
    }

    if (role === 'STAFF') {
      if (!employeeId.trim()) { 
        Alert.alert(t('error'), t('employeeIdRequired')); 
        return false; 
      }
      if (!uploadedPhotoUrl) {
        Alert.alert(t('photoRequiredTitle'), t('photoRequired'));
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await usersAPI.create({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        phone: phone.replace(/\D/g, ''),
        designation: role === 'STAFF' ? (designation || null) : null,
        employee_id: role === 'STAFF' ? employeeId.trim() : null,
        photo_url: uploadedPhotoUrl || '',
      });

      if (response.data.success) {
        Alert.alert(t('userCreated'), response.data.message, [
          { text: t('ok'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToCreateUser'));
    } finally {
      setLoading(false);
    }
  };

  function RoleDropdown({ selected, onSelect, colors, t }) {
    const [visible, setVisible] = useState(false);

    const ROLES = [
      { key: 'USER', label: t('user'), icon: 'person-outline', color: colors.active },
      { key: 'STAFF', label: t('staff'), icon: 'build-outline', color: colors.active },
      { key: 'ADMIN', label: t('admin'), icon: 'star-outline', color: colors.admin },
    ];

    const selectedOption = ROLES.find(o => o.key === selected);

    return (
      <>
        <TouchableOpacity
          style={[s.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          onPress={() => setVisible(true)}
          activeOpacity={0.8}
        >
          {selectedOption && (
            <View style={[s.dropdownIcon, { backgroundColor: `${selectedOption.color}15` }]}>
              <Ionicons name={selectedOption.icon} size={20} color={selectedOption.color} />
            </View>
          )}
          <Text style={[s.dropdownText, { color: colors.textPri }]}>
            {selectedOption?.label || t('select')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMut} />
        </TouchableOpacity>

        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <TouchableOpacity style={s.roleModalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
            <View style={[s.roleModalContent, { backgroundColor: colors.cardBg }]}>
              <Text style={[s.roleModalTitle, { color: colors.textPri }]}>{t('selectRole')}</Text>
              {ROLES.map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    s.roleOption,
                    selected === option.key && { backgroundColor: `${option.color}10`, borderColor: option.color },
                    { borderColor: colors.divider },
                  ]}
                  onPress={() => { onSelect(option.key); setVisible(false); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.roleOptionIcon, { backgroundColor: `${option.color}15` }]}>
                    <Ionicons name={option.icon} size={22} color={option.color} />
                  </View>
                  <Text style={[
                    s.roleOptionText,
                    { color: colors.textPri },
                    selected === option.key && { color: option.color, fontWeight: '700' },
                  ]}>
                    {option.label}
                  </Text>
                  {selected === option.key && (
                    <Ionicons name="checkmark-circle" size={22} color={option.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  const s = StyleSheet.create({
    card: {
      borderRadius: 16, padding: 18, marginBottom: 14,
      shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12, shadowRadius: 8, elevation: 3
    },
    cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
    fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center', borderRadius: 10,
      paddingHorizontal: 14, marginBottom: 12, borderWidth: 1
    },
    input: { flex: 1, fontSize: 14, paddingVertical: 12 },
    photoHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 12
    },
    requiredBadge: {
      fontSize: 11, fontWeight: '600', color:colors.staffUnavailable,
      backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 8,
    },
    photoSection: { alignItems: 'center' },
    photoPlaceholder: {
      width: 140, height: 140, borderRadius: 70, borderWidth: 2,
      borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    },
    photoPlaceholderText: { fontSize: 12, marginTop: 8, fontWeight: '500' },
    photoPlaceholderSubtext: { fontSize: 11, marginTop: 2 },
    photoPreviewContainer: { position: 'relative', alignSelf: 'center' },
    photoPreview: { width: 140, height: 140, borderRadius: 70 },
    uploadingOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 70,
      justifyContent: 'center', alignItems: 'center',
    },
    uploadingText: { color: colors.white, fontSize: 12, marginTop: 8 },
    photoRemoveBtn: {
      position: 'absolute', top: -8, right: -8,
      backgroundColor: colors.white, borderRadius: 16, shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
    },
    photoModalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center',
      alignItems: 'center', padding: 20,
    },
    photoOptionsContent: {
      width: '100%', maxWidth: 360, backgroundColor: colors.cardBg,
      borderRadius: 20, padding: 20, elevation: 10,
    },
    photoModalTitle: {
      fontSize: 18, fontWeight: '800', textAlign: 'center',
      marginBottom: 20, color: colors.textPri
    },
    photoOptionBtn: {
      flexDirection: 'row', alignItems: 'center', padding: 16,
      borderRadius: 12, marginBottom: 12, backgroundColor: colors.inputBg,
      borderWidth: 1, borderColor: colors.inputBorder,
    },
    photoOptionIcon: {
      width: 52, height: 52, borderRadius: 14, alignItems: 'center',
      justifyContent: 'center', marginRight: 14,
    },
    photoOptionLabel: { fontSize: 15, fontWeight: '700', color: colors.textPri },
    photoOptionDesc: { fontSize: 12, color: colors.textSec, marginTop: 2 },
    photoCancelBtn: {
      marginTop: 8, paddingVertical: 14, borderRadius: 12,
      backgroundColor: colors.inputBg, alignItems: 'center',
    },
    photoCancelText: { fontSize: 15, fontWeight: '600', color: colors.textSec },
    verificationBox: {
      backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12,
      marginBottom: 12, borderWidth: 1, borderColor: '#2196F3',
    },
    verificationTitle: {
      fontSize: 13, fontWeight: '700', color: '#1565C0', marginBottom: 8
    },
    verifyButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 10,
    },
    verifyButtonDisabled: { backgroundColor: '#90CAF9' },
    verifyButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    verifyCodeButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 10, marginTop: 10,
    },
    verifyCodeButtonDisabled: { backgroundColor: '#A5D6A7' },
    verifyCodeButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    phoneHint: {
      fontSize: 11, color: '#FF9800', marginTop: -8, marginBottom: 10, marginLeft: 4
    },
    phoneError: {
      fontSize: 11, color: '#F44336', marginTop: -8, marginBottom: 10, marginLeft: 4
    },
    strengthRow: {
      flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 12,
      paddingHorizontal: 4
    },
    strengthBar: {
      width: 80, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2,
      marginRight: 8, overflow: 'hidden'
    },
    strengthFill: { height: '100%', borderRadius: 2 },
    dropdown: {
      flexDirection: 'row', alignItems: 'center', borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, marginBottom: 12
    },
    dropdownIcon: {
      width: 36, height: 36, borderRadius: 10, alignItems: 'center',
      justifyContent: 'center', marginRight: 12
    },
    dropdownText: { flex: 1, fontSize: 14, fontWeight: '500' },
    roleModalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center',
      alignItems: 'center', padding: 20
    },
    roleModalContent: {
      width: '100%', maxWidth: 340, borderRadius: 20, padding: 20, elevation: 10
    },
    roleModalTitle: {
      fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16
    },
    roleOption: {
      flexDirection: 'row', alignItems: 'center', padding: 14,
      borderRadius: 12, borderWidth: 2, marginBottom: 10
    },
    roleOptionIcon: {
      width: 44, height: 44, borderRadius: 12, alignItems: 'center',
      justifyContent: 'center', marginRight: 12
    },
    roleOptionText: { flex: 1, fontSize: 15 },
    desigSelector: {
      flexDirection: 'row', alignItems: 'center', borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, marginBottom: 12, gap: 10
    },
    desigSelectorText: { flex: 1, fontSize: 14 },
    desigModalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'
    },
    desigModalContent: {
      backgroundColor: colors.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12, maxHeight: '70%'
    },
    desigModalHandle: {
      width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
      alignSelf: 'center', marginBottom: 16
    },
    desigModalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPri },
    desigDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },
    desigOption: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
      paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, gap: 12
    },
    desigOptionActive: { backgroundColor: '#F0F8FF' },
    desigOptionIcon: {
      width: 36, height: 36, borderRadius: 10, alignItems: 'center',
      justifyContent: 'center'
    },
    desigOptionLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.textPri },
    addDesigBtn: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
      paddingHorizontal: 12, borderRadius: 12, gap: 12,
    },
    addDesigIcon: {
      width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },
    addDesigText: { fontSize: 15, fontWeight: '600' },
    customDesigWrap: { marginBottom: 8 },
    customDesigLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
    customDesigInputRow: { marginBottom: 6 },
    customDesigInput: {
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 14, borderWidth: 1.5,
    },
    customDesigPreview: { fontSize: 11, marginBottom: 10, marginLeft: 4 },
    customDesigActions: { flexDirection: 'row', gap: 8 },
    customDesigCancelBtn: {
      flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    },
    customDesigCancelText: { fontWeight: '600', fontSize: 13 },
    customDesigAddBtn: {
      flex: 1.5, borderRadius: 10, paddingVertical: 12,
      alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    },
    customDesigAddBtnDisabled: { opacity: 0.5 },
    customDesigAddText: { fontWeight: '700', fontSize: 13 },
    desigCloseBtn: {
      marginTop: 12, paddingVertical: 14, borderRadius: 12,
      backgroundColor: colors.pageBg, alignItems: 'center'
    },
    desigCloseBtnText: { fontSize: 15, fontWeight: '600', color: colors.textSec },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.button, borderRadius: 12, paddingVertical: 16, marginTop: 10,
      shadowColor: colors.button, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35, shadowRadius: 8, elevation: 6, marginBottom: 62,
    },
    submitBtnDisabled: { backgroundColor: colors.inactive },
    submitBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  });

  return (
    <ScreenLayout title={t('addUser')} showBack showDecor scroll={true}>
      {/* Role */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('selectRole')}</Text>
        <RoleDropdown selected={role} onSelect={setRole} colors={colors} t={t} />
      </View>

      {/* Photo Upload */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <View style={s.photoHeader}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>
            {t('photo')} {role === 'STAFF' && <Text style={{ color: colors.staffUnavailable }}>*</Text>}
          </Text>
          {role === 'STAFF' && (
            <Text style={s.requiredBadge}>{t('requiredForStaff')}</Text>
          )}
        </View>

        <View style={s.photoSection}>
          {photoUri ? (
            <View style={s.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={s.photoPreview} />
              {uploadingPhoto && (
                <View style={s.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={s.uploadingText}>{t('uploading')}</Text>
                </View>
              )}
              <TouchableOpacity
                style={s.photoRemoveBtn}
                onPress={() => {
                  setPhotoUri(null);
                  setUploadedPhotoUrl('');
                }}
              >
                <Ionicons name="close-circle" size={32} color="#F44336" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.photoPlaceholder, { borderColor: colors.inputBorder }]}
              onPress={() => setShowPhotoOptions(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={40} color={colors.textMut} />
              <Text style={[s.photoPlaceholderText, { color: colors.textMut }]}>
                {t('tapToAddPhoto')}
              </Text>
              <Text style={[s.photoPlaceholderSubtext, { color: colors.textMut }]}>
                {t('cameraOrGallery')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Basic Info */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('basicInformation')}</Text>

        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="person-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
          <TextInput 
            style={[s.input, { color: colors.textPri }]} 
            placeholder={t('fullNameLabel')} 
            placeholderTextColor={colors.textMut} 
            value={fullName} 
            onChangeText={setFullName} 
          />
        </View>

        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="mail-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
          <TextInput 
            style={[s.input, { color: colors.textPri }]} 
            placeholder={t('emailLabel')} 
            placeholderTextColor={colors.textMut} 
            value={email} 
            onChangeText={setEmail} 
            onBlur={handleEmailBlur}
            keyboardType="email-address" 
            autoCapitalize="none" 
          />
          {isEmailVerified && !needsManualVerification && (
            <Ionicons name="checkmark-circle" size={22} color="#4CAF50" style={{ marginRight: 8 }} />
          )}
        </View>

        {/* Manual verification if needed */}
        {needsManualVerification && !isEmailVerified && (
          <View style={s.verificationBox}>
            <Text style={s.verificationTitle}>{t('emailVerificationRequired')}</Text>
            {!showVerification ? (
              <TouchableOpacity
                style={[s.verifyButton, sendingCode && s.verifyButtonDisabled]}
                onPress={handleSendVerificationCode}
                disabled={sendingCode}
              >
                {sendingCode ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={s.verifyButtonText}>  {t('sending')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={16} color="#fff" />
                    <Text style={s.verifyButtonText}>  {t('sendVerificationCode')}</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <View style={[s.inputWrap, { backgroundColor: '#fff', borderColor: '#2196F3', marginTop: 10 }]}>
                  <Ionicons name="key-outline" size={18} color="#2196F3" style={{ marginRight: 10 }} />
                  <TextInput
                    style={[s.input, { color: colors.textPri }]}
                    placeholder={t('enterCode')}
                    placeholderTextColor={colors.textMut}
                    value={verificationCode}
                    onChangeText={(text) => {
                      const digits = text.replace(/\D/g, '');
                      if (digits.length <= 6) setVerificationCode(digits);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity
                  style={[s.verifyCodeButton, verifyingCode && s.verifyCodeButtonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={verifyingCode || verificationCode.length !== 6}
                >
                  {verifyingCode ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={s.verifyCodeButtonText}>  {t('verifying')}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
                      <Text style={s.verifyCodeButtonText}>  {t('verifyCode')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
          <TextInput 
            style={[s.input, { color: colors.textPri }]} 
            placeholder={t('password')} 
            placeholderTextColor={colors.textMut} 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry={!showPassword} 
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMut} />
          </TouchableOpacity>
        </View>

        {password.length > 0 && (
          <View style={s.strengthRow}>
            <View style={s.strengthBar}>
              <View style={[s.strengthFill, {
                width: password.length < 6 ? '30%' : (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? '60%' : '100%',
                backgroundColor: password.length < 6 ? '#ef4444' : (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? '#f59e0b' : '#22c55e',
              }]} />
            </View>
            <Text style={{
              fontSize: 11, fontWeight: '500',
              color: password.length < 6 ? '#ef4444' : (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? '#f59e0b' : '#22c55e',
            }}>
              {password.length < 6 ? t('tooShort') : (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? t('addLetterNumber') : t('strong')}
            </Text>
          </View>
        )}

        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="call-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
          <TextInput 
            style={[s.input, { color: colors.textPri }]} 
            placeholder={t('phoneNumber')} 
            placeholderTextColor={colors.textMut} 
            value={phone} 
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '');
              if (digits.length <= 10) setPhone(digits);
            }}
            keyboardType="phone-pad" 
            maxLength={10}
          />
          {phone.length > 0 && (
            <Ionicons 
              name={phone.length === 10 && /^[6-9]/.test(phone) ? 'checkmark-circle' : 'alert-circle'} 
              size={18} 
              color={phone.length === 10 && /^[6-9]/.test(phone) ? '#4CAF50' : '#FF9800'} 
              style={{ marginRight: 8 }}
            />
          )}
        </View>

        {phone.length > 0 && phone.length < 10 && (
          <Text style={s.phoneHint}>{phone.length}/10 {t('digitsCount')}</Text>
        )}
        {phone.length === 10 && !/^[6-9]/.test(phone) && (
          <Text style={s.phoneError}>{t('invalidPhoneStart')}</Text>
        )}
      </View>

      {/* Staff Details */}
      {role === 'STAFF' && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('staffDetails')}</Text>

          <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Ionicons name="card-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
            <TextInput 
              style={[s.input, { color: colors.textPri }]} 
              placeholder={t('employeeIdInput')} 
              placeholderTextColor={colors.textMut} 
              value={employeeId} 
              onChangeText={setEmployeeId} 
            />
          </View>

          <Text style={[s.fieldLabel, { color: colors.textSec }]}>{t('designationLabel')}</Text>
          <TouchableOpacity
            style={[s.desigSelector, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setShowDesignationModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="briefcase-outline" size={18} color={designation ? colors.active : colors.textMut} />
            <Text style={[s.desigSelectorText, { color: designation ? colors.textPri : colors.textMut }]}>
              {designation || t('selectDesignation')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMut} />
          </TouchableOpacity>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[s.submitBtn, loading && s.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={s.submitBtnText}>  {t('creating')}</Text>
          </View>
        ) : (
          <>
            <Ionicons name="person-add-outline" size={20} color="#fff" />
            <Text style={s.submitBtnText}>
              {role === 'STAFF' ? t('createStaff') : role === 'ADMIN' ? t('createAdmin') : t('createUser')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Designation Modal */}
      <Modal
        visible={showDesignationModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDesignationModal(false);
          setIsAddingCustomDesignation(false);
          setCustomDesignation('');
        }}
      >
        <TouchableOpacity
          style={s.desigModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDesignationModal(false);
            setIsAddingCustomDesignation(false);
            setCustomDesignation('');
          }}
        >
          <View style={s.desigModalContent} onStartShouldSetResponder={() => true}>
            <View style={s.desigModalHandle} />
            <Text style={s.desigModalTitle}>{t('selectDesignationTitle')}</Text>

            <FlatList
              data={existingDesignations}
              keyExtractor={(item) => item}
              style={{ maxHeight: 220 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.desigOption, designation === item && s.desigOptionActive]}
                  onPress={() => {
                    setDesignation(item);
                    setShowDesignationModal(false);
                  }}
                >
                  <View style={[
                    s.desigOptionIcon,
                    { backgroundColor: designation === item ? `${colors.active}15` : colors.pageBg },
                  ]}>
                    <Ionicons name="briefcase-outline" size={18} color={designation === item ? colors.active : colors.textMut} />
                  </View>
                  <Text style={[s.desigOptionLabel, designation === item && { fontWeight: '700', color: colors.active }]}>
                    {item}
                  </Text>
                  {designation === item && <Ionicons name="checkmark-circle" size={20} color={colors.active} />}
                </TouchableOpacity>
              )}
            />

            <View style={s.desigDivider} />

            {!isAddingCustomDesignation ? (
              <TouchableOpacity
                style={s.addDesigBtn}
                onPress={() => setIsAddingCustomDesignation(true)}
                activeOpacity={0.8}
              >
                <View style={[s.addDesigIcon, { backgroundColor: `${colors.active}15` }]}>
                  <Ionicons name="add" size={20} color={colors.active} />
                </View>
                <Text style={[s.addDesigText, { color: colors.textPri }]}>{t('addNewDesignation')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.customDesigWrap}>
                <Text style={[s.customDesigLabel, { color: colors.textSec }]}>{t('newDesignation')}</Text>
                <View style={s.customDesigInputRow}>
                  <TextInput
                    style={[s.customDesigInput, {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.active,
                      color: colors.textPri,
                    }]}
                    value={customDesignation}
                    onChangeText={setCustomDesignation}
                    placeholder={t('designationPlaceholder')}
                    placeholderTextColor={colors.textMut}
                    autoCapitalize="characters"
                    autoFocus
                  />
                </View>
                {customDesignation.trim() && (
                  <Text style={[s.customDesigPreview, { color: colors.textMut }]}>
                    {t('willBeSavedAs')} {customDesignation.trim().toUpperCase()}
                  </Text>
                )}
                <View style={s.customDesigActions}>
                  <TouchableOpacity
                    style={[s.customDesigCancelBtn, { backgroundColor: colors.pageBg }]}
                    onPress={() => { setIsAddingCustomDesignation(false); setCustomDesignation(''); }}
                  >
                    <Text style={[s.customDesigCancelText, { color: colors.textSec }]}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.customDesigAddBtn, { backgroundColor: colors.button }, !customDesignation.trim() && s.customDesigAddBtnDisabled]}
                    onPress={handleAddCustomDesignation}
                    disabled={!customDesignation.trim()}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                    <Text style={[s.customDesigAddText, { color: colors.white }]}> {t('addAndSelect')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={s.desigCloseBtn}
              onPress={() => { setShowDesignationModal(false); setIsAddingCustomDesignation(false); setCustomDesignation(''); }}
            >
              <Text style={s.desigCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Photo Options Modal */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <TouchableOpacity
          style={s.photoModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoOptions(false)}
        >
          <View style={s.photoOptionsContent} onStartShouldSetResponder={() => true}>
            <Text style={s.photoModalTitle}>{t('choosePhotoSource')}</Text>
            
            <TouchableOpacity
              style={s.photoOptionBtn}
              onPress={() => handlePhotoOptionPress('camera')}
              activeOpacity={0.8}
            >
              <View style={[s.photoOptionIcon, { backgroundColor: colors.shadowColor }]}>
                <Ionicons name="camera-outline" size={28} color={colors.button} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.photoOptionLabel}>{t('takePhoto')}</Text>
                <Text style={s.photoOptionDesc}>{t('useCamera')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMut} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.photoOptionBtn}
              onPress={() => handlePhotoOptionPress('gallery')}
              activeOpacity={0.8}
            >
              <View style={[s.photoOptionIcon, { backgroundColor: colors.shadowColor }]}>
                <Ionicons name="images-outline" size={28} color={colors.button} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.photoOptionLabel}>{t('chooseFromGallery')}</Text>
                <Text style={s.photoOptionDesc}>{t('selectFromLibrary')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMut} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.photoCancelBtn}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={s.photoCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}
