import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

export default function UserDashboard({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
   <ScreenLayout title={`${t('welcome')}, ${user?.full_name || 'User'}!`} showDecor>

      {/* Main Action - Scan QR */}
      <TouchableOpacity
        style={[s.scanButton, { backgroundColor: colors.cardBg }]}
        onPress={() => navigation.navigate('ScanQR')}
        activeOpacity={0.85}
      >
        <Ionicons name="qr-code-outline" size={50} color="#000" />
        <Text style={s.scanTitle}>{t('scanQR')}</Text>
        <Text style={s.scanSubtitle}>{t('reportIssue')}</Text>
      </TouchableOpacity>

      {/* Info Card */}
      <View style={[s.infoCard, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.infoTitle, { color: colors.textPri }]}>{t('howItWorks')}</Text>
        <InfoStep icon="qr-code-outline" text={t('step1')} colors={colors} />
        <InfoStep icon="create-outline" text={t('step2')} colors={colors} />
        <InfoStep icon="camera-outline" text={t('step3')} colors={colors} />
        <InfoStep icon="checkmark-circle-outline" text={t('step4')} colors={colors} last />
      </View>
    </ScreenLayout>
  );
}

function InfoStep({ icon, text, colors, last }) {
  return (
    <View style={[s.stepRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <View style={[s.stepIconWrap, { backgroundColor: `${colors.active}15` }]}>
        <Ionicons name={icon} size={18} color={colors.active} />
      </View>
      <Text style={[s.stepText, { color: colors.textSec }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scanButton: {
    padding: 30, borderRadius: 18, alignItems: 'center', marginBottom: 24, borderColor: "#000", borderWidth: 1, marginTop: 10,
    shadowColor: '#5BA8D4', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8, 
  },
  scanTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginTop: 10 },
  scanSubtitle: { fontSize: 8, color: '#000', marginTop: 5 },
  infoCard: {
    padding: 20, borderRadius: 16,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  stepIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  stepText: { flex: 1, fontSize: 14, fontWeight: '500' },
});