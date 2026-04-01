import React from 'react';
import {
  View, Text, StyleSheet, Dimensions, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  padBottom = 40,
  showDecor = false,
  transparentFixedHeader = false,
  headerRight,
}) {
  const { colors } = useTheme();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.screen, { backgroundColor: colors.pageBg }]}>
        <StatusBar
          barStyle={showDecor ? 'light-content' : colors.statusBar}
          backgroundColor={colors.pageBg}
        />

        {/* Decorative Shapes */}
        {showDecor && (
          <View style={s.topDecoration} pointerEvents="none">
            <View style={s.shapeBack}>
              <LinearGradient
                colors={['#004e68', '#004e68']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.shapeGradient}
              />
            </View>
            <View style={s.shapeFront}>
              <LinearGradient
                colors={['#8CD6F7', '#8CD6F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.shapeGradient}
              />
            </View>
          </View>
        )}

        {/* Fixed Top Bar */}
        <View style={[
          s.fixedHeader,
          { backgroundColor: showDecor ? 'transparent' : colors.pageBg },
        ]}>
          {showBack && (
            <BackButton
              color={showDecor ? '#000' : colors.navBg}
              style={s.backBtn}
            />
          )}
          {title && (
            <Text
              style={[
                s.title,
                { color: showDecor ? '#ffffff' : colors.textPri },
                showBack && { marginLeft: 48 },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}

          {/* Right side — in the same flex row as title */}
          {headerRight ? (
            <View style={s.headerRightWrap}>{headerRight}</View>
          ) : (
            showProfile && (
              <View style={s.profileWrap}>
                <ProfileMenu />
              </View>
            )
          )}
        </View>

        {/* Fixed Header Content */}
        {fixedHeader && (
          <View style={[
            s.fixedContent,
            { backgroundColor: transparentFixedHeader ? 'transparent' : colors.pageBg },
          ]}>
            {fixedHeader}
          </View>
        )}

        {/* Content */}
        {scroll ? (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 4,
              paddingBottom: padBottom,
            }}
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
          <View style={s.contentStatic}>{children}</View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  topDecoration: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 200, overflow: 'hidden', zIndex: 0,
  },
  shapeBack: {
    position: 'absolute', width: screenWidth * 0.85, height: 180,
    top: -80, left: screenWidth * 0.25,
    transform: [{ rotate: '15deg' }], borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 4, height: -2 },
    shadowOpacity: 0.13, shadowRadius: 4, elevation: 0,
  },
  shapeFront: {
    position: 'absolute', width: screenWidth * 0.75, height: 180,
    top: -60, left: -screenWidth * 0.05,
    transform: [{ rotate: '15deg' }], borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 4, height: -2 },
    shadowOpacity: 0.13, shadowRadius: 4, elevation: 0,
  },
  shapeGradient: { flex: 1, borderRadius: 24 },

  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 66 : 58,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
    elevation: 10,
  },
  backBtn: { position: 'relative', top: 0, left: 0 },
  title: {
  fontSize: 24,
  fontWeight: '800',
  flex: 1,
  color: '#fff', // or your dynamic color
  textShadowColor: '#000',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
},

  // Profile menu — sits in the flex row, aligned with title
  profileWrap: {
    marginLeft: 'auto',
  },

  // Custom header right — also in the flex row
  headerRightWrap: {
    marginLeft: 'auto',
  },

  fixedContent: { paddingHorizontal: 16, zIndex: 9, elevation: 9 },
  scroll: { flex: 1, zIndex: 5, elevation: 5 },
  contentStatic: { flex: 1, paddingHorizontal: 16, zIndex: 5, elevation: 5 },
});