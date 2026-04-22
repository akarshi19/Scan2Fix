import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, TextInput, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { complaintsAPI, getFileUrl } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

const ACTIVE = '#5BA8D4';
const SKY = '#7DD3F0';
const CARD_BG = '#FFFFFF';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#5A7A8A';
const TEXT_MUT = '#9DB5C0';

const STATUS_COLORS = {
  OPEN: '#FF9800',
  ASSIGNED: '#2196F3',
  IN_PROGRESS: '#9C27B0',
  CLOSED: '#4CAF50',
};

export default function AllComplaints({ navigation, route }) {
  const [complaints, setComplaints] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortModal, setShowSortModal] = useState(false);
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Dynamic sort options using translations
  const SORT_OPTIONS = [
    { key: 'ALL', label: t('allComplaints'), icon: 'list' },
    { key: 'OPEN', label: t('open'), icon: 'alert-circle-outline' },
    { key: 'ASSIGNED', label: t('assigned'), icon: 'person-outline' },
    { key: 'IN_PROGRESS', label: t('inProgress'), icon: 'time-outline' },
    { key: 'STAFF_ON_LEAVE', label: t('staffOnLeave'), icon: 'airplane-outline' },
    { key: 'CLOSED', label: t('closed'), icon: 'checkmark-circle-outline' },
  ];

  // Fetch on mount + focus
  useEffect(() => {
    fetchComplaints();
    const unsub = navigation.addListener('focus', fetchComplaints);
    return unsub;
  }, [navigation]);

  // Filter when data/filter/search changes
  useEffect(() => {
    filterComplaints();
  }, [complaints, activeFilter, searchQuery]);

  // Handle initialFilter from dashboard navigation
  useEffect(() => {
    if (route?.params?.initialFilter) {
      setActiveFilter(route.params.initialFilter);
      navigation.setParams({ initialFilter: undefined });
    }
  }, [route?.params?.initialFilter]);

  // Reset filter when Complaints tab is pressed directly
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    const unsubscribe = parent.addListener('tabPress', () => {
      if (!route?.params?.initialFilter) {
        setActiveFilter('ALL');
        setSearchQuery('');
      }
    });
    return unsubscribe;
  }, [navigation, route?.params?.initialFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const r = await complaintsAPI.getAll();
      if (r.data.success) {
        setComplaints(r.data.data || []);
      }
    } catch (e) {
      console.error('fetchComplaints error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaints = () => {
    let result = [...complaints];
    if (activeFilter === 'STAFF_ON_LEAVE') {
      result = result.filter(c => c.profiles?.is_on_leave === true);
    } else if (activeFilter !== 'ALL') {
      result = result.filter(c => c.status === activeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.complaint_number?.toLowerCase().includes(q) ||
        c.station?.toLowerCase().includes(q) ||
        c.area?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    // Sort: active complaints oldest-first (FIFO queue); closed newest-closed-first
    result.sort((a, b) => {
      const aClosed = a.status === 'CLOSED';
      const bClosed = b.status === 'CLOSED';
      if (!aClosed && !bClosed) return new Date(a.created_at) - new Date(b.created_at);
      if (aClosed && bClosed)   return new Date(b.closed_at || b.created_at) - new Date(a.closed_at || a.created_at);
      return aClosed ? 1 : -1; // active before closed
    });
    setFiltered(result);
  };

  const getActiveFilterLabel = () => {
    return SORT_OPTIONS.find(o => o.key === activeFilter)?.label || t('all');
  };

  const getFilterCount = (key) => {
    if (key === 'ALL') return complaints.length;
    if (key === 'STAFF_ON_LEAVE') return complaints.filter(c => c.profiles?.is_on_leave === true).length;
    return complaints.filter(c => c.status === key).length;
  };

  // Get translated status label
  const getStatusLabel = (status) => {
    const statusMap = {
      'OPEN': t('open'),
      'ASSIGNED': t('assigned'),
      'IN_PROGRESS': t('inProgress'),
      'CLOSED': t('closed'),
    };
    return statusMap[status] || status.replace('_', ' ');
  };

  const fixedHeaderContent = (
    <View style={s.headerRow}>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={TEXT_MUT} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder={t('searchComplaints')}
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
        style={[s.sortButton, activeFilter !== 'ALL' && s.sortButtonActive]}
        onPress={() => setShowSortModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="filter-outline"
          size={20}
          color={activeFilter !== 'ALL' ? '#FFF' : ACTIVE}
        />
      </TouchableOpacity>
    </View>
  );

  const renderComplaint = ({ item }) => {
    const reporterName = item.contact_name
      || item.reporter?.full_name || item.reporter?.email || t('unknown');

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ComplaintDetail', { complaint: item })}
      >
        {item.profiles?.is_on_leave && item.status !== 'CLOSED' && (
          <View style={s.leaveTag}>
            <Ionicons name="warning" size={10} color="#FFF" />
            <Text style={s.leaveTagText}> {t('staffOnLeaveTag')}</Text>
          </View>
        )}

        {/* Top row: complaint number + status */}
        <View style={s.cardTopRow}>
          <Text style={s.assetId}>{item.complaint_number || '—'}</Text>
          <View style={[s.statusPill, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
            <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
            <Text style={[s.statusText, { color: STATUS_COLORS[item.status] }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Asset type */}
        <Text style={s.assetType}>{item.asset_type}</Text>

        {/* Location info */}
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={13} color={ACTIVE} />
          <Text style={s.location}>
            {' '}{[item.station, item.area, item.location].filter(Boolean).join(' › ')}
          </Text>
        </View>

        <Text style={s.description} numberOfLines={2}>{item.description}</Text>

        {/* Reporter */}
        <View style={s.reporterRow}>
          <Ionicons name="person-outline" size={13} color={TEXT_MUT} />
          <Text style={s.reporterLabel}>  {t('reportedBy')} </Text>
          <Text style={s.reporterName}>{reporterName}</Text>
        </View>

        {/* Staff assignment */}
        {item.status === 'CLOSED' ? (
          item.profiles && (
            <View style={s.closedStaffRow}>
              <Ionicons name="person-circle-outline" size={13} color={TEXT_MUT} />
              <Text style={s.closedStaffLabel}>  Handled by </Text>
              <Text style={s.closedStaffName}>{item.profiles.full_name || item.profiles.email}</Text>
            </View>
          )
        ) : item.profiles ? (
          <View style={s.assignedBar}>
            {item.profiles.photo_url ? (
              <Image source={{ uri: getFileUrl(item.profiles.photo_url) }} style={s.avatar} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarInitial}>{item.profiles.full_name?.charAt(0) ?? 'S'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.assignedLabel}>{t('assignedTo')}</Text>
              <Text style={s.assignedName}>{item.profiles.full_name || item.profiles.email}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
          </View>
        ) : (
          <View style={s.unassignedBar}>
            <Ionicons name="warning-outline" size={14} color="#E65100" />
            <Text style={s.unassignedText}>  {t('notAssigned')}</Text>
          </View>
        )}

        {/* Closed date */}
        {item.status === 'CLOSED' && item.closed_at && (
          <View style={s.closedRow}>
            <Ionicons name="checkmark-done-circle" size={14} color={TEXT_MUT} />
            <Text style={s.closedDate}>
              {' '}Closed {new Date(item.closed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        )}

        <View style={s.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={12} color={TEXT_MUT} />
            <Text style={s.date}>
              {'  '}{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.tapHint}>{t('tapToView')}  </Text>
            <Ionicons name="chevron-forward" size={13} color={TEXT_MUT} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout
      title={t('complaints')}
      scroll={false}
      fixedHeader={fixedHeaderContent}
      showDecor
      transparentFixedHeader
      padBottom={0}
    >
      {activeFilter !== 'ALL' && (
        <View style={s.activeFilterRow}>
          <View style={[
            s.activeFilterPill,
            { backgroundColor: `${STATUS_COLORS[activeFilter] || ACTIVE}15` },
          ]}>
            <View style={[
              s.activeFilterDot,
              { backgroundColor: STATUS_COLORS[activeFilter] || ACTIVE },
            ]} />
            <Text style={[
              s.activeFilterText,
              { color: STATUS_COLORS[activeFilter] || ACTIVE },
            ]}>
              {getActiveFilterLabel()}
            </Text>
            <TouchableOpacity
              onPress={() => setActiveFilter('ALL')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={STATUS_COLORS[activeFilter] || ACTIVE}
              />
            </TouchableOpacity>
          </View>
          <Text style={s.countText}>{filtered.length} {t('results')}</Text>
        </View>
      )}

      {activeFilter === 'ALL' && (
        <Text style={s.countTextAll}>{t('totalComplaintsCount')} {filtered.length}</Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id?.toString() || item._id?.toString()}
        renderItem={renderComplaint}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchComplaints} tintColor={ACTIVE} />
        }
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        windowSize={5}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="mail-open-outline" size={50} color={TEXT_MUT} />
            <Text style={s.emptyTitle}>
              {activeFilter === 'ALL'
                ? t('noComplaintsYet')
                : activeFilter === 'STAFF_ON_LEAVE'
                ? t('noStaffOnLeave')
                : t('noComplaintsType')}
            </Text>
            <Text style={s.emptyText}>
              {activeFilter === 'ALL'
                ? t('complaintsWillAppear')
                : activeFilter === 'STAFF_ON_LEAVE'
                ? t('noStaffLeaveComplaints')
                : t('complaintsStatusAppear')}
            </Text>
          </View>
        }
      />

      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={s.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={s.sortModalContent}>
            <View style={s.sortModalHandle} />
            <Text style={s.sortModalTitle}>{t('filterByStatus')}</Text>

            {SORT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  s.sortOption,
                  activeFilter === option.key && s.sortOptionActive,
                ]}
                onPress={() => {
                  setActiveFilter(option.key);
                  setShowSortModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  s.sortOptionIcon,
                  {
                    backgroundColor: activeFilter === option.key
                      ? `${STATUS_COLORS[option.key] || ACTIVE}15`
                      : '#F2F6F8',
                  },
                ]}>
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={
                      option.key === 'STAFF_ON_LEAVE'
                        ? '#F44336'
                        : (STATUS_COLORS[option.key] || ACTIVE)
                    }
                  />
                </View>

                <Text style={[
                  s.sortOptionLabel,
                  activeFilter === option.key && s.sortOptionLabelActive,
                ]}>
                  {option.label}
                </Text>

                <View style={[
                  s.sortOptionCount,
                  {
                    backgroundColor: activeFilter === option.key
                      ? `${STATUS_COLORS[option.key] || ACTIVE}20`
                      : '#F2F6F8',
                  },
                ]}>
                  <Text style={[
                    s.sortOptionCountText,
                    {
                      color: option.key === 'STAFF_ON_LEAVE'
                        ? '#F44336'
                        : (STATUS_COLORS[option.key] || TEXT_SEC),
                    },
                  ]}>
                    {getFilterCount(option.key)}
                  </Text>
                </View>

                {activeFilter === option.key && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={STATUS_COLORS[option.key] || ACTIVE}
                  />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={s.sortCloseBtn}
              onPress={() => setShowSortModal(false)}
            >
              <Text style={s.sortCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}

// Styles remain exactly the same
const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRI,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sortButtonActive: {
    backgroundColor: ACTIVE,
    borderColor: ACTIVE,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  activeFilterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countText: {
    fontSize: 12,
    color: TEXT_MUT,
  },
  countTextAll: {
    fontSize: 13,
    color: TEXT_SEC,
    marginBottom: 8,
    marginTop: 4,
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sortModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  sortModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRI,
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  sortOptionActive: {
    backgroundColor: '#F0F8FF',
  },
  sortOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortOptionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_PRI,
  },
  sortOptionLabelActive: {
    fontWeight: '700',
    color: ACTIVE,
  },
  sortOptionCount: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 4,
  },
  sortOptionCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sortCloseBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F2F6F8',
    alignItems: 'center',
  },
  sortCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SEC,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#A0BDD0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  leaveTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F44336',
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  leaveTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  assetId: { fontSize: 17, fontWeight: '800', color: TEXT_PRI },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
    marginTop: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  assetType: { fontSize: 12, color: TEXT_SEC, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  location: { fontSize: 12, color: TEXT_SEC },
  description: { fontSize: 13, color: TEXT_SEC, lineHeight: 19, marginBottom: 12 },
  reporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reporterLabel: { fontSize: 12, color: TEXT_MUT },
  reporterName: { fontSize: 12, color: TEXT_MUT, flex: 1 },
  assignedBar: {
    backgroundColor: SKY,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  avatar: {
    width: 30, height: 30, borderRadius: 15, marginRight: 10,
    borderWidth: 2, borderColor: '#FFF',
  },
  avatarFallback: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: ACTIVE,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
    borderWidth: 2, borderColor: '#FFF',
  },
  avatarInitial: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  assignedLabel: { fontSize: 10, color: '#FFF', opacity: 0.85 },
  assignedName: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  unassignedBar: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unassignedText: { color: '#E65100', fontSize: 13, fontWeight: '600' },
  closedStaffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  closedStaffLabel: { fontSize: 12, color: TEXT_MUT },
  closedStaffName: { fontSize: 12, color: TEXT_MUT, flex: 1 },
  closedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  closedDate: { fontSize: 12, color: TEXT_MUT },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  date: { fontSize: 12, color: TEXT_MUT },
  tapHint: { fontSize: 12, color: TEXT_MUT },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT_SEC },
  emptyText: { color: TEXT_MUT, fontSize: 13, textAlign: 'center' },
});