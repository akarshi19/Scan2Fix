import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import AdminDashboard from '../screens/admin/AdminDashboard';
import AllComplaints from '../screens/admin/AllComplaints';
import ComplaintDetail from '../screens/admin/ComplaintDetail';
import ManageUsers from '../screens/admin/ManageUsers';
import AddUser from '../screens/admin/AddUser';
import UserDetail from '../screens/admin/UserDetail';
import UniversalQR from '../screens/admin/UniversalQR';
import ProfileScreen from '../screens/shared/ProfileScreen';
import StaffReportAnalysis from '../screens/shared/StaffReportAnalysis';
import ComplaintsAnalysis from '../screens/admin/ComplaintsAnalysis';
import ProfileAvatar from '../components/ProfileAvatar';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function AdminStack() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Refs so the PanResponder can access current tab nav state without re-creating
  const tabNavRef   = useRef(null);
  const tabStateRef = useRef({ index: 0 });

  const TAB_CONFIG = [
    { name: 'Dashboard',   label: 'Home',       icon: 'home-outline',      iconActive: 'home' },
    { name: 'Complaints',  label: 'Complaints', icon: 'clipboard-outline', iconActive: 'clipboard' },
    { name: 'Users',       label: 'Users',      icon: 'people-outline',    iconActive: 'people' },
    { name: 'QRCode',      label: 'QR Code',    icon: 'qr-code-outline',   iconActive: 'qr-code' },
  ];

  // Swipe-between-tabs PanResponder — wraps the whole Tab.Navigator
  const tabSwipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderRelease: (_, { dx, vx }) => {
        if (Math.abs(dx) < 60 && Math.abs(vx) < 0.4) return;
        const nav = tabNavRef.current;
        const st  = tabStateRef.current;
        if (!nav || !st) return;
        if (dx < 0 && st.index < TAB_CONFIG.length - 1) {
          nav.navigate(TAB_CONFIG[st.index + 1].name);
        } else if (dx > 0 && st.index > 0) {
          nav.navigate(TAB_CONFIG[st.index - 1].name);
        }
      },
    })
  ).current;

  function QRCodeStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="UniversalQR" component={UniversalQR} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        <Stack.Screen name="StaffReportAnalysis" component={StaffReportAnalysis} />
      </Stack.Navigator>
    );
  }

  const TABS_WITH_FAB = ['Users'];

  const CIRCLE = 56;
  const BAR_H = 70;
  const LIFT = 30;

  function DashboardStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminHome" component={AdminDashboard} />
        <Stack.Screen name="StaffReportAnalysis" component={StaffReportAnalysis} />
        <Stack.Screen name="ComplaintsAnalysis" component={ComplaintsAnalysis} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      </Stack.Navigator>
    );
  }

  function ComplaintsStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ComplaintsList" component={AllComplaints} />
        <Stack.Screen name="ComplaintDetail" component={ComplaintDetail} />
        <Stack.Screen name="StaffReportAnalysis" component={StaffReportAnalysis} />
        <Stack.Screen name="ComplaintsAnalysis" component={ComplaintsAnalysis} />
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
        <Stack.Screen name="StaffReportAnalysis" component={StaffReportAnalysis} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      </Stack.Navigator>
    );
  }

  function TabItem({ route, isFocused, onPress }) {
    const tab = TAB_CONFIG.find(t => t.name === route.name) ?? {
      label: route.name, icon: 'ellipse-outline', iconActive: 'ellipse',
    };

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
          {route.name === 'My Profile'
            ? <ProfileAvatar size={26} showBorder={false} />
            : <Ionicons name={tab.iconActive} size={22} color="#fff" />
          }
        </Animated.View>
        <Animated.View style={{ opacity: iconOpacity }}>
          {route.name === 'My Profile'
            ? <ProfileAvatar size={20} showBorder={false} />
            : <Ionicons name={tab.icon} size={20} color={colors.inactive} />
          }
        </Animated.View>
        <Text style={[st.label, { color: isFocused ? colors.active : colors.inactive }]}>{tab.label}</Text>
      </TouchableOpacity>
    );
  }

  function CustomTabBar({ state, navigation }) {
    // Keep refs current so the PanResponder (created once) can read latest nav state
    tabNavRef.current   = navigation;
    tabStateRef.current = state;

    const currentTab = state.routes[state.index].name;

    // Check if we're on the ROOT screen of Users or Assets stack
    // Not on AddUser, UserDetail, AddAsset, AssetDetail
    let showFab = false;
    if (currentTab === 'Users') {
      const nestedState = state.routes[state.index].state;
      const nestedIndex = nestedState?.index ?? 0;
      const nestedRouteName = nestedState?.routes?.[nestedIndex]?.name;
      if (!nestedRouteName || nestedRouteName === 'UsersList') showFab = true;
    }

    const handleFabPress = () => {
      if (currentTab === 'Users') navigation.navigate('Users', { screen: 'AddUser' });
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
    outerWrapper: { position: 'absolute', left: 12, right: 12, bottom: Platform.OS === 'ios' ? 24 : 8, overflow: 'visible' },
    spacerAboveBar: { height: LIFT, overflow: 'visible' },
    pill: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.navBg,
      borderRadius: 30, height: BAR_H, paddingHorizontal: 4,
      shadowColor: colors.sky, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22,
      shadowRadius: 18, elevation: 14, overflow: 'visible',
    },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: BAR_H, overflow: 'visible' },
    circle: {
      position: 'absolute', top: (BAR_H - CIRCLE), width: CIRCLE, height: CIRCLE,
      borderRadius: CIRCLE / 2, backgroundColor: colors.active, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: '#FFFFFF',
      shadowColor: colors.active, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
    },
    label: { position: 'absolute', bottom: 6, fontSize: 10, fontWeight: '600' },
    centerFab: {
      position: 'absolute',
      alignSelf: 'center',
      bottom: -12,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#FF9800',
      alignItems: 'center',
      justifyContent: 'center',
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

  return (
    <View style={{ flex: 1 }} {...tabSwipePan.panHandlers}>
      <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Dashboard"  component={DashboardStack} />
        <Tab.Screen name="Complaints" component={ComplaintsStack} />
        <Tab.Screen name="Users"      component={UsersStack} />
        <Tab.Screen name="QRCode"     component={QRCodeStack} />
      </Tab.Navigator>
    </View>
  );
}