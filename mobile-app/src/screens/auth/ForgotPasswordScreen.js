import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform,
  TouchableOpacity, ScrollView, Dimensions, StatusBar, TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  // Step 1: Request reset code
  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert(t('error'), t('enterEmail'));
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('invalidEmail'), t('enterValidEmail'));
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(email.trim());
      if (response.data.success) {
        Alert.alert(
          t('codeSent'),
          t('codeSentForgot'),
          [{ text: t('ok'), onPress: () => setStep(2) }]
        );
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToSendCode'));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = () => {
    if (!resetCode || resetCode.length !== 6) {
      Alert.alert(t('error'), t('enterCodeError'));
      return;
    }
    setStep(3);
  };

  // Step 3: Set new password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(t('error'), t('passwordTooShort'));
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      Alert.alert(t('weakPassword'), t('passwordRequirements'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword(email.trim(), resetCode, newPassword);
      if (response.data.success) {
        Alert.alert(
          t('passwordReset'),
          t('passwordResetMsg'),
          [{ text: t('login'), onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToReset'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={s.topDecoration}>
        <View style={s.shapeBack}>
          <LinearGradient colors={['#94a3b8', '#64748b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.shapeGradient} />
        </View>
        <View style={s.shapeFront}>
          <LinearGradient colors={['#7dd3fc', '#38bdf8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.shapeGradient} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardView}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Icon */}
          <View style={s.iconSection}>
            <View style={s.iconCircle}>
              <Ionicons
                name={step === 1 ? 'mail-outline' : step === 2 ? 'keypad-outline' : 'lock-open-outline'}
                size={36} color="#38bdf8"
              />
            </View>
          </View>

          {/* Title */}
          <View style={s.titleSection}>
            <Text style={s.title}>
              {step === 1 ? t('forgotPassword') : step === 2 ? t('enterResetCode') : t('newPasswordTitle')}
            </Text>
            <Text style={s.subtitle}>
              {step === 1 && t('enterEmailSubtitle')}
              {step === 2 && t('enterCodeSubtitle')}
              {step === 3 && t('createPasswordSubtitle')}
            </Text>
          </View>

          {/* Step indicators */}
          <View style={s.stepsRow}>
            {[1, 2, 3].map(i => (
              <View key={i} style={[s.stepDot, step >= i && s.stepDotActive]} />
            ))}
          </View>

          {/* Form */}
          <View style={s.formSection}>
            {step === 1 && (
              <View style={[s.inputContainer, emailFocused && s.inputContainerFocused]}>
                <Ionicons name="mail-outline" size={20} color={emailFocused ? '#38bdf8' : '#9ca3af'} style={{ marginRight: 10 }} />
                <TextInput
                  style={s.input} placeholder={t('emailPlaceholder')} placeholderTextColor="#9ca3af"
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
                  onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                />
              </View>
            )}

            {step === 2 && (
              <View style={[s.inputContainer, s.codeInput, codeFocused && s.inputContainerFocused]}>
                <TextInput
                  style={[s.input, { textAlign: 'center', fontSize: 28, letterSpacing: 10, fontWeight: 'bold' }]}
                  placeholder={t('codePlaceholder')} placeholderTextColor="#d1d5db"
                  value={resetCode} onChangeText={setResetCode}
                  keyboardType="number-pad" maxLength={6}
                  onFocus={() => setCodeFocused(true)} onBlur={() => setCodeFocused(false)}
                />
              </View>
            )}

            {step === 3 && (
              <>
                <View style={[s.inputContainer, passFocused && s.inputContainerFocused]}>
                  <Ionicons name="lock-closed-outline" size={20} color={passFocused ? '#38bdf8' : '#9ca3af'} style={{ marginRight: 10 }} />
                  <TextInput
                    style={s.input} placeholder={t('newPasswordPlaceholder')} placeholderTextColor="#9ca3af"
                    value={newPassword} onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setPassFocused(true)} onBlur={() => setPassFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                {newPassword.length > 0 && (
                  <View style={s.strengthRow}>
                    <View style={s.strengthBar}>
                      <View style={[s.strengthFill, {
                        width: newPassword.length < 6 ? '30%' : (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) ? '60%' : '100%',
                        backgroundColor: newPassword.length < 6 ? '#ef4444' : (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) ? '#f59e0b' : '#22c55e',
                      }]} />
                    </View>
                    <Text style={{ fontSize: 11, color: newPassword.length < 6 ? '#ef4444' : (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) ? '#f59e0b' : '#22c55e', fontWeight: '500' }}>
                      {newPassword.length < 6 ? t('tooShort') : (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) ? t('addLetterNumber') : t('strong')}
                    </Text>
                  </View>
                )}

                <View style={[s.inputContainer, confirmFocused && s.inputContainerFocused]}>
                  <Ionicons name="lock-open-outline" size={20} color={confirmFocused ? '#38bdf8' : '#9ca3af'} style={{ marginRight: 10 }} />
                  <TextInput
                    style={s.input} placeholder={t('confirmPasswordPlaceholder')} placeholderTextColor="#9ca3af"
                    value={confirmPassword} onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setConfirmFocused(true)} onBlur={() => setConfirmFocused(false)}
                  />
                </View>

                {confirmPassword.length > 0 && (
                  <View style={s.matchRow}>
                    <Ionicons name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'} size={14} color={newPassword === confirmPassword ? '#22c55e' : '#ef4444'} />
                    <Text style={{ fontSize: 11, color: newPassword === confirmPassword ? '#22c55e' : '#ef4444', marginLeft: 4 }}>
                      {newPassword === confirmPassword ? t('passwordsMatch') : t('passwordsNotMatch')}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[s.actionBtnWrap, loading && { opacity: 0.7 }]}
            onPress={step === 1 ? handleRequestCode : step === 2 ? handleVerifyCode : handleResetPassword}
            disabled={loading} activeOpacity={0.8}
          >
            <LinearGradient colors={['#7dd3fc', '#64748b']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.actionBtn}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.actionBtnText}>
                  {step === 1 ? t('sendResetCode') : step === 2 ? t('verifyCode') : t('resetPassword')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity style={s.backLink} onPress={() => {
            if (step > 1) setStep(step - 1);
            else navigation.navigate('Login');
          }}>
            <Ionicons name="arrow-back" size={16} color="#6b7280" />
            <Text style={s.backLinkText}> {step > 1 ? t('previousStep') : t('backToLogin')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  topDecoration: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, overflow: 'hidden', zIndex: 1 },
  shapeBack: { position: 'absolute', width: width * 0.85, height: 180, top: -80, left: width * 0.25, transform: [{ rotate: '15deg' }], borderRadius: 24, overflow: 'hidden', elevation: 5 },
  shapeFront: { position: 'absolute', width: width * 0.75, height: 180, top: -60, left: -width * 0.05, transform: [{ rotate: '15deg' }], borderRadius: 24, overflow: 'hidden', elevation: 6 },
  shapeGradient: { flex: 1, borderRadius: 24 },
  iconSection: { alignItems: 'center', marginTop: 180, marginBottom: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e0f2fe' },
  titleSection: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  stepsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 30 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: '#38bdf8', width: 24 },
  formSection: { paddingHorizontal: 36 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5', borderRadius: 8, height: 56, marginBottom: 16, paddingHorizontal: 16, borderWidth: 2, borderColor: 'transparent' },
  inputContainerFocused: { borderColor: '#7dd3fc', backgroundColor: '#f0f9ff' },
  codeInput: { height: 64 },
  input: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: -10, marginBottom: 12, paddingHorizontal: 4 },
  strengthBar: { width: 80, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginRight: 8, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginTop: -10, marginBottom: 12, paddingHorizontal: 4 },
  actionBtnWrap: { paddingHorizontal: 60, marginTop: 16 },
  actionBtn: { height: 52, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  backLinkText: { color: '#6b7280', fontSize: 14 },
});