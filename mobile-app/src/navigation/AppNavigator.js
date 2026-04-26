import React, { useState, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

import SplashScreen from '../screens/SplashScreen';
import LanguageSelectScreen from '../screens/LanguageSelectScreen';
import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import StaffStack from './StaffStack';
import UserStack from './UserStack';

const prefix = Linking.createURL('/');

export default function AppNavigator() {
  const [showSplash, setShowSplash] = useState(true);
  const { user, role, loading: authLoading } = useAuth();
  const { isFirstLaunch, loaded: langLoaded } = useLanguage();
  const { loaded: themeLoaded } = useTheme();

  // Deep linking configuration
  const linking = useMemo(
    () => ({
      prefixes: [prefix, 'scan2fix://', 'https://scan2fix.com', 'https://*.scan2fix.com'],
      config: {
        screens: {
          // Complaint screen from QR code
          complaint: 'complaint/:assetId',
          // Default screens
          UserHome: 'home',
          ScanQR: 'scan',
          LodgeComplaint: 'lodge-complaint',
          MyComplaints: 'my-complaints',
        },
      },
    }),
    []
  );

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!langLoaded || !themeLoaded) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  //Show language selection on first launch
  // if (isFirstLaunch) {
  //   return <LanguageSelectScreen />;
  // }

  if (authLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} fallback={<View style={styles.center}><Text>Loading...</Text></View>}>
      {!user ? (
        <AuthStack />
      ) : role === 'ADMIN' ? (
        <AdminStack />
      ) : role === 'STAFF' ? (
        <StaffStack />
      ) : (
        <UserStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});