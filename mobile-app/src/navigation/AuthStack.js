import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';

const Stack = createStackNavigator();

/**
 * AuthStack - Navigation for non-authenticated users
 * 
 * Currently contains:
 * - LoginScreen: User enters email/password
 * 
 * Future additions:
 * - RegisterScreen: New user signup
 * - ForgotPasswordScreen: Password reset
 */

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide header on login screen
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}