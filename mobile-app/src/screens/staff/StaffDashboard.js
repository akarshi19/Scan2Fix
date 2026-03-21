import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
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

  // Get status filter from route params (set by StaffStack tabs)
  const statusFilter = route?.params?.statusFilter || 'ASSIGNED';

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
      fetchLeaveStatus();
    }, [statusFilter])
  );

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await complaintsAPI.getStaffJobs(statusFilter);
      if (response.data.success) setJobs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
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
    setLeaveLoading(true);
    const message = !isOnLeave
      ? 'You will not receive new task assignments while on leave. Continue?'
      : 'You will start receiving new task assignments. Continue?';

    Alert.alert(
      !isOnLeave ? t('markOnLeave') : t('markAvailable'),
      message,
      [
        { text: t('cancel'), style: 'cancel', onPress: () => setLeaveLoading(false) },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const response = await usersAPI.toggleSelfLeave();
              if (response.data.success) {
                setIsOnLeave(!isOnLeave);
                Alert.alert(t('success'), response.data.message);
              }
            } catch (error) {
              Alert.alert(t('error'), error.message);
            } finally {
              setLeaveLoading(false);
            }
          },
        },
      ]
    );
  };

  // Determine which JobDetails screen to navigate to based on current tab
  const getJobDetailsScreen = () => {
    if (statusFilter === 'IN_PROGRESS') return 'JobDetailsIP';
    if (statusFilter === 'CLOSED') return 'JobDetailsC';
    return 'JobDetails';
  };

  const renderJob = ({ item }) => (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.cardBg }]}
      onPress={() => navigation.navigate(getJobDetailsScreen(), { job: item })}
      activeOpacity={0.85}
    >
      <View style={s.cardHeader}>
        <Text style={[s.assetId, { color: colors.textPri }]}>{item.asset_id}</Text>
        <View style={[s.typeBadge, { backgroundColor: `${colors.active}15` }]}>
          <Text style={[s.assetType, { color: colors.active }]}>{item.assets?.type}</Text>
        </View>
      </View>
      <View style={s.locationRow}>
        <Ionicons name="location-outline" size={14} color={colors.textMut} />
        <Text style={[s.location, { color: colors.textSec }]}> {item.assets?.location}</Text>
      </View>
      <Text style={[s.description, { color: colors.textSec }]} numberOfLines={2}>{item.description}</Text>
      {item.photo_url && (
        <View style={s.photoIndicator}>
          <Ionicons name="image-outline" size={14} color={colors.textMut} />
          <Text style={[s.photoText, { color: colors.textMut }]}> Has attached photo</Text>
        </View>
      )}
      <View style={[s.cardFooter, { borderTopColor: colors.divider }]}>
        <Text style={[s.date, { color: colors.textMut }]}>
          {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <View style={s.tapHintRow}>
          <Text style={[s.tapHint, { color: colors.active }]}>View details</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.active} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const getTitle = () => {
    switch (statusFilter) {
      case 'ASSIGNED': return t('notStarted');
      case 'IN_PROGRESS': return t('inProgress');
      case 'CLOSED': return t('completed');
      default: return t('myJobs');
    }
  };

  return (
    <ScreenLayout scroll={false}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={[s.pageTitle, { color: colors.textPri }]}>{getTitle()}</Text>
          <Text style={[s.subtitle, { color: colors.textSec }]}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={[s.leaveButton, { backgroundColor: isOnLeave ? '#FF9800' : `${colors.active}20` }]}
          onPress={toggleLeaveStatus}
          disabled={leaveLoading}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isOnLeave ? 'home' : 'checkmark-circle'}
            size={14}
            color={isOnLeave ? '#FFF' : colors.active}
          />
          <Text style={[s.leaveButtonText, { color: isOnLeave ? '#FFF' : colors.active }]}>
            {' '}{isOnLeave ? t('onLeave') : t('available')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leave Banner */}
      {isOnLeave && (
        <View style={s.leaveBanner}>
          <Ionicons name="warning-outline" size={16} color="#E65100" />
          <Text style={s.leaveBannerText}>
            {' '}You are on leave. New tasks won't be assigned.
          </Text>
        </View>
      )}

      {/* Jobs count */}
      <Text style={[s.countText, { color: colors.textMut }]}>
        {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
      </Text>

      {/* Jobs List */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id?.toString() || item._id?.toString()}
        renderItem={renderJob}
        contentContainerStyle={[s.listContent, jobs.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons
              name={statusFilter === 'ASSIGNED' ? 'clipboard-outline' : statusFilter === 'IN_PROGRESS' ? 'construct-outline' : 'trophy-outline'}
              size={50}
              color={colors.textMut}
            />
            <Text style={[s.emptyTitle, { color: colors.textPri }]}>
              {statusFilter === 'ASSIGNED' && 'No new tasks'}
              {statusFilter === 'IN_PROGRESS' && 'No tasks in progress'}
              {statusFilter === 'CLOSED' && 'No completed tasks yet'}
            </Text>
            <Text style={[s.emptySubtitle, { color: colors.textMut }]}>
              {statusFilter === 'ASSIGNED' && 'New assigned tasks will appear here'}
              {statusFilter === 'IN_PROGRESS' && "Tasks you're working on will appear here"}
              {statusFilter === 'CLOSED' && 'Completed tasks will appear here'}
            </Text>
          </View>
        }
      />
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  leaveButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  leaveButtonText: { fontSize: 12, fontWeight: '600' },
  leaveBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', padding: 12, borderRadius: 10, marginBottom: 12 },
  leaveBannerText: { color: '#E65100', fontSize: 12, flex: 1 },
  countText: { fontSize: 12, fontWeight: '500', marginBottom: 12 },
  listContent: { paddingBottom: 140 },
  card: {
    borderRadius: 14, marginBottom: 12, padding: 16,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  assetId: { fontSize: 18, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  assetType: { fontSize: 11, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  location: { fontSize: 13 },
  description: { lineHeight: 20, marginBottom: 8, fontSize: 13 },
  photoIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  photoText: { fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10 },
  date: { fontSize: 12 },
  tapHintRow: { flexDirection: 'row', alignItems: 'center' },
  tapHint: { fontSize: 12, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
});