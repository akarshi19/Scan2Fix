import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

import SplashScreen from '../screens/SplashScreen';
import LanguageSelectScreen from '../screens/LanguageSelectScreen';
import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import StaffStack from './StaffStack';
import UserStack from './UserStack';

export default function AppNavigator() {
  const [showSplash, setShowSplash] = useState(true);
  const { user, role, loading: authLoading } = useAuth();
  const { isFirstLaunch, loaded: langLoaded } = useLanguage();
  const { loaded: themeLoaded } = useTheme();

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
  if (isFirstLaunch) {
    return <LanguageSelectScreen />;
  }

  if (authLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
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