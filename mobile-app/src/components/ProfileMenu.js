import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getFileUrl } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ProfileMenu() {
  const [visible, setVisible] = useState(false);
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigation = useNavigation();

  const photoUrl = getFileUrl(user?.photo_url);

  const getInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return '?';
  };

  const handleProfilePress = () => {
    setVisible(false);
    navigation.navigate('Dashboard', { screen: 'ProfileScreen' });
    // Navigate based on role
    // if (role === 'ADMIN') {
    //   navigation.navigate('My Profile');
    // } else if (role === 'STAFF') {
    //   navigation.navigate('Profile');
    // } else {
    //   navigation.navigate('Profile');
    // }
  };

  return (
    <>
      {/* Profile Button — Fixed top right */}
      <TouchableOpacity style={s.avatarBtn} onPress={() => setVisible(true)} activeOpacity={0.8}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={s.avatarImg} />
        ) : (
          <View style={[s.avatarFallback, { backgroundColor: colors.active }]}>
            <Text style={s.avatarInitial}>{getInitial()}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dropdown Menu */}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={[s.menu, { backgroundColor: colors.cardBg }]}>
            {/* User Info */}
            <View style={s.menuHeader}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={s.menuAvatar} />
              ) : (
                <View style={[s.menuAvatarFallback, { backgroundColor: colors.active }]}>
                  <Text style={s.menuAvatarInitial}>{getInitial()}</Text>
                </View>
              )}
              <View style={s.menuUserInfo}>
                <Text style={[s.menuUserName, { color: colors.textPri }]} numberOfLines={1}>
                  {user?.full_name || 'User'}
                </Text>
                <Text style={[s.menuUserEmail, { color: colors.textMut }]} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>

            <View style={[s.menuDivider, { backgroundColor: colors.divider }]} />

            {/* My Profile */}
            <TouchableOpacity style={s.menuItem} onPress={handleProfilePress}>
              <Ionicons name="person-outline" size={20} color={colors.textSec} />
              <Text style={[s.menuItemText, { color: colors.textPri }]}>{t('profileInfo')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMut} />
            </TouchableOpacity>

            {/* Theme Toggle */}
            {/* <TouchableOpacity style={s.menuItem} onPress={toggleTheme}>
              <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.textSec} />
              <Text style={[s.menuItemText, { color: colors.textPri }]}>{t('theme')}</Text>
              <View style={[s.toggleTrack, { backgroundColor: theme === 'dark' ? colors.active : '#E0E0E0' }]}>
                <View style={[s.toggleThumb, { left: theme === 'dark' ? 20 : 2 }]} />
              </View>
            </TouchableOpacity> */}

            {/* Language */}
            {/* <TouchableOpacity
              style={s.menuItem}
              onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            >
              <Ionicons name="language-outline" size={20} color={colors.textSec} />
              <Text style={[s.menuItemText, { color: colors.textPri }]}>{t('language')}</Text>
              <View style={[s.langBadge, { backgroundColor: `${colors.active}20` }]}>
                <Text style={[s.langBadgeText, { color: colors.active }]}>
                  {language === 'en' ? 'EN' : 'हि'}
                </Text>
              </View>
            </TouchableOpacity> */}

            <View style={[s.menuDivider, { backgroundColor: colors.divider }]} />

            {/* Logout */}
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => { setVisible(false); signOut(); }}
            >
              <Ionicons name="log-out-outline" size={20} color="#E53935" />
              <Text style={[s.menuItemText, { color: '#E53935' }]}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  avatarBtn: {
    position: 'absolute', top: 46, right: 16, zIndex: 100,
    width: 38, height: 38, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 5,
  },
  avatarImg: { width: 38, height: 38, borderRadius: 12 },
  avatarFallback: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 90, paddingRight: 16,
  },
  menu: {
    width: 260, borderRadius: 16, padding: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
  },
  menuAvatar: { width: 44, height: 44, borderRadius: 14, marginRight: 12 },
  menuAvatarFallback: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  menuAvatarInitial: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  menuUserInfo: { flex: 1 },
  menuUserName: { fontSize: 15, fontWeight: '700' },
  menuUserEmail: { fontSize: 11, marginTop: 2 },
  menuDivider: { height: 1, marginHorizontal: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    paddingHorizontal: 12, borderRadius: 10, gap: 12,
  },
  menuItemText: { flex: 1, fontSize: 14, fontWeight: '500' },
  toggleTrack: {
    width: 40, height: 22, borderRadius: 11, position: 'relative',
  },
  toggleThumb: {
    position: 'absolute', top: 2, width: 18, height: 18,
    borderRadius: 9, backgroundColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  langBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  langBadgeText: { fontSize: 12, fontWeight: '700' },
});