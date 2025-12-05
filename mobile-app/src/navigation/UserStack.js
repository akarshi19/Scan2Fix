import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

// Import User Screens
import UserDashboard from '../screens/user/UserDashboard';
import ScanQR from '../screens/user/ScanQR';
import LodgeComplaint from '../screens/user/LodgeComplaint';
import MyComplaints from '../screens/user/MyComplaints';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * UserStack - Navigation for USER role
 * 
 * Bottom Tabs:
 * 1. Home - Dashboard with scan button
 * 2. My Complaints - History of submitted complaints
 * 
 * Stack Screens (accessed from Home):
 * - ScanQR - Camera to scan QR code
 * - LodgeComplaint - Form to submit complaint
 */

// Stack navigator for Home tab (includes scan flow)
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="UserHome" 
        component={UserDashboard}
        options={{ title: 'Scan2Fix' }}
      />
      <Stack.Screen 
        name="ScanQR" 
        component={ScanQR}
        options={{ title: 'Scan QR Code' }}
      />
      <Stack.Screen 
        name="LodgeComplaint" 
        component={LodgeComplaint}
        options={{ title: 'Report Issue' }}
      />
    </Stack.Navigator>
  );
}

// Main User Navigation with Bottom Tabs
export default function UserStack() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="My Complaints" 
        component={MyComplaints}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📋</Text>
          ),
          headerShown: true,
          title: 'My Complaints',
        }}
      />
    </Tab.Navigator>
  );
}