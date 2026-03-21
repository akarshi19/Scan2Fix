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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, AntDesign, FontAwesome } from '@expo/vector-icons';
import { authAPI, saveToken, saveUserData } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '341075816349-p63eudrknd0sujlri1tn5v8vnkso83ra.apps.googleusercontent.com';

const { width } = Dimensions.get('window');

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { signIn } = useAuth();

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (fullName.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }

    // Email validation
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(
        'Invalid Email',
        'Please enter a valid email address.\n\nExamples:\n• user@gmail.com\n• staff@company.com',
      );
      return;
    }

    // Password validation
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      Alert.alert(
        'Weak Password',
        'Password must contain at least:\n• One letter (a-z)\n• One number (0-9)\n\nExample: mypass123',
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.signup(
        email.trim(),
        password,
        fullName.trim()
      );

      if (response.data.success) {
        const { token, user } = response.data.data;
        await saveToken(token);
        await saveUserData(user);

        Alert.alert(
          'Account Created! ✅',
          'Welcome to Scan2Fix!',
          [
            {
              text: 'OK',
              onPress: async () => {
                await signIn(email.trim(), password);
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Signup Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLoginSuccess = async (provider, tokenData) => {
    try {
      let response;

      switch (provider) {
        case 'Google':
          response = await authAPI.googleLogin(tokenData.access_token);
          break;
        default:
          throw new Error('Unknown provider');
      }

      if (response.data.success) {
        const { token, user } = response.data.data;
        await saveToken(token);
        await saveUserData(user);

        Alert.alert(
          'Welcome! 👋',
          `Account created for ${user.full_name || user.email}`,
          [
            {
              text: 'OK',
              onPress: async () => {
                await signIn(user.email, '');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error(`${provider} signup error:`, error);
      Alert.alert('Signup Failed', error.message || `${provider} signup failed.`);
    }
  };

  const handleGoogleSignup = async () => {
    if (GOOGLE_CLIENT_ID === 'YOUR_ACTUAL_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      Alert.alert(
        'Setup Required',
        'Google signup requires OAuth setup.\n\nPlease use email/password signup.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);

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
        'scan2fix://auth'
      );

      if (result.type === 'success' && result.url) {
        let accessToken = null;

        if (result.url.includes('access_token=')) {
          const tokenMatch = result.url.match(/access_token=([^&]+)/);
          if (tokenMatch) {
            accessToken = decodeURIComponent(tokenMatch[1]);
          }
        }

        if (accessToken) {
          await handleSocialLoginSuccess('Google', {
            access_token: accessToken,
          });
        } else {
          Alert.alert(
            'Note',
            'Google signup may not redirect back in Expo Go.\n\n' +
            'It will work in the built APK.\n\nPlease use email signup for now.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Google signup error:', error);
      Alert.alert('Error', 'Google signup failed. Please try email signup.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignup = () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS Only', 'Apple Sign-In is only available on iOS devices.');
      return;
    }
    Alert.alert('Coming Soon', 'Apple signup will be available in a future update.');
  };

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

          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>
              Join Scan2Fix to report issues
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {/* Full Name */}
            <View style={[styles.inputContainer, nameFocused && styles.inputContainerFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="person-outline" size={20} color={nameFocused ? '#38bdf8' : '#9ca3af'} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#9ca3af"
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

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
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
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

            {/* Confirm Password */}
            <View style={[styles.inputContainer, confirmFocused && styles.inputContainerFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="lock-open-outline" size={20} color={confirmFocused ? '#38bdf8' : '#9ca3af'} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
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
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={styles.loginButtonContainer}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7dd3fc', '#64748b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'CREATING...' : 'SIGN UP'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Social Divider */}
          <View style={styles.dividerSection}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or sign up using</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialSection}>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleGoogleSignup()}>
              <AntDesign name="google" size={22}/>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleAppleSignup()}>
              <AntDesign name="apple" size={22}/>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.signupSection}>
            <Text style={styles.signupText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signupLink}>Log In</Text>
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
  logoSection: { alignItems: 'center', marginTop: 140, marginBottom: 5 },
  logoRow: {
  flexDirection: 'row',
  alignItems: 'center',
},
  logoText: { fontSize: 44, fontWeight: '300', color: '#7dd3fc', letterSpacing: 2 },
  logoText2: { fontSize: 44, fontWeight: '700', color: '#38bdf8', letterSpacing: 2 },

  // Welcome
  welcomeSection: { alignItems: 'center', marginTop: 15, marginBottom: 25 },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  welcomeSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 6 },

  // Form
  formSection: { paddingHorizontal: 36 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5',
    borderRadius: 8, height: 54, marginBottom: 14, paddingHorizontal: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  inputContainerFocused: { borderColor: '#7dd3fc', backgroundColor: '#f0f9ff' },
  inputIconContainer: { width: 32, alignItems: 'center' },
  input: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0, marginLeft: 8 },
  eyeButton: { padding: 8 },

  // Button
  loginButtonContainer: {
    paddingHorizontal: 80, marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.19, shadowRadius: 7, elevation: 5,
  },
  loginButton: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },

  // Divider
  dividerSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 50, marginTop: 24, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#6b7280' },

  // Social
  socialSection: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 25 },
  socialButton: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#fafaf9',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
    elevation: 3, borderWidth: 1, borderColor: '#f0f0f0',
  },

  // Sign up link
  signupSection: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  signupText: { fontSize: 15, color: '#6b7280' },
  signupLink: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
});