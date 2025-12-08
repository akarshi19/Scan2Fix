import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AllComplaints from '../screens/admin/AllComplaints';
import ComplaintDetail from '../screens/admin/ComplaintDetail';
import ManageUsers from '../screens/admin/ManageUsers';
import AddUser from '../screens/admin/AddUser';
import UserDetail from '../screens/admin/UserDetail'; // ✅ ADD THIS
import ProfileScreen from '../screens/shared/ProfileScreen';
import ProfileAvatar from '../components/ProfileAvatar';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

function UsersStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="UsersList" 
        component={ManageUsers}
        options={{ title: 'Manage Users' }}
      />
      <Stack.Screen 
        name="AddUser" 
        component={AddUser}
        options={{ title: 'Add New User' }}
      />
      <Stack.Screen 
        name="UserDetail" 
        component={UserDetail}
        options={{ title: 'User Details' }}
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
        name="Users" 
        component={UsersStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👥</Text>
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