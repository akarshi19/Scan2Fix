import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

// Import Admin Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import AllComplaints from '../screens/admin/AllComplaints';
import ComplaintDetail from '../screens/admin/ComplaintDetail';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * AdminStack - Navigation for ADMIN role
 * 
 * Bottom Tabs:
 * 1. Dashboard - Stats overview
 * 2. Complaints - All complaints (with detail screen)
 * 3. Staff - Manage staff (future)
 */

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AdminHome" 
        component={AdminDashboard}
        options={{ title: 'Dashboard' }}
      />
    </Stack.Navigator>
  );
}

function ComplaintsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ComplaintsList" 
        component={AllComplaints}
        options={{ title: 'All Complaints' }}
      />
      <Stack.Screen 
        name="ComplaintDetail" 
        component={ComplaintDetail}
        options={{ title: 'Complaint Details' }}
      />
    </Stack.Navigator>
  );
}

export default function AdminStack() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#9C27B0',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Complaints" 
        component={ComplaintsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Staff" 
        component={DashboardStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👥</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}