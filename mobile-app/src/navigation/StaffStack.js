import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import StaffDashboard from '../screens/staff/StaffDashboard';
import JobDetails from '../screens/staff/JobDetails';
import ProfileScreen from '../screens/shared/ProfileScreen';
import ProfileAvatar from '../components/ProfileAvatar';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function JobsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="StaffHome" 
        component={StaffDashboard}
        options={{ title: 'My Jobs' }}
      />
      <Stack.Screen 
        name="JobDetails" 
        component={JobDetails}
        options={{ title: 'Job Details' }}
      />
    </Stack.Navigator>
  );
}

export default function StaffStack() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Jobs" 
        component={JobsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🔧</Text>
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