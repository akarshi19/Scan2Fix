import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { complaintsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

export default function StaffDashboard({ navigation, route }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const statusFilter = route?.params?.statusFilter || 'ASSIGNED';

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const fetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!fetchingRef.current) {
        fetchJobs();
        fetchLeaveStatus();
      }
    }, [statusFilter])
  );

  const fetchJobs = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const response = await complaintsAPI.getStaffJobs(statusFilter);
      if (response.data.success) setJobs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const fetchLeaveStatus = async () => {
    try {
      const response = await usersAPI.getLeaveStatus();
      if (response.data.success) setIsOnLeave(response.data.data?.is_on_leave || false);
    } catch (error) {
      console.error('Error fetching leave status:', error);
    }
  };

  const toggleLeaveStatus = async () => {
    const title = !isOnLeave ? t('goOnLeaveTitle') : t('comeBackTitle');
    const message = !isOnLeave ? t('goOnLeaveMsg') : t('comeBackMsg');

    Alert.alert(title, message, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: !isOnLeave ? t('yesGoOnLeave') : t('yesAvailable'),
        style: !isOnLeave ? 'destructive' : 'default',
        onPress: async () => {
          setLeaveLoading(true);
          try {
            const response = await usersAPI.toggleSelfLeave();
            if (response.data.success) {
              setIsOnLeave(!isOnLeave);
              Alert.alert(
                !isOnLeave ? t('onLeaveSuccess') : `${t('welcome')}!`,
                response.data.message
              );
            }
          } catch (error) {
            Alert.alert(t('error'), error.response?.data?.message || error.message);
          } finally {
            setLeaveLoading(false);
          }
        },
      },
    ]);
  };

  const getJobDetailsScreen = () => {
    if (statusFilter === 'IN_PROGRESS') return 'JobDetailsIP';
    if (statusFilter === 'CLOSED') return 'JobDetailsC';
    if (statusFilter === 'FINISHING') return 'JobDetailsF';
    return 'JobDetails';
  };

  const renderJob = ({ item }) => {
    const locationStr = [item.station, item.area, item.location].filter(Boolean).join(' › ');
    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: colors.cardBg }]}
        onPress={() => navigation.navigate(getJobDetailsScreen(), { job: item })}
        activeOpacity={0.85}
      >
        {/* Header: complaint number + asset type badge */}
        <View style={s.cardHeader}>
          <Text style={[s.complaintNum, { color: colors.textPri }]}>
            {item.complaint_number || '—'}
          </Text>
          <View style={[s.typeBadge, { backgroundColor: `${colors.active}15` }]}>
            <Text style={[s.assetType, { color: colors.active }]} numberOfLines={1}>
              {item.asset_type || '—'}
            </Text>
          </View>
        </View>

        {/* Location */}
        {!!locationStr && (
          <View style={s.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.active} />
            <Text style={[s.location, { color: colors.textSec }]} numberOfLines={1}>
              {' '}{locationStr}
            </Text>
          </View>
        )}

        {/* Description */}
        <Text style={[s.description, { color: colors.textSec }]} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Photo indicator */}
        {item.photo_url && (
          <View style={s.photoIndicator}>
            <Ionicons name="image-outline" size={13} color={colors.textMut} />
            <Text style={[s.photoText, { color: colors.textMut }]}> {t('hasPhoto')}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={[s.cardFooter, { borderTopColor: colors.divider }]}>
          <View style={s.footerLeft}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMut} />
            <Text style={[s.date, { color: colors.textMut }]}>
              {'  '}{new Date(item.created_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>
          <View style={s.tapHintRow}>
            <Text style={[s.tapHint, { color: colors.active }]}>{t('viewDetails')}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.active} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ═══════════════════════════════════════
  // List Header — rendered inside FlatList
  // ═══════════════════════════════════════
  const ListHeader = () => (
    <View>
      {/* ════════════════════════════════════════ */}
      {/* Status Card — Leave Toggle               */}
      {/* ════════════════════════════════════════ */}
      <View style={[s.statusCard, { backgroundColor: colors.cardBg }]}>
        <View style={s.statusCardRow}>
          {/* Left — status info */}
          <View style={s.statusInfo}>
            <View style={[
              s.statusIndicator,
              { backgroundColor: isOnLeave ? '#FFF3E0' : '#E8F5E9' },
            ]}>
              <View style={[
                s.statusDot,
                { backgroundColor: isOnLeave ? '#FF9800' : '#4CAF50' },
              ]} />
            </View>
            <View style={s.statusTextWrap}>
              <Text style={[s.statusTitle, { color: colors.textPri }]}>
                {isOnLeave ? t('onLeave') : t('available')}
              </Text>
              <Text style={[s.statusSubtext, { color: colors.textMut }]}>
                {isOnLeave ? t('notReceivingTasks') : t('receivingTasks')}
              </Text>
            </View>
          </View>

          {/* Right — toggle button */}
          <TouchableOpacity
            style={[
              s.leaveToggle,
              isOnLeave ? s.leaveToggleOn : s.leaveToggleOff,
            ]}
            onPress={toggleLeaveStatus}
            disabled={leaveLoading}
            activeOpacity={0.8}
          >
            {leaveLoading ? (
              <ActivityIndicator size="small" color={isOnLeave ? '#FFF' : '#5BA8D4'} />
            ) : (
              <>
                <Ionicons
                  name={isOnLeave ? 'return-down-back-outline' : 'airplane-outline'}
                  size={14}
                  color={isOnLeave ? '#FFF' : '#5BA8D4'}
                />
                <Text style={[
                  s.leaveToggleText,
                  { color: isOnLeave ? '#FFF' : '#5BA8D4' },
                ]}>
                  {isOnLeave ? ` ${t('comeBack')}` : ` ${t('goOnLeave')}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ════════════════════════════════════════ */}
      {/* Jobs Count                               */}
      {/* ════════════════════════════════════════ */}
      <View style={s.countRow}>
        <Text style={[s.countText, { color: colors.textMut }]}>
          {loading ? t('loading') : `${jobs.length} ${jobs.length === 1 ? t('job') : t('jobs')}`}
        </Text>
        <TouchableOpacity onPress={fetchJobs} style={s.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={16} color={colors.active} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenLayout
      title={`${t('welcome')}, ${user?.full_name || t('staff')}!`}
      showDecor
      scroll={false}
      padBottom={40}
    >
      {/* 🔹 Fixed Header */}
      <View style={{ paddingHorizontal: 16 }}>
        <ListHeader />
      </View>

      {/* 🔹 Only jobs scroll */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id?.toString() || item._id?.toString()}
        renderItem={renderJob}
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.listContent,
          jobs.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={loading}
        onRefresh={fetchJobs}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        windowSize={5}
        ListEmptyComponent={
          !loading && (
            <View style={s.empty}>
              <Ionicons
                name={
                  statusFilter === 'ASSIGNED'
                    ? 'clipboard-outline'
                    : statusFilter === 'IN_PROGRESS'
                      ? 'construct-outline'
                      : 'trophy-outline'
                }
                size={50}
                color={colors.textMut}
              />
              <Text style={[s.emptyTitle, { color: colors.textPri }]}>
                {statusFilter === 'ASSIGNED' && t('noNewTasks')}
                {statusFilter === 'IN_PROGRESS' && t('noTasksInProgress')}
                {statusFilter === 'CLOSED' && t('noCompletedTasks')}
              </Text>
              <Text style={[s.emptySubtitle, { color: colors.textMut }]}>
                {statusFilter === 'ASSIGNED' && t('newTasksHint')}
                {statusFilter === 'IN_PROGRESS' && t('inProgressHint')}
                {statusFilter === 'CLOSED' && t('completedHint')}
              </Text>
            </View>
          )
        }
      />
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  statusCard: {
    borderRadius: 14,
    padding: 16,
    shadowColor: '#A0BDD0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: 365,
    marginLeft: -16,
    marginBottom: 7,
  },
  statusCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  leaveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 120,
    justifyContent: 'center',
  },
  leaveToggleOff: {
    backgroundColor: '#EEF6FB',
    borderWidth: 1,
    borderColor: '#D0E8F2',
  },
  leaveToggleOn: {
    backgroundColor: '#FF9800',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  leaveToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
  },
  refreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EEF6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingBottom: 140 },
  card: {
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#A0BDD0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  complaintNum: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, maxWidth: 140 },
  assetType: { fontSize: 11, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  location: { fontSize: 12, flex: 1 },
  description: { lineHeight: 20, marginBottom: 8, fontSize: 13 },
  photoIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  photoText: { fontSize: 12 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center' },
  date: { fontSize: 12 },
  tapHintRow: { flexDirection: 'row', alignItems: 'center' },
  tapHint: { fontSize: 12, fontWeight: '500' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
});