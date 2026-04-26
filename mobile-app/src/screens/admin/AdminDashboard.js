import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { complaintsAPI, reportsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

export default function AdminDashboard({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    total: 0, open: 0, assigned: 0, inProgress: 0, closed: 0,
    staffOnDuty: 0, staffUnavailable: 0,
  });
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation]);

  const fetchData = async () => {
    try {
      const ov = await reportsAPI.overview();
      if (ov.data.success) {
        const c = ov.data.data.complaints;
        const u = ov.data.data.users;
        setStats({
          total: c.total, open: c.open, assigned: c.assigned,
          inProgress: c.inProgress, closed: c.closed,
          staffOnDuty: u.staffAvailable || 0,
          staffUnavailable: u.staffOnLeave || 0,
        });
      }
      const cr = await complaintsAPI.getAll();
      if (cr.data.success) setRecentComplaints(cr.data.data.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════
  // Navigation handlers for each stat
  // ════════════════════════════════════════
  const handleStatPress = (key) => {
    switch (key) {
      case 'total':
        navigation.navigate('Complaints', {
          screen: 'ComplaintsList',
          params: { initialFilter: 'ALL' },
        });
        break;

      case 'open':
        navigation.navigate('Complaints', {
          screen: 'ComplaintsList',
          params: { initialFilter: 'OPEN' },
        });
        break;

      case 'assigned':
        navigation.navigate('Complaints', {
          screen: 'ComplaintsList',
          params: { initialFilter: 'ASSIGNED' },
        });
        break;

      case 'inProgress':
        navigation.navigate('Complaints', {
          screen: 'ComplaintsList',
          params: { initialFilter: 'IN_PROGRESS' },
        });
        break;

      case 'closed':
        navigation.navigate('Complaints', {
          screen: 'ComplaintsList',
          params: { initialFilter: 'CLOSED' },
        });
        break;

      case 'staffOnDuty':
        navigation.navigate('Users', {
          screen: 'UsersList',
          params: { initialFilter: 'STAFF_ON_DUTY' },
        });
        break;

      case 'staffUnavailable':
        navigation.navigate('Users', {
          screen: 'UsersList',
          params: { initialFilter: 'ON_LEAVE' },
        });
        break;

      default:
        break;
    }
  };

  const STAT_ROWS = [
    { key: 'total',            value: stats.total,            label: t('totalComplaints'),      icon: 'list',                     color: colors.active },
    { key: 'open',             value: stats.open,             label: t('openComplaints'),       icon: 'folder-open-outline',      color: colors.open },
    { key: 'assigned',         value: stats.assigned,         label: t('assignedComplaints'),   icon: 'person-circle-outline',    color: colors.assigned },
    { key: 'inProgress',       value: stats.inProgress,       label: t('inProgressComplaints'), icon: 'sync-outline',             color: colors.inProgress },
    { key: 'staffOnDuty',      value: stats.staffOnDuty,      label: t('staffOnDuty'),          icon: 'person-outline',           color: colors.staffOnDuty },
    { key: 'staffUnavailable', value: stats.staffUnavailable, label: t('staffUnavailable'),     icon: 'person-remove-outline',    color: colors.staffUnavailable },
    { key: 'closed',           value: stats.closed,           label: t('closedComplaints'),     icon: 'checkmark-circle-outline', color: colors.closed },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return colors.open;
      case 'ASSIGNED': return colors.assigned;
      case 'IN_PROGRESS': return colors.inProgress;
      case 'CLOSED': return colors.closed;
      case 'FINISHING': return colors.finishing;
      default: return colors.totalAssets;
    }
  };

  const s = StyleSheet.create({
    subtitle: { fontSize: 13, color: colors.textPri, fontWeight: '500' },
    statRow: {
      flexDirection: 'row', alignItems: 'center', borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 14,
      shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    },
    statIconWrap: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    statLabel: { flex: 1, fontSize: 14, marginLeft: 12, fontWeight: '500', color: colors.textSec },
    statValueWrap: {
      minWidth: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
    },
    statValue: { fontSize: 16, fontWeight: '800' },
    chevron: { marginLeft: 6 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPri },
    actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    actionBtn: {
      flex: 1, height: 70, borderRadius: 14, alignItems: 'center',
      justifyContent: 'center', gap: 6,
      shadowColor: colors.active, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
    },
    actionBtnText: {
      color: colors.white, fontSize: 11, fontWeight: '600',
      textAlign: 'center', lineHeight: 15,
    },
    recentSection: {
      borderRadius: 14, padding: 6,
      shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    },
    recentRow: {
      flexDirection: 'row', alignItems: 'center', padding: 12,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    recentAsset: { fontWeight: '700', fontSize: 14 },
  });

  return (
    <ScreenLayout
      title={`${t('welcome')}, ${user?.full_name || t('admin')}!`}
      refreshing={loading}
      onRefresh={fetchData}
      showDecor
      padBottom={100}
    >
      <Text style={s.subtitle}>{t('trackManage')}</Text>

      {/* ════════════════════════════════════════ */}
      {/* Stat Rows — Tappable                     */}
      {/* ════════════════════════════════════════ */}
      <View style={{ gap: 8, marginBottom: 20, marginTop: 16 }}>
        {STAT_ROWS.map(({ key, value, label, icon, color }) => (
          <TouchableOpacity
            key={key}
            style={[s.statRow, { backgroundColor: colors.cardBg }]}
            onPress={() => handleStatPress(key)}
            activeOpacity={0.75}
          >
            <View style={[s.statIconWrap, { backgroundColor: `${color}15` }]}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={s.statLabel}>{label}</Text>
            <View style={[s.statValueWrap, { backgroundColor: `${color}15` }]}>
              <Text style={[s.statValue, { color }]}>{value}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMut}
              style={s.chevron}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* ════════════════════════════════════════ */}
      {/* Quick Actions                            */}
      {/* ════════════════════════════════════════ */}
      <View style={s.sectionHeader}>
        <AntDesign name="appstore" size={18} color={colors.textPri} />
        <Text style={s.sectionTitle}>  {t('quickActions')}</Text>
      </View>
      <View style={s.actionsRow}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.button }]}
          onPress={() => navigation.navigate('Complaints')}
          activeOpacity={0.85}
        >
          <Ionicons name="clipboard-outline" size={22} color={colors.white} />
          <Text style={s.actionBtnText}>{t('viewAllComplaints')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: stats.open > 0 ? colors.button : colors.active }]}
          onPress={() => navigation.navigate('Complaints', {
            screen: 'ComplaintsList',
            params: { initialFilter: 'OPEN' },
          })}
          activeOpacity={0.85}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
          <Text style={s.actionBtnText}>
            {stats.open} {t('needAssignment')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.button }]}
          onPress={() => navigation.navigate('ComplaintsAnalysis')}
          activeOpacity={0.85}
        >
          <Ionicons name="bar-chart-outline" size={22} color={colors.white} />
          <Text style={s.actionBtnText}>{t('complaintAnalysis')}</Text>
        </TouchableOpacity>
      </View>

      {/* ════════════════════════════════════════ */}
      {/* Recent Complaints                        */}
      {/* ════════════════════════════════════════ */}
      <View style={s.sectionHeader}>
        <Ionicons name="time-outline" size={18} color={colors.textPri} />
        <Text style={s.sectionTitle}>  {t('recentComplaints')}</Text>
      </View>
      <View style={[s.recentSection, { backgroundColor: colors.cardBg }]}>
        {recentComplaints.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 30 }}>
            <Ionicons name="document-text-outline" size={40} color={colors.textMut} />
            <Text style={{ color: colors.textMut, marginTop: 10 }}>
              {t('noComplaints')}
            </Text>
          </View>
        ) : (
          recentComplaints.map((item, idx) => (
            <TouchableOpacity
              key={item._id || idx}
              style={[s.recentRow, idx === recentComplaints.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('Complaints', {
                screen: 'ComplaintDetail',
                params: { complaint: item },
              })}
              activeOpacity={0.7}
            >
              <View style={[s.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.recentAsset, { color: colors.textPri }]}>{item.complaint_number}</Text>
                <Text style={{ color: colors.textMut, fontSize: 12, marginTop: 2 }}>
                  {[item.station, item.area].filter(Boolean).join(' › ')}
                </Text>
              </View>
              <Text style={{ color: colors.textMut, fontSize: 10 }}>
                {new Date(item.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short',
                })}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScreenLayout>
  );
}