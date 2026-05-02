import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { authAPI, uploadAPI, saveToken, saveUserData } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function SignupScreen({ navigation }) {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('USER');
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { signIn } = useAuth();

  const ROLES = [
    { key: 'USER', label: t('user'), icon: 'person-outline', color: '#2196F3', desc: t('reportIssuesDesc') },
    { key: 'STAFF', label: t('staff'), icon: 'build-outline', color: '#5BA8D4', desc: t('fixIssuesDesc') },
  ];

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
  const [countdown, setCountdown] = useState(0);

  // Role selection modal
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [empIdFocused, setEmpIdFocused] = useState(false);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  React.useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
      Alert.alert(t('permissionsRequired'), t('cameraPermissionMsg'));
    }
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
        name: `profile_${Date.now()}.jpg`,
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

  const validateEmail = () => {
    if (!email.trim()) {
      Alert.alert(t('error'), t('enterEmail'));
      return false;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('invalidEmail'), t('enterValidEmail'));
      return false;
    }
    return true;
  };

  const handleSendVerificationCode = async () => {
    if (!validateEmail()) return;

    if (!fullName.trim()) {
      Alert.alert(t('error'), t('enterFullName'));
      return;
    }

    setSendingCode(true);
    try {
      const response = await authAPI.sendVerificationCode(email.trim(), fullName.trim());
      if (response.data.success) {
        setShowVerification(true);
        setCountdown(60);
        Alert.alert(t('codeSent'), t('codeSentMsg'));
      }
    } catch (error) {
      if (error.message.includes('already registered')) {
        Alert.alert(
          t('emailExists'),
          error.message,
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('goToLogin'), onPress: () => navigation.navigate('Login') },
          ]
        );
      } else {
        Alert.alert(t('error'), error.message || t('failedToSendCode'));
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert(t('error'), t('enterCode6'));
      return;
    }

    setVerifyingCode(true);
    try {
      const response = await authAPI.verifyEmailCode(email.trim(), verificationCode);
      if (response.data.success) {
        setIsEmailVerified(true);
        setShowVerification(false);
        Alert.alert(`${t('success')} ✅`, t('emailVerified'));
      }
    } catch (error) {
      if (error.response?.data?.attemptsLeft !== undefined) {
        Alert.alert(t('invalidCode'), error.message);
      } else {
        Alert.alert(t('error'), error.message || t('verificationFailed'));
      }
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSignup = async () => {
    if (!isEmailVerified) {
      Alert.alert(t('emailNotVerified'), t('verifyEmailFirst'));
      return;
    }

    if (!fullName.trim()) {
      Alert.alert(t('error'), t('enterFullName'));
      return;
    }
    if (fullName.trim().length < 2) {
      Alert.alert(t('error'), t('nameMin'));
      return;
    }

    if (!validateEmail()) return;

    if (!password) {
      Alert.alert(t('error'), t('passwordRequired'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error'), t('passwordMin'));
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      Alert.alert(t('weakPassword'), t('passwordRules'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return;
    }

    if (phone) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        Alert.alert(t('invalidPhone'), t('phoneDigits'));
        return;
      }
      if (!/^[6-9]/.test(phoneDigits)) {
        Alert.alert(t('invalidPhone'), t('phoneStart'));
        return;
      }
    }

    if (role === 'STAFF') {
      if (!employeeId.trim()) {
        Alert.alert(t('error'), t('employeeIdRequiredSignup'));
        return;
      }
      if (!uploadedPhotoUrl) {
        Alert.alert(t('photoRequiredTitle'), t('photoRequired'));
        return;
      }
    }

    setLoading(true);
    try {
      const response = await authAPI.signup(
        email.trim(),
        password,
        fullName.trim(),
        phone.replace(/\D/g, ''),
        role,
        role === 'STAFF' ? employeeId.trim() : null,
        uploadedPhotoUrl
      );

      if (response.data.success) {
        const { token, user } = response.data.data;
        await saveToken(token);
        await saveUserData(user);

        Alert.alert(
          t('accountCreated'),
          `${t('welcome')} Scan2Fix!`,
          [
            {
              text: t('ok'),
              onPress: async () => {
                await signIn(email.trim(), password);
              },
            },
          ]
        );
      }
    } catch (error) {
      if (error.message.includes('verify your email')) {
        Alert.alert(t('verificationRequired'), t('verifyEmailFirst'));
        setShowVerification(true);
      } else {
        Alert.alert(t('signupFailed'), error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find(r => r.key === role);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Fixed header — shapes + logo + welcome never scroll */}
      <View style={styles.fixedHeader}>
        <View style={styles.topDecoration}>
          <View style={styles.shapeBack}>
            <LinearGradient
              colors={['#004e68', '#004e68']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shapeGradient}
            />
          </View>
          <View style={styles.shapeFront}>
            <LinearGradient
              colors={['#8CD6F7', '#8CD6F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shapeGradient}
            />
          </View>
        </View>
        <View style={styles.logoSection}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>Scan</Text>
            <Text style={styles.logoText2}>2Fix</Text>
          </View>
        </View>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>{t('createAccount')}</Text>
          <Text style={styles.welcomeSubtitle}>
            {t('joinScan2Fix')} {role === 'STAFF' ? t('fixIssues') : t('reportIssues')}
          </Text>
        </View>
      </View>

      {/* Scrollable form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form */}
          <View style={styles.formSection}>
            {/* Role Selection */}
            <Text style={styles.sectionLabel}>{t('selectRolePrompt')}</Text>
            <TouchableOpacity
              style={styles.roleSelector}
              onPress={() => setShowRoleModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.roleSelectorIcon, { backgroundColor: `${selectedRole.color}15` }]}>
                <Ionicons name={selectedRole.icon} size={22} color={selectedRole.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleSelectorLabel}>{selectedRole.label}</Text>
                <Text style={styles.roleSelectorDesc}>{selectedRole.desc}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>

            {/* Photo Upload — STAFF only */}
            {role === 'STAFF' && (
              <View style={styles.photoSection}>
                <View style={styles.photoHeader}>
                  <Text style={styles.sectionLabel}>
                    {t('profilePhoto')} <Text style={{ color: '#F44336' }}>*</Text>
                  </Text>
                  <Text style={styles.requiredBadge}>{t('requiredForStaff')}</Text>
                </View>

                {photoUri ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    {uploadingPhoto && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.uploadingText}>{t('uploading')}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
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
                    style={styles.photoPlaceholder}
                    onPress={() => setShowPhotoOptions(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={40} color="#9ca3af" />
                    <Text style={styles.photoPlaceholderText}>{t('tapToAddPhoto')}</Text>
                    <Text style={styles.photoPlaceholderSubtext}>{t('cameraOrGallery')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Full Name */}
            <View style={[styles.inputContainer, nameFocused && styles.inputContainerFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="person-outline" size={20} color={nameFocused ? '#38bdf8' : '#9ca3af'} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('fullName')}
                placeholderTextColor="#9ca3af"
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            {/* Employee ID — STAFF only */}
            {role === 'STAFF' && (
              <View style={[styles.inputContainer, empIdFocused && styles.inputContainerFocused]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="card-outline" size={20} color={empIdFocused ? '#38bdf8' : '#9ca3af'} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('employeeIdSignup')}
                  placeholderTextColor="#9ca3af"
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  onFocus={() => setEmpIdFocused(true)}
                  onBlur={() => setEmpIdFocused(false)}
                />
              </View>
            )}

            {/* Email */}
            <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="mail-outline" size={20} color={emailFocused ? '#38bdf8' : '#9ca3af'} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('emailPlaceholder')}
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                editable={!isEmailVerified}
              />
              {isEmailVerified && (
                <Ionicons name="checkmark-circle" size={22} color="#4CAF50" style={{ marginRight: 8 }} />
              )}
            </View>

            {/* Send Verification Code */}
            {!isEmailVerified && (
              <TouchableOpacity
                style={[styles.verifyButton, (sendingCode || countdown > 0) && styles.verifyButtonDisabled]}
                onPress={handleSendVerificationCode}
                disabled={sendingCode || countdown > 0}
                activeOpacity={0.8}
              >
                {sendingCode ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.verifyButtonText}>  {t('sending')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={18} color="#fff" />
                    <Text style={styles.verifyButtonText}>
                      {countdown > 0 ? `  ${t('resendIn')} ${countdown}s` : `  ${t('sendVerificationCode')}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Verification Code Input */}
            {showVerification && !isEmailVerified && (
              <View style={styles.verificationBox}>
                <Text style={styles.verificationTitle}>{t('enterVerificationCodePrompt')}</Text>
                <Text style={styles.verificationSubtitle}>{t('checkEmailCode')}</Text>
                <View style={[styles.inputContainer, codeFocused && styles.inputContainerFocused, { marginTop: 12 }]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="key-outline" size={20} color={codeFocused ? '#38bdf8' : '#9ca3af'} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={t('enterCode')}
                    placeholderTextColor="#9ca3af"
                    value={verificationCode}
                    onChangeText={(text) => {
                      const digits = text.replace(/\D/g, '');
                      if (digits.length <= 6) setVerificationCode(digits);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    onFocus={() => setCodeFocused(true)}
                    onBlur={() => setCodeFocused(false)}
                  />
                  {verificationCode.length === 6 && (
                    <Ionicons name="checkmark-circle" size={22} color="#4CAF50" style={{ marginRight: 8 }} />
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.verifyCodeButton, verifyingCode && styles.verifyCodeButtonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={verifyingCode || verificationCode.length !== 6}
                  activeOpacity={0.8}
                >
                  {verifyingCode ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.verifyCodeButtonText}>  {t('verifying')}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                      <Text style={styles.verifyCodeButtonText}>  {t('verifyCode')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Phone Number */}
            <View style={[styles.inputContainer, phoneFocused && styles.inputContainerFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="call-outline" size={20} color={phoneFocused ? '#38bdf8' : '#9ca3af'} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('phonePlaceholder')}
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '');
                  if (digits.length <= 10) setPhone(digits);
                }}
                keyboardType="phone-pad"
                maxLength={10}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
              />
              {phone.length > 0 && (
                <View style={{ marginRight: 8 }}>
                  <Ionicons
                    name={phone.length === 10 && /^[6-9]/.test(phone) ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={phone.length === 10 && /^[6-9]/.test(phone) ? '#4CAF50' : '#FF9800'}
                  />
                </View>
              )}
            </View>

            {phone.length > 0 && phone.length < 10 && (
              <Text style={styles.phoneHint}>{phone.length}/10 {t('digitsCount')}</Text>
            )}
            {phone.length > 0 && phone.length === 10 && !/^[6-9]/.test(phone) && (
              <Text style={styles.phoneError}>{t('phoneStart')}</Text>
            )}

            {/* Password */}
            <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? '#38bdf8' : '#9ca3af'} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('passwordPlaceholder')}
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Password Strength */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBar}>
                  <View style={[styles.strengthFill, {
                    width: password.length < 6 ? '30%' :
                      (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? '60%' : '100%',
                    backgroundColor: password.length < 6 ? '#ef4444' :
                      (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? '#f59e0b' : '#22c55e',
                  }]} />
                </View>
                <Text style={[styles.strengthText, {
                  color: password.length < 6 ? '#ef4444' :
                    (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? '#f59e0b' : '#22c55e',
                }]}>
                  {password.length < 6 ? t('tooShort') :
                    (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? t('addLetterNumber') : t('strong')}
                </Text>
              </View>
            )}

            {/* Confirm Password */}
            <View style={[styles.inputContainer, confirmFocused && styles.inputContainerFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="lock-open-outline" size={20} color={confirmFocused ? '#38bdf8' : '#9ca3af'} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('confirmPassword')}
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons
                  name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={password === confirmPassword ? '#4CAF50' : '#F44336'}
                />
                <Text style={{
                  fontSize: 11, marginLeft: 4,
                  color: password === confirmPassword ? '#4CAF50' : '#F44336',
                }}>
                  {password === confirmPassword ? t('passwordsMatch') : t('passwordsNotMatch')}
                </Text>
              </View>
            )}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.loginButtonContainer, (!isEmailVerified || loading) && styles.loginButtonDisabled]}
            onPress={handleSignup}
            disabled={!isEmailVerified || loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={!isEmailVerified || loading ? ['#B0CDD8', '#B0CDD8'] : ['#7dd3fc', '#004e68']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.loginButton}
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={styles.loginButtonText}>
                {loading ? `  ${t('creatingBtn')}` : t('signUpBtn')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.signupSection}>
            <Text style={styles.signupText}>{t('alreadyAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signupLink}>{t('login')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRoleModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('selectYourRole')}</Text>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.roleOption,
                  role === r.key && { backgroundColor: `${r.color}10`, borderColor: r.color },
                ]}
                onPress={() => {
                  setRole(r.key);
                  setShowRoleModal(false);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.roleOptionIcon, { backgroundColor: `${r.color}15` }]}>
                  <Ionicons name={r.icon} size={28} color={r.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleOptionLabel, role === r.key && { color: r.color }]}>
                    {r.label}
                  </Text>
                  <Text style={styles.roleOptionDesc}>{r.desc}</Text>
                </View>
                {role === r.key && (
                  <Ionicons name="checkmark-circle" size={24} color={r.color} />
                )}
              </TouchableOpacity>
            ))}
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoOptions(false)}
        >
          <View style={styles.photoOptionsContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('choosePhotoSource')}</Text>

            <TouchableOpacity
              style={styles.photoOptionBtn}
              onPress={() => handlePhotoOptionPress('camera')}
              activeOpacity={0.8}
            >
              <View style={[styles.photoOptionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="camera-outline" size={28} color="#2196F3" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoOptionLabel}>{t('takePhoto')}</Text>
                <Text style={styles.photoOptionDesc}>{t('useCamera')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoOptionBtn}
              onPress={() => handlePhotoOptionPress('gallery')}
              activeOpacity={0.8}
            >
              <View style={[styles.photoOptionIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="images-outline" size={28} color="#9C27B0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoOptionLabel}>{t('chooseFromGallery')}</Text>
                <Text style={styles.photoOptionDesc}>{t('selectFromLibrary')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoCancelBtn}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={styles.photoCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  /* Fixed header — height sized to contain shapes + logo + welcome exactly */
  fixedHeader: { height: 252, overflow: 'hidden' },
  topDecoration: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  shapeBack: {
    position: 'absolute', width: width * 0.85, height: 180, top: -80, left: width * 0.25,
    transform: [{ rotate: '15deg' }], borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 4, height: -2 }, shadowOpacity: 0.13, shadowRadius: 4, elevation: 5,
  },
  shapeFront: {
    position: 'absolute', width: width * 0.75, height: 180, top: -60, left: -width * 0.05,
    transform: [{ rotate: '15deg' }], borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 4, height: -2 }, shadowOpacity: 0.13, shadowRadius: 4, elevation: 6,
  },
  shapeGradient: { flex: 1, borderRadius: 24 },

  logoSection: { alignItems: 'center', marginTop: 140, zIndex: 2 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 44, fontWeight: '300', color: '#8CD6F7', letterSpacing: 2 },
  logoText2: { fontSize: 44, fontWeight: '700', color: '#004e68', letterSpacing: 2 },

  welcomeSection: { alignItems: 'center', marginTop: 12, zIndex: 2 },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  welcomeSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  keyboardView: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 40 },

  formSection: { paddingHorizontal: 36 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 8 },

  roleSelector: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5',
    borderRadius: 12, padding: 14, marginBottom: 18, borderWidth: 2, borderColor: '#e5e7eb',
  },
  roleSelectorIcon: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  roleSelectorLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  roleSelectorDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  photoSection: { marginBottom: 18 },
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  requiredBadge: {
    fontSize: 10, fontWeight: '600', color: '#F44336',
    backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  photoPlaceholder: {
    height: 160, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb',
  },
  photoPlaceholderText: { fontSize: 14, color: '#6b7280', marginTop: 8, fontWeight: '500' },
  photoPlaceholderSubtext: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  photoPreviewContainer: { position: 'relative', alignSelf: 'center' },
  photoPreview: { width: 160, height: 160, borderRadius: 12 },
  uploadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  uploadingText: { color: '#fff', fontSize: 13, marginTop: 10, fontWeight: '600' },
  photoRemoveBtn: {
    position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },

  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5',
    borderRadius: 8, height: 54, marginBottom: 14, paddingHorizontal: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  inputContainerFocused: { borderColor: '#7dd3fc', backgroundColor: '#f0f9ff' },
  inputIconContainer: { width: 32, alignItems: 'center' },
  input: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0, marginLeft: 8 },
  eyeButton: { padding: 8 },

  verifyButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 12, marginBottom: 14,
    shadowColor: '#2196F3', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 4,
  },
  verifyButtonDisabled: { backgroundColor: '#90CAF9', shadowOpacity: 0 },
  verifyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  verificationBox: {
    backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 14,
    borderWidth: 2, borderColor: '#2196F3',
  },
  verificationTitle: { fontSize: 15, fontWeight: '700', color: '#1565C0', marginBottom: 4 },
  verificationSubtitle: { fontSize: 12, color: '#1976D2', marginBottom: 8 },
  verifyCodeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 12, marginTop: 12,
    shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 4,
  },
  verifyCodeButtonDisabled: { backgroundColor: '#A5D6A7', shadowOpacity: 0 },
  verifyCodeButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  phoneHint: { fontSize: 11, color: '#FF9800', marginTop: -10, marginBottom: 10, marginLeft: 4 },
  phoneError: { fontSize: 11, color: '#F44336', marginTop: -10, marginBottom: 10, marginLeft: 4 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: -8, marginBottom: 10, paddingHorizontal: 4 },
  strengthBar: { width: 80, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginRight: 8, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthText: { fontSize: 11, fontWeight: '500' },

  matchRow: { flexDirection: 'row', alignItems: 'center', marginTop: -8, marginBottom: 10, paddingHorizontal: 4 },

  loginButtonContainer: {
    paddingHorizontal: 80, marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.19, shadowRadius: 7, elevation: 5,
  },
  loginButtonDisabled: { shadowOpacity: 0, elevation: 0 },
  loginButton: { height: 50, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },

  signupSection: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 20 },
  signupText: { fontSize: 15, color: '#6b7280' },
  signupLink: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center',
    alignItems: 'center', padding: 20,
  },
  modalContent: {
    width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 20, color: '#1e293b' },
  roleOption: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#e5e7eb',
  },
  roleOptionIcon: {
    width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  roleOptionLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  roleOptionDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  photoOptionsContent: {
    width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 10,
  },
  photoOptionBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 12, marginBottom: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
  },
  photoOptionIcon: {
    width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  photoOptionLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  photoOptionDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  photoCancelBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f4f4f5', alignItems: 'center' },
  photoCancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
});
