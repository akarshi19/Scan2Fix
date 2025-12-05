import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Import Splash Screen
import SplashScreen from '../screens/SplashScreen';

// Import all navigation stacks
import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import StaffStack from './StaffStack';
import UserStack from './UserStack';

/**
 * AppNavigator - The "Traffic Cop" of the app
 * 
 * PURPOSE: Decides which screens the user can access based on:
 * 1. Are they logged in? (No → AuthStack)
 * 2. What is their role? (ADMIN/STAFF/USER → respective Stack)
 * 
 * FLOW:
 * App Opens → Splash (3 sec) → Check Auth → Route to correct Stack
 */

export default function AppNavigator() {
  // Track if splash screen has finished
  const [showSplash, setShowSplash] = useState(true);
  
  // Get authentication state
  const { user, role, loading } = useAuth();

  // ========== SPLASH SCREEN ==========
  if (showSplash) {
    return (
      <SplashScreen 
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // ========== MAIN NAVIGATION ==========
  return (
    <NavigationContainer>
      {!user ? (
        // Not logged in → Show login screen
        <AuthStack />
      ) : role === 'ADMIN' ? (
        // Admin user → Show admin dashboard
        <AdminStack />
      ) : role === 'STAFF' ? (
        // Staff user → Show staff dashboard
        <StaffStack />
      ) : (
        // Regular user (or unknown role) → Show user dashboard
        <UserStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});