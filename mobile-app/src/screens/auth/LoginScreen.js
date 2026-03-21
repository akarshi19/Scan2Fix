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
import { Ionicons, FontAwesome, AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import {
  authAPI,
  saveToken,
  saveUserData,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Required for AuthSession
WebBrowser.maybeCompleteAuthSession();

// ════════════════════════════════════════
// OAuth Configuration
// ════════════════════════════════════════
const GOOGLE_CLIENT_ID = '341075816349-p63eudrknd0sujlri1tn5v8vnkso83ra.apps.googleusercontent.com';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { signIn } = useAuth();

  // ════════════════════════════════════════
  // Email/Password Login
  // ════════════════════════════════════════
  const handleLogin = async () => {
    // Validate email format
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address\n\nExample: user@company.com');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  // Social Login Handler
  const handleSocialLoginSuccess = async (provider, tokenData) => {
    try {
      let response;

      switch (provider) {
        case 'Google':
          response = await authAPI.googleLogin(tokenData.access_token);
          break;
        case 'Microsoft':
          response = await authAPI.microsoftLogin(tokenData.access_token);
          break;
        case 'Apple':
          response = await authAPI.appleLogin(
            tokenData.email,
            tokenData.full_name,
            tokenData.identity_token
          );
          break;
        default:
          throw new Error('Unknown provider');
      }

      if (response.data.success) {
        const { token, user } = response.data.data;

        // Save token and user data
        await saveToken(token);
        await saveUserData(user);

        // Refresh auth context — use getMe to update state
        // This triggers the AuthContext to re-check and load the user
        Alert.alert(
          `Welcome! 👋`,
          `Logged in as ${user.full_name || user.email}\n\nPlease restart the app to continue.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      Alert.alert(
        'Login Failed',
        error.message || `${provider} login failed. Please try again.`
      );
    } finally {
      setSocialLoading('');
    }
  };

  // Google Login 
  const handleGoogleLogin = async () => {
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      Alert.alert(
        'Setup Required',
        'Google login requires OAuth setup.\n\nPlease use email/password login.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSocialLoading('Google');

    try {
      // Use YOUR server as the redirect URI
      const redirectUri = 'https://turgid-falcate-chun.ngrok-free.dev/auth/callback';

      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        'response_type=token&' +
        `scope=${encodeURIComponent('openid email profile')}`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'scan2fix://auth'  // This catches the deep link redirect back
      );

      console.log('Auth result:', JSON.stringify(result));

      if (result.type === 'success' && result.url) {
        // Extract access_token from the deep link URL
        const url = result.url;
        let accessToken = null;

        // Check query params (from our redirect page)
        if (url.includes('access_token=')) {
          const tokenMatch = url.match(/access_token=([^&]+)/);
          if (tokenMatch) {
            accessToken = decodeURIComponent(tokenMatch[1]);
          }
        }

        if (accessToken) {
          await handleSocialLoginSuccess('Google', {
            access_token: accessToken,
          });
        } else {
          console.log('No token in URL:', url);
          Alert.alert('Error', 'No access token received from Google');
          setSocialLoading('');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
         console.log('Google login dismissed - this is normal in Expo Go');
        Alert.alert(
          'Note',
          'Google login may not redirect back in Expo Go (development mode).\n\n' +
          'It will work perfectly in the built APK.\n\n' +
          'For now, please use email/password login.',
          [{ text: 'OK' }]
        );
        setSocialLoading('');
      } else {
        console.log('Auth result:', result);
        setSocialLoading('');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      Alert.alert('Error', 'Google login failed. Please try email login.');
      setSocialLoading('');
    }
  };

  // ════════════════════════════════════════
  // Apple Login
  // ════════════════════════════════════════
  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'iOS Only',
        'Apple Sign-In is only available on iOS devices.\n\nPlease use email/password or Google login.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Setup Required',
      'Apple Sign-In requires an Apple Developer Account ($99/year).\n\n' +
      'For now, please use email/password login.',
      [{ text: 'OK' }]
    );
  };

  // ════════════════════════════════════════
  // Render
  // ════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Decorative Top Shapes */}
      <View style={styles.topDecoration}>
        <View style={styles.shapeBack}>
          <LinearGradient
            colors={['#94a3b8', '#64748b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shapeGradient}
          />
        </View>
        <View style={styles.shapeFront}>
          <LinearGradient
            colors={['#7dd3fc', '#38bdf8']}
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
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.welcomeSubtitle}>Log in to your Scan2Fix account</Text>
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
                placeholder="Email address"
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
                placeholder="Password"
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
              <Text style={styles.forgotText}>Forgot Password?</Text>
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
              colors={loading ? ['#cbd5e1', '#94a3b8'] : ['#7dd3fc', '#64748b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.loginButton}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loginButtonText}>  LOGGING IN...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>LOG IN</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerSection}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or sign in using</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialSection}>
            {/* Google */}
            <TouchableOpacity
              style={[styles.socialButton, socialLoading === 'Google' && styles.socialButtonActive]}
              onPress={handleGoogleLogin}
              disabled={loading || socialLoading !== ''}
            >
              {socialLoading === 'Google' ? (
                <ActivityIndicator size="small" color="#DB4437" />
              ) : (
                <AntDesign name="google" size={22}/>
              )}
            </TouchableOpacity>

            {/* Apple */}
            <TouchableOpacity
              style={[styles.socialButton, socialLoading === 'Apple' && styles.socialButtonActive]}
              onPress={handleAppleLogin}
              disabled={loading || socialLoading !== ''}
            >
              {socialLoading === 'Apple' ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <AntDesign name="apple" size={22} color="#333" />
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up */}
          <View style={styles.signupSection}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
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

  // Decorative shapes
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

  // Logo
  logoSection: { alignItems: 'center', marginTop: 160, marginBottom: 10 },
   logoRow: {
  flexDirection: 'row',
  alignItems: 'center',
},
  logoText: { fontSize: 52, fontWeight: '300', color: '#7dd3fc', letterSpacing: 2 },
  logoText2: { fontSize: 52, fontWeight: '700', color: '#38bdf8', letterSpacing: 2 },
  logoUnderline: { width: 60, height: 3, backgroundColor: '#38bdf8', borderRadius: 2, marginTop: 5 },

  // Welcome
  welcomeSection: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', letterSpacing: 0.5 },
  welcomeSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 8 },

  // Form
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

  // Login button
  loginButtonContainer: {
    paddingHorizontal: 80, marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.19, shadowRadius: 7, elevation: 5,
  },
  loginButtonDisabled: { opacity: 0.8 },
  loginButton: { height: 52, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  // Divider
  dividerSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 50, marginTop: 28, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#6b7280' },

  // Social
  socialSection: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 30 },
  socialButton: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#fafaf9',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
    elevation: 3, borderWidth: 1, borderColor: '#f0f0f0',
  },
  socialButtonActive: { borderColor: '#7dd3fc', backgroundColor: '#f0f9ff' },

  // Signup
  signupSection: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  signupText: { fontSize: 15, color: '#6b7280' },
  signupLink: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
});