import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

// Import Staff Screens
import StaffDashboard from '../screens/staff/StaffDashboard';
import JobDetails from '../screens/staff/JobDetails';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * StaffStack - Navigation for STAFF role
 * 
 * Bottom Tabs:
 * 1. My Jobs - List of assigned complaints
 * 2. Profile - Staff profile & settings
 * 
 * Stack Screens:
 * - JobDetails - View and update specific job
 */

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
        component={StaffDashboard} // Temporary - will create ProfileScreen later
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
          headerShown: true,
          title: 'My Profile',
        }}
      />
    </Tab.Navigator>
  );
}