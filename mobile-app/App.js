import React from 'react';
import { registerRootComponent } from 'expo';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * App - Root Component
 * 
 * Wraps everything with required providers:
 * - GestureHandlerRootView: Required for navigation gestures
 * - PaperProvider: Material Design components
 * - AuthProvider: Authentication state
 * - AppNavigator: Handles all screen navigation
 */

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);