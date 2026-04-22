import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { usersAPI, getFileUrl } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

const ACTIVE = '#5BA8D4';
const SKY = '#7DD3F0';
const CARD_BG = '#FFFFFF';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#5A7A8A';
const TEXT_MUT = '#9DB5C0';

const ROLE_COLORS = { role: { bg: '#E8F5FB', text: ACTIVE, dot: ACTIVE } };
const ROLE_ICONS = {
  ADMIN: <FontAwesome name="star" size={12} color={ACTIVE} />,
  STAFF: <Ionicons name="build" size={12} color={ACTIVE} />,
  USER: <Ionicons name="person" size={12} color={ACTIVE} />,
};

export default function ManageUsers({ route }) {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const fetchingRef = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!fetchingRef.current) fetchUsers();
  }, []));

  useEffect(() => {
    if (route?.params?.initialFilter) {
      setFilterRole(route.params.initialFilter);
      navigation.setParams({ initialFilter: undefined });
    }
  }, [route?.params?.initialFilter]);

  useEffect(() => {
    const unsubscribe = navigation.getParent()?.addListener('tabPress', () => {
      if (!route?.params?.initialFilter) {
        setFilterRole('ALL');
        setSearchQuery('');
      }
    });
    return unsubscribe;
  }, [navigation, route?.params?.initialFilter]);

  const fetchUsers = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const r = await usersAPI.getAll();
      if (r.data.success) setUsers(r.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // ════════════════════════════════════════
  // Build dynamic filter options from users
  // ════════════════════════════════════════
  const buildFilterOptions = () => {
    const baseOptions = [
      { key: 'ALL', label: t('allUsers'), icon: 'people-outline', color: ACTIVE },
      { key: 'ADMIN', label: t('admins'), icon: 'star-outline', color: '#FF9800' },
      { key: 'STAFF', label: t('allStaff'), icon: 'build-outline', color: '#2196F3' },
      { key: 'STAFF_ON_DUTY', label: t('staffOnDuty'), icon: 'checkmark-circle-outline', color: '#4CAF50' },
      { key: 'ON_LEAVE', label: t('onLeaveStatus'), icon: 'airplane-outline', color: '#F44336' },
    ];

    // Get unique designations from staff users
    const designations = [...new Set(
      users
        .filter(u => u.role === 'STAFF' && u.staff_details?.designation)
        .map(u => u.staff_details.designation)
    )].sort();

    // Add designation filters
    const designationOptions = designations.map(d => ({
      key: `DESIG_${d}`,
      label: d,
      icon: 'briefcase-outline',
      color: '#607D8B',
      isDesignation: true,
    }));

    const userOption = { key: 'USER', label: t('users'), icon: 'person-outline', color: '#9C27B0' };

    return [...baseOptions, ...designationOptions, userOption];
  };

  const filterOptions = buildFilterOptions();

  const getFiltered = () => {
    let f = [...users];
    if (filterRole === 'ON_LEAVE') {
      f = f.filter(u => u.availability?.is_on_leave === true);
    } else if (filterRole === 'STAFF_ON_DUTY') {
      f = f.filter(u => u.role === 'STAFF' && !u.availability?.is_on_leave);
    } else if (filterRole.startsWith('DESIG_')) {
      const desig = filterRole.replace('DESIG_', '');
      f = f.filter(u => u.role === 'STAFF' && u.staff_details?.designation === desig);
    } else if (filterRole !== 'ALL') {
      f = f.filter(u => u.role === filterRole);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.staff_details?.employee_id?.toLowerCase().includes(q)
      );
    }
    return f;
  };

  const getFilterCount = (key) => {
    if (key === 'ALL') return users.length;
    if (key === 'ON_LEAVE') return users.filter(u => u.availability?.is_on_leave === true).length;
    if (key === 'STAFF_ON_DUTY') return users.filter(u => u.role === 'STAFF' && !u.availability?.is_on_leave).length;
    if (key.startsWith('DESIG_')) {
      const desig = key.replace('DESIG_', '');
      return users.filter(u => u.role === 'STAFF' && u.staff_details?.designation === desig).length;
    }
    return users.filter(u => u.role === key).length;
  };

  const getActiveFilterLabel = () => {
    return filterOptions.find(o => o.key === filterRole)?.label || t('all');
  };

  const getActiveFilterColor = () => {
    return filterOptions.find(o => o.key === filterRole)?.color || ACTIVE;
  };

  const toggleAvailability = async (userId, currentStatus, userName) => {
    const newStatus = !currentStatus;
    Alert.alert(
      newStatus ? t('markOnLeaveTitle') : t('markAvailableTitle'),
      t('markStatusMessage').replace('user', userName).replace('status', newStatus ? t('onLeaveStatus') : t('available')),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: async () => {
            try {
              const r = await usersAPI.toggleLeave(userId);
              if (r.data.success) {
                // Update only this user's availability in local state — no full refetch
                setUsers(prev => prev.map(u => {
                  const uid = u._id?.toString() || u.id?.toString();
                  const target = userId?.toString();
                  return uid === target
                    ? { ...u, availability: { ...(u.availability || {}), is_on_leave: newStatus } }
                    : u;
                }));
              }
            } catch (e) {
              Alert.alert(t('error'), e.message);
            }
          },
        },
      ]
    );
  };

  const filtered = getFiltered();
  const onLeaveCount = users.filter(u => u.role === 'STAFF' && u.availability?.is_on_leave).length;
  const availCount = users.filter(u => u.role === 'STAFF' && !u.availability?.is_on_leave).length;

  const fixedHeaderContent = (
    <View style={s.headerRow}>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={TEXT_MUT} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder={t('searchUsers')}
          placeholderTextColor={TEXT_MUT}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={TEXT_MUT} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[s.filterButton, filterRole !== 'ALL' && s.filterButtonActive]}
        onPress={() => setShowFilterModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="filter-outline"
          size={20}
          color={filterRole !== 'ALL' ? '#FFF' : ACTIVE}
        />
      </TouchableOpacity>
    </View>
  );

  const renderUser = ({ item }) => {
    const rs = ROLE_COLORS.role;
    return (
      <TouchableOpacity
        style={[s.card, item.availability?.is_on_leave && s.cardOnLeave]}
        onPress={() => navigation.navigate('UserDetail', { user: item })}
        activeOpacity={0.88}
      >
        <View style={s.cardRow}>
          {item.photo_url ? (
            <Image source={{ uri: getFileUrl(item.photo_url) }} style={s.avatar} />
          ) : (
            <View style={[s.avatarFallback, { backgroundColor: rs.dot }]}>
              <Text style={s.avatarInitial}>{item.full_name?.charAt(0) ?? '?'}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.userName}>{item.full_name || t('noName')}</Text>
              {item.availability?.is_on_leave && (
                <View style={s.leavePill}>
                  <Ionicons name="home-outline" size={10} color="#FFF" />
                  <Text style={s.leavePillText}> {t('onLeave')}</Text>
                </View>
              )}
              {item.role === 'STAFF' && !item.availability?.is_on_leave && (
                <View style={s.onDutyPill}>
                  <Ionicons name="checkmark-circle" size={10} color="#FFF" />
                  <Text style={s.onDutyPillText}> {t('onDuty')}</Text>
                </View>
              )}
            </View>
            <Text style={s.userEmail}>{item.email}</Text>
            {item.staff_details?.employee_id && <Text style={s.userMeta}>ID: {item.staff_details.employee_id}</Text>}
            {item.staff_details?.designation && <Text style={[s.userMeta, { color: ACTIVE }]}>{item.staff_details.designation}</Text>}
          </View>
          <View style={[s.roleBadge, { backgroundColor: rs.bg }]}>
            {ROLE_ICONS[item.role]}
            <Text style={[s.roleText, { color: rs.text }]}> {item.role}</Text>
          </View>
        </View>
        {item.role === 'STAFF' && (
          <TouchableOpacity
            style={[s.actionBtn, item.availability?.is_on_leave ? s.actionBtnAvail : s.actionBtnLeave]}
            onPress={() => toggleAvailability(item.id, item.availability?.is_on_leave, item.full_name || item.email)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={item.availability?.is_on_leave ? 'checkmark-circle-outline' : 'home-outline'}
              size={15}
              color={item.availability?.is_on_leave ? '#2E7D32' : '#E65100'}
            />
            <Text style={[
              s.actionBtnText,
              item.availability?.is_on_leave ? s.actionBtnTextAvail : s.actionBtnTextLeave,
            ]}>
              {item.availability?.is_on_leave ? `  ${t('markAvailable')}` : `  ${t('markOnLeave')}`}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Check if first designation in list for section header
  const isFirstDesignation = (index) => {
    const option = filterOptions[index];
    if (!option?.isDesignation) return false;
    if (index === 0) return true;
    return !filterOptions[index - 1]?.isDesignation;
  };

  return (
    <ScreenLayout
      title={t('manageUsers')}
      scroll={false}
      fixedHeader={fixedHeaderContent}
      showDecor
      transparentFixedHeader
      padBottom={0}
    >
      {filterRole !== 'ALL' && (
        <View style={s.activeFilterRow}>
          <View style={[s.activeFilterPill, { backgroundColor: `${getActiveFilterColor()}15` }]}>
            <View style={[s.activeFilterDot, { backgroundColor: getActiveFilterColor() }]} />
            <Text style={[s.activeFilterText, { color: getActiveFilterColor() }]}>
              {getActiveFilterLabel()}
            </Text>
            <TouchableOpacity
              onPress={() => setFilterRole('ALL')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={16} color={getActiveFilterColor()} />
            </TouchableOpacity>
          </View>
          <Text style={s.countText}>{filtered.length} {t('results')}</Text>
        </View>
      )}

      {filterRole === 'ALL' && (
        <View style={s.statsBar}>
          <Text style={s.countTextAll}>{filtered.length} {t('usersCount')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[s.statPill, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#4CAF50" />
              <Text style={[s.statPillText, { color: '#2E7D32' }]}> {availCount}</Text>
            </View>
            <View style={[s.statPill, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="home-outline" size={12} color="#E65100" />
              <Text style={[s.statPillText, { color: '#E65100' }]}> {onLeaveCount}</Text>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchUsers} tintColor={ACTIVE} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={50} color={TEXT_MUT} />
            <Text style={s.emptyTitle}>
              {filterRole === 'ALL' ? t('noUsersFound')
                : filterRole === 'ON_LEAVE' ? t('noStaffOnDuty')
                : filterRole === 'STAFF_ON_DUTY' ? t('noStaffOnDuty')
                : filterRole.startsWith('DESIG_') ? `${t('noUsersRole')} ${filterRole.replace('DESIG_', '')}`
                : `${t('noUsersRole')} ${filterRole}`}
            </Text>
            <Text style={s.emptyText}>{t('tryDifferentFilter')}</Text>
          </View>
        }
      />

      {/* ════════════════════════════════════════ */}
      {/* Filter Modal with Dynamic Designations  */}
      {/* ════════════════════════════════════════ */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t('filterUsers')}</Text>

            <FlatList
              data={filterOptions}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420 }}
              renderItem={({ item: option, index }) => (
                <>
                  {isFirstDesignation(index) && (
                    <View style={s.sectionHeader}>
                      <View style={s.sectionDivider} />
                      <Text style={s.sectionHeaderText}>{t('byDesignation')}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      s.filterOption,
                      filterRole === option.key && s.filterOptionActive,
                    ]}
                    onPress={() => {
                      setFilterRole(option.key);
                      setShowFilterModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      s.filterOptionIcon,
                      {
                        backgroundColor: filterRole === option.key
                          ? `${option.color}15` : '#F2F6F8',
                      },
                    ]}>
                      <Ionicons name={option.icon} size={18} color={option.color} />
                    </View>
                    <Text style={[
                      s.filterOptionLabel,
                      filterRole === option.key && { fontWeight: '700', color: option.color },
                    ]}>
                      {option.label}
                    </Text>
                    <View style={[
                      s.filterOptionCount,
                      {
                        backgroundColor: filterRole === option.key
                          ? `${option.color}20` : '#F2F6F8',
                      },
                    ]}>
                      <Text style={[s.filterOptionCountText, { color: option.color }]}>
                        {getFilterCount(option.key)}
                      </Text>
                    </View>
                    {filterRole === option.key && (
                      <Ionicons name="checkmark-circle" size={20} color={option.color} />
                    )}
                  </TouchableOpacity>
                </>
              )}
            />

            <TouchableOpacity
              style={s.modalCloseBtn}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={s.modalCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}

// Styles remain exactly the same
const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', height: 44,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 12,
    paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_PRI },
  filterButton: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  filterButtonActive: { backgroundColor: ACTIVE, borderColor: ACTIVE },
  activeFilterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, marginTop: 4,
  },
  activeFilterPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20, gap: 6,
  },
  activeFilterDot: { width: 7, height: 7, borderRadius: 4 },
  activeFilterText: { fontSize: 12, fontWeight: '700' },
  countText: { fontSize: 12, color: TEXT_MUT },
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, marginTop: 4,
  },
  countTextAll: { fontSize: 13, color: TEXT_SEC, fontWeight: '600' },
  statPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12,
  },
  statPillText: { fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12, maxHeight: '75%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRI, marginBottom: 16 },
  sectionHeader: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 6 },
  sectionDivider: { height: 1, backgroundColor: '#EEF4F8', marginBottom: 10 },
  sectionHeaderText: {
    fontSize: 11, fontWeight: '700', color: TEXT_MUT,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  filterOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, gap: 12,
  },
  filterOptionActive: { backgroundColor: '#F0F8FF' },
  filterOptionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterOptionLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT_PRI },
  filterOptionCount: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginRight: 4 },
  filterOptionCountText: { fontSize: 12, fontWeight: '700' },
  modalCloseBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F2F6F8', alignItems: 'center' },
  modalCloseBtnText: { fontSize: 15, fontWeight: '600', color: TEXT_SEC },
  card: {
    backgroundColor: CARD_BG, borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  cardOnLeave: { borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  avatarFallback: {
    width: 50, height: 50, borderRadius: 25, alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  avatarInitial: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  userName: { fontSize: 15, fontWeight: '700', color: TEXT_PRI },
  leavePill: {
    backgroundColor: '#FF9800', borderRadius: 10, paddingHorizontal: 8,
    paddingVertical: 2, flexDirection: 'row', alignItems: 'center',
  },
  leavePillText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  onDutyPill: {
    backgroundColor: '#4CAF50', borderRadius: 10, paddingHorizontal: 8,
    paddingVertical: 2, flexDirection: 'row', alignItems: 'center',
  },
  onDutyPillText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  userEmail: { fontSize: 12, color: TEXT_SEC, marginTop: 3 },
  userMeta: { fontSize: 11, color: TEXT_MUT, marginTop: 2 },
  roleBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center' },
  roleText: { fontSize: 11, fontWeight: '700' },
  actionBtn: {
    paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#EEF4F8',
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  actionBtnLeave: { backgroundColor: '#FFF8F0' },
  actionBtnAvail: { backgroundColor: '#F0FBF5' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  actionBtnTextLeave: { color: '#E65100' },
  actionBtnTextAvail: { color: '#2E7D32' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT_SEC },
  emptyText: { color: TEXT_MUT, fontSize: 13, textAlign: 'center' },
});