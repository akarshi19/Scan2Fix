import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AllComplaints from '../screens/admin/AllComplaints';
import ComplaintDetail from '../screens/admin/ComplaintDetail';
import ManageUsers from '../screens/admin/ManageUsers';
import AddUser from '../screens/admin/AddUser';
import UserDetail from '../screens/admin/UserDetail';
import AllAssets from '../screens/admin/AllAssets';
import AssetDetail from '../screens/admin/AssetDetail';
import AddAsset from '../screens/admin/AddAsset';
import ProfileScreen from '../screens/shared/ProfileScreen';
import ProfileAvatar from '../components/ProfileAvatar';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const SKY      = '#7DD3F0';
const ACTIVE   = '#5BA8D4';
const INACTIVE = '#A8C8DC';
const NAVBAR_BG = '#EEF6FB';
const SLATE  = '#94A3B8';
const CIRCLE = 56;
const BAR_H  = 70;
const LIFT   = 30;

const TAB_CONFIG = [
  { name: 'Dashboard',  label: 'Home',       icon: 'home-outline',       iconActive: 'home' },
  { name: 'Complaints', label: 'Complaints', icon: 'clipboard-outline',  iconActive: 'clipboard' },
  { name: 'Assets',     label: 'Equipments',     icon: 'cube-outline',       iconActive: 'cube' },
  { name: 'Users',      label: 'Users',      icon: 'people-outline',     iconActive: 'people' },
  //{ name: 'My Profile', label: 'Profile',    icon: 'person-outline',     iconActive: 'person' },
];

// Tabs that show the + FAB button
const TABS_WITH_FAB = ['Assets', 'Users'];

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdminDashboard} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function ComplaintsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ComplaintsList" component={AllComplaints} />
      <Stack.Screen name="ComplaintDetail" component={ComplaintDetail} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function UsersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UsersList" component={ManageUsers} />
      <Stack.Screen name="AddUser" component={AddUser} />
      <Stack.Screen name="UserDetail" component={UserDetail} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function AssetsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssetsList" component={AllAssets} />
      <Stack.Screen name="AssetDetail" component={AssetDetail} />
      <Stack.Screen name="AddAsset" component={AddAsset} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function TabItem({ route, isFocused, onPress }) {
  const tab = TAB_CONFIG.find(t => t.name === route.name) ?? {
    label: route.name, icon: 'ellipse-outline', iconActive: 'ellipse',
  };

  const translateY  = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(isFocused ? 1 : 0.01)).current;
  const iconOpacity = useRef(new Animated.Value(isFocused ? 0 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY,  { toValue: isFocused ? -LIFT : 0, useNativeDriver: true, tension: 70, friction: 9 }),
      Animated.spring(circleScale, { toValue: isFocused ? 1 : 0.01,  useNativeDriver: true, tension: 90, friction: 10 }),
      Animated.timing(iconOpacity, { toValue: isFocused ? 0 : 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity onPress={onPress} style={st.tabItem} activeOpacity={1}>
      <Animated.View style={[st.circle, { transform: [{ translateY }, { scale: circleScale }], opacity: circleScale }]}>
        {route.name === 'My Profile'
          ? <ProfileAvatar size={26} showBorder={false} />
          : <Ionicons name={tab.iconActive} size={22} color="#fff" />
        }
      </Animated.View>
      <Animated.View style={{ opacity: iconOpacity }}>
        {route.name === 'My Profile'
          ? <ProfileAvatar size={20} showBorder={false} />
          : <Ionicons name={tab.icon} size={20} color={INACTIVE} />
        }
      </Animated.View>
      <Text style={[st.label, { color: isFocused ? ACTIVE : INACTIVE }]}>{tab.label}</Text>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation }) {
  const currentTab = state.routes[state.index].name;

  // Check if we're on the ROOT screen of Users or Assets stack
  // Not on AddUser, UserDetail, AddAsset, AssetDetail
  let showFab = false;
  if (currentTab === 'Users' || currentTab === 'Assets') {
    const nestedState = state.routes[state.index].state;
    const nestedIndex = nestedState?.index ?? 0;
    const nestedRouteName = nestedState?.routes?.[nestedIndex]?.name;

    // Only show FAB on the list screens
    if (currentTab === 'Users' && (!nestedRouteName || nestedRouteName === 'UsersList')) {
      showFab = true;
    }
    if (currentTab === 'Assets' && (!nestedRouteName || nestedRouteName === 'AssetsList')) {
      showFab = true;
    }
  }

  const handleFabPress = () => {
    if (currentTab === 'Users') {
      navigation.navigate('Users', { screen: 'AddUser' });
    } else if (currentTab === 'Assets') {
      navigation.navigate('Assets', { screen: 'AddAsset' });
    }
  };

  return (
    <View style={st.outerWrapper} pointerEvents="box-none">
      <View style={st.spacerAboveBar} pointerEvents="box-none">
        {showFab && (
          <TouchableOpacity style={st.centerFab} onPress={handleFabPress} activeOpacity={0.85}>
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
      <View style={st.pill}>
        {state.routes.map((route, index) => (
          <TabItem
            key={route.key}
            route={route}
            isFocused={state.index === index}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  outerWrapper: { position: 'absolute', left: 12, right: 12, bottom: Platform.OS === 'ios' ? 24 : 12, overflow: 'visible' },
  spacerAboveBar: { height: LIFT, overflow: 'visible' },
  pill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: NAVBAR_BG,
    borderRadius: 30, height: BAR_H, paddingHorizontal: 4,
    shadowColor: SKY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22,
    shadowRadius: 18, elevation: 14, overflow: 'visible',
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: BAR_H, overflow: 'visible' },
  circle: {
    position: 'absolute', top: (BAR_H - CIRCLE), width: CIRCLE, height: CIRCLE,
    borderRadius: CIRCLE / 2, backgroundColor: ACTIVE, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: ACTIVE, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  label: { position: 'absolute', bottom: 6, fontSize: 10, fontWeight: '600' },
      centerFab: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 6,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 100,
    left: '50%',
    marginLeft: -28,
  },
});

export default function AdminStack() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard"  component={DashboardStack} />
      <Tab.Screen name="Complaints" component={ComplaintsStack} />
      <Tab.Screen name="Assets"     component={AssetsStack} />
      <Tab.Screen name="Users"      component={UsersStack} />
      {/* <Tab.Screen name="My Profile" component={ProfileScreen} /> */}
    </Tab.Navigator>
  );
}