import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import UserDashboard from '../screens/user/UserDashboard';
import ScanQR from '../screens/user/ScanQR';
import LodgeComplaint from '../screens/user/LodgeComplaint';
import MyComplaints from '../screens/user/MyComplaints';
import VerifyOTPScreen from '../screens/user/VerifyOTPScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import ComplaintDetail from '../screens/admin/ComplaintDetail';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const SKY = '#7DD3F0'; const ACTIVE = '#5BA8D4'; const INACTIVE = '#A8C8DC';
const NAVBAR_BG = '#EEF6FB';
const CIRCLE = 56; const BAR_H = 70; const LIFT = 30;

const TAB_CONFIG = [
  { name: 'Home',         label: 'Home',       icon: 'home-outline',      iconActive: 'home' },
  { name: 'MyComplaints', label: 'Complaints', icon: 'clipboard-outline', iconActive: 'clipboard' },
];

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserHome" component={UserDashboard} />
      <Stack.Screen name="ScanQR" component={ScanQR} />
      <Stack.Screen name="LodgeComplaint" component={LodgeComplaint} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function ComplaintsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ComplaintsList" component={MyComplaints} />
      <Stack.Screen name="ComplaintDetail" component={ComplaintDetail} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
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
      <Animated.View style={[st.circle, { transform: [{ translateY }, { scale: circleScale }], opacity: circleScale }]}>
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
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: NAVBAR_BG, borderRadius: 30, height: BAR_H, paddingHorizontal: 4, shadowColor: SKY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 14, overflow: 'visible' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: BAR_H, overflow: 'visible' },
  circle: { position: 'absolute', top: (BAR_H - CIRCLE), width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, backgroundColor: ACTIVE, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: ACTIVE, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 },
  label: { position: 'absolute', bottom: 6, fontSize: 10, fontWeight: '600' },
});

export default function UserStack() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="MyComplaints" component={ComplaintsStack} />
    </Tab.Navigator>
  );
}