import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import UserDashboard from '../screens/user/UserDashboard';
import ScanQR from '../screens/user/ScanQR';
import LodgeComplaint from '../screens/user/LodgeComplaint';
import MyComplaints from '../screens/user/MyComplaints';
import ProfileScreen from '../screens/shared/ProfileScreen';
import VerifyOTPScreen from '../screens/user/VerifyOTPScreen';
import ProfileAvatar from '../components/ProfileAvatar';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

function ComplaintsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ComplaintsList" 
        component={MyComplaints}
        options={{ title: 'My Complaints' }}
      />
      <Stack.Screen 
        name="VerifyOTP" 
        component={VerifyOTPScreen}
        options={{ title: 'Verify Completion' }}
      />
    </Stack.Navigator>
  );
}

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
        component={ComplaintsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <ProfileAvatar size={focused ? 28 : 24} showBorder={focused} />
          ),
          headerShown: true,
          title: 'My Profile',
        }}
      />
    </Tab.Navigator>
  );
}