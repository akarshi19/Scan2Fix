import React from 'react';
import {
  View, Text, StyleSheet, Dimensions, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ProfileMenu from './ProfileMenu';
import BackButton from './BackButton';

const { width: screenWidth } = Dimensions.get('window');

export default function ScreenLayout({
  children,
  title,
  showBack = false,
  showProfile = true,
  refreshing = false,
  onRefresh,
  scroll = true,
  fixedHeader,
  padBottom = 140,
}) {
  const { colors } = useTheme();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.screen, { backgroundColor: colors.pageBg }]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.pageBg} />

        {/* Fixed Top Bar */}
        <View style={[s.fixedHeader, { backgroundColor: colors.pageBg }]}>
          {showBack && <BackButton color={colors.textPri} style={s.backBtn} />}
          {title && (
            <Text style={[s.title, { color: colors.textPri }, showBack && { marginLeft: 48 }]}>
              {title}
            </Text>
          )}
          {showProfile && <ProfileMenu />}
        </View>

        {fixedHeader && (
          <View style={[s.fixedContent, { backgroundColor: colors.pageBg }]}>{fixedHeader}</View>
        )}

        {scroll ? (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: padBottom }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.active} />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 16 }}>{children}</View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  fixedHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
    paddingHorizontal: 16, paddingBottom: 12, zIndex: 10,
  },
  backBtn: { position: 'relative', top: 0, left: 0 },
  title: { fontSize: 24, fontWeight: '800', flex: 1 },
  fixedContent: { paddingHorizontal: 16, zIndex: 9 },
  scroll: { flex: 1 },
});