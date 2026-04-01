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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');


export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { signIn } = useAuth();
  const { t } = useLanguage();

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert(t('error'), t('enterEmail'));
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('invalidEmail'), t('enterValidEmailExample'));
      return;
    }

    if (!password) {
      Alert.alert(t('error'), t('enterPassword'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('error'), t('passwordMin'));
      return;
    }

    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      Alert.alert(t('loginFailed'), error.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Decorative Top Shapes */}
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>Scan</Text>
              <Text style={styles.logoText2}>2Fix</Text>
            </View>
          </View>

          {/* Welcome */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>{t('welcomeBack')}</Text>
            <Text style={styles.welcomeSubtitle}>{t('loginSubtitle')}</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
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
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
              {email.length > 0 && (
                <TouchableOpacity onPress={() => setEmail('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#d1d5db" />
                </TouchableOpacity>
              )}
            </View>

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

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotButton} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButtonContainer, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading || socialLoading !== ''}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? ['#cbd5e1', '#94a3b8'] : ['#8CD6F7', '#004e68']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.loginButton}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loginButtonText}>  {t('loggingIn')}</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>{t('login')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerSection}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up */}
          <View style={styles.signupSection}>
            <Text style={styles.signupText}>{t('noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>{t('signUp')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  topDecoration: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, overflow: 'hidden', zIndex: 1 },
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

  logoSection: { alignItems: 'center', marginTop: 160, marginBottom: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 52, fontWeight: '300', color: '#8CD6F7', letterSpacing: 2 },
  logoText2: { fontSize: 52, fontWeight: '700', color: '#004e68', letterSpacing: 2 },
  logoUnderline: { width: 60, height: 3, backgroundColor: '#004e68', borderRadius: 2, marginTop: 5 },

  welcomeSection: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', letterSpacing: 0.5 },
  welcomeSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 8 },

  formSection: { paddingHorizontal: 36 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5',
    borderRadius: 8, height: 56, marginBottom: 16, paddingHorizontal: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  inputContainerFocused: { borderColor: '#7dd3fc', backgroundColor: '#f0f9ff' },
  inputIconContainer: { width: 32, alignItems: 'center' },
  input: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0, marginLeft: 8 },
  eyeButton: { padding: 8 },
  clearButton: { padding: 4 },
  forgotButton: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 10 },
  forgotText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },

  loginButtonContainer: {
    paddingHorizontal: 80, marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.19, shadowRadius: 7, elevation: 5,
  },
  loginButtonDisabled: { opacity: 0.8 },
  loginButton: { height: 52, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  dividerSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 50, marginTop: 28, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#6b7280' },

  socialSection: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 30 },
  socialButton: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#fafaf9',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
    elevation: 3, borderWidth: 1, borderColor: '#f0f0f0',
  },
  socialButtonActive: { borderColor: '#7dd3fc', backgroundColor: '#f0f9ff' },

  signupSection: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  signupText: { fontSize: 15, color: '#6b7280' },
  signupLink: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
});