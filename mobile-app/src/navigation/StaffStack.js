import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import StaffDashboard from '../screens/staff/StaffDashboard';
import JobDetails from '../screens/staff/JobDetails';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const SKY = '#7DD3F0'; const ACTIVE = '#4CAF50'; const INACTIVE = '#A8C8DC';
const NAVBAR_BG = '#EEF6FB';
const CIRCLE = 56; const BAR_H = 70; const LIFT = 30;

const TAB_CONFIG = [
  { name: 'NotStarted',  label: 'Not Started',  icon: 'clipboard-outline', iconActive: 'clipboard' },
  { name: 'InProgress',  label: 'In Progress',  icon: 'sync-outline',      iconActive: 'sync' },
  { name: 'Completed',   label: 'Completed',    icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
];

function NotStartedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffDashboard" component={StaffDashboard} initialParams={{ statusFilter: 'ASSIGNED' }} />
      <Stack.Screen name="JobDetails" component={JobDetails} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function InProgressStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffDashboardIP" component={StaffDashboard} initialParams={{ statusFilter: 'IN_PROGRESS' }} />
      <Stack.Screen name="JobDetailsIP" component={JobDetails} />
    </Stack.Navigator>
  );
}

function CompletedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffDashboardC" component={StaffDashboard} initialParams={{ statusFilter: 'CLOSED' }} />
      <Stack.Screen name="JobDetailsC" component={JobDetails} />
    </Stack.Navigator>
  );
}

function TabItem({ route, isFocused, onPress }) {
  const tab = TAB_CONFIG.find(t => t.name === route.name) ?? { label: route.name, icon: 'ellipse-outline', iconActive: 'ellipse' };
  const translateY = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(isFocused ? 1 : 0.01)).current;
  const iconOpacity = useRef(new Animated.Value(isFocused ? 0 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: isFocused ? -LIFT : 0, useNativeDriver: true, tension: 70, friction: 9 }),
      Animated.spring(circleScale, { toValue: isFocused ? 1 : 0.01, useNativeDriver: true, tension: 90, friction: 10 }),
      Animated.timing(iconOpacity, { toValue: isFocused ? 0 : 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity onPress={onPress} style={st.tabItem} activeOpacity={1}>
      <Animated.View style={[st.circle, { transform: [{ translateY }, { scale: circleScale }], opacity: circleScale, backgroundColor: ACTIVE }]}>
        <Ionicons name={tab.iconActive} size={22} color="#fff" />
      </Animated.View>
      <Animated.View style={{ opacity: iconOpacity }}>
        <Ionicons name={tab.icon} size={20} color={INACTIVE} />
      </Animated.View>
      <Text style={[st.label, { color: isFocused ? ACTIVE : INACTIVE }]}>{tab.label}</Text>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation }) {
  return (
    <View style={st.outerWrapper} pointerEvents="box-none">
      <View style={st.spacerAboveBar} pointerEvents="box-none" />
      <View style={st.pill}>
        {state.routes.map((route, index) => (
          <TabItem key={route.key} route={route} isFocused={state.index === index}
            onPress={() => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name); }}
          />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  outerWrapper: { position: 'absolute', left: 12, right: 12, bottom: Platform.OS === 'ios' ? 24 : 12, overflow: 'visible' },
  spacerAboveBar: { height: LIFT, overflow: 'visible' },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: NAVBAR_BG, borderRadius: 30, height: BAR_H, paddingHorizontal: 4, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 14, overflow: 'visible' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: BAR_H, overflow: 'visible' },
  circle: { position: 'absolute', top: (BAR_H - CIRCLE), width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: ACTIVE, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 },
  label: { position: 'absolute', bottom: 6, fontSize: 10, fontWeight: '600' },
});

export default function StaffStack() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="NotStarted" component={NotStartedStack} />
      <Tab.Screen name="InProgress" component={InProgressStack} />
      <Tab.Screen name="Completed" component={CompletedStack} />
    </Tab.Navigator>
  );
}