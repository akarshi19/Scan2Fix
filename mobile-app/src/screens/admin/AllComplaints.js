import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, TextInput, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { complaintsAPI, getFileUrl } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';
import { useLanguage } from '../../context/LanguageContext';

const ACTIVE = '#5BA8D4'; const SKY = '#7DD3F0';
const CARD_BG = '#FFFFFF'; const PAGE_BG = '#F2F6F8';
const TEXT_PRI = '#1A1A2E'; const TEXT_SEC = '#5A7A8A'; const TEXT_MUT = '#9DB5C0';

const STATUS_COLORS = { OPEN: '#FF9800', ASSIGNED: '#2196F3', IN_PROGRESS: '#9C27B0', CLOSED: '#4CAF50' };

export default function AllComplaints({ navigation, route }) {
  const [complaints, setComplaints] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(route?.params?.initialFilter || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();

  useEffect(() => { fetchComplaints(); const u = navigation.addListener('focus', fetchComplaints); return u; }, [navigation]);
  useEffect(() => { filterComplaints(); }, [complaints, activeFilter, searchQuery]);
  useEffect(() => { if (route?.params?.initialFilter) setActiveFilter(route.params.initialFilter); }, [route?.params?.initialFilter]);

  const fetchComplaints = async () => {
    try { const r = await complaintsAPI.getAll(); if (r.data.success) setComplaints(r.data.data || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

    const filterComplaints = () => {
    let result = [...complaints];
    if (activeFilter === 'STAFF_ON_LEAVE') {
      // Show only complaints where assigned staff is on leave
      result = result.filter(c => c.profiles?.is_on_leave === true);
    } else if (activeFilter !== 'ALL') {
      result = result.filter(c => c.status === activeFilter);
    }
    if (searchQuery) {
      result = result.filter(c =>
        c.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFiltered(result);
  };

    const filters = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'STAFF_ON_LEAVE', label: 'Staff Leave' },
    { key: 'CLOSED', label: 'Closed' },
  ];

  const fixedHeaderContent = (
    <>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={TEXT_MUT} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Search by Asset ID" placeholderTextColor={TEXT_MUT} value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={TEXT_MUT} /></TouchableOpacity>}
      </View>
      <View style={s.chipsRow}>
        {filters.map(f => (
          <TouchableOpacity key={f.key} style={[s.chip, activeFilter === f.key && s.chipActive]} onPress={() => setActiveFilter(f.key)}>
            <Text style={[s.chipText, activeFilter === f.key && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.countText}>Total complaints - {filtered.length}</Text>
    </>
  );

  const renderComplaint = ({ item }) => (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => navigation.navigate('ComplaintDetail', { complaint: item })}>
       {/* Staff on Leave tag — top right corner */}
      {item.profiles?.is_on_leave && item.status !== 'CLOSED' && (
        <View style={s.leaveTag}>
          <Ionicons name="warning" size={10} color="#FFF" />
          <Text style={s.leaveTagText}> Staff on Leave</Text>
        </View>
      )}
      <View style={s.cardTopRow}>
        <Text style={s.assetId}>{item.asset_id}</Text>
        <View style={[s.statusPill, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
          <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
          <Text style={[s.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <Text style={s.assetType}>{item.assets?.type}</Text>
      <View style={s.locationRow}>
        <Ionicons name="location-outline" size={13} color={ACTIVE} />
        <Text style={s.location}> {item.assets?.location}</Text>
      </View>
      <Text style={s.description} numberOfLines={2}>{item.description}</Text>
      {item.profiles ? (
        <View style={s.assignedBar}>
          {item.profiles.photo_url ? (
            <Image source={{ uri: getFileUrl(item.profiles.photo_url) }} style={s.avatar} />
          ) : (
            <View style={s.avatarFallback}><Text style={s.avatarInitial}>{item.profiles.full_name?.charAt(0) ?? 'S'}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.assignedLabel}>Assigned To:</Text>
            <Text style={s.assignedName}>{item.profiles.full_name || item.profiles.email}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
        </View>
      ) : (
        <View style={s.unassignedBar}>
          <Ionicons name="warning-outline" size={14} color="#E65100" />
          <Text style={s.unassignedText}>  Not assigned yet</Text>
        </View>
      )}
      <View style={s.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={12} color={TEXT_MUT} />
          <Text style={s.date}>  {new Date(item.created_at).toLocaleDateString('en-GB')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={s.tapHint}>Tap to view  </Text>
          <Ionicons name="chevron-forward" size={13} color={TEXT_MUT} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout title="Complaints" scroll={false} fixedHeader={fixedHeaderContent}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id?.toString() || item._id?.toString()}
        renderItem={renderComplaint}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchComplaints} tintColor={ACTIVE} />}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={s.empty}><Ionicons name="mail-open-outline" size={50} color={TEXT_MUT} /><Text style={s.emptyText}>No complaints found</Text></View>
        }
      />
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 12, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#B0CCE0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_PRI },
  chipsRow: { flexDirection: 'row', marginBottom: 10, gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD_BG, shadowColor: '#B0CCE0', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
  chipActive: { backgroundColor: SKY },
  chipText: { fontSize: 12, color: TEXT_SEC, fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  countText: { fontSize: 13, color: TEXT_SEC, marginBottom: 8 },
  card: { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  assetId: { fontSize: 17, fontWeight: '800', color: TEXT_PRI },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 5, marginTop:7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  assetType: { fontSize: 12, color: TEXT_SEC, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  location: { fontSize: 12, color: TEXT_SEC },
  description: { fontSize: 13, color: TEXT_SEC, lineHeight: 19, marginBottom: 12 },
  assignedBar: { backgroundColor: SKY, borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  avatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10, borderWidth: 2, borderColor: '#FFF' },
  avatarFallback: { width: 30, height: 30, borderRadius: 15, backgroundColor: ACTIVE, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 2, borderColor: '#FFF' },
  avatarInitial: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  assignedLabel: { fontSize: 10, color: '#FFF', opacity: 0.85 },
  assignedName: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  unassignedBar: { backgroundColor: '#FFF3E0', borderRadius: 8, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  unassignedText: { color: '#E65100', fontSize: 13, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: TEXT_MUT },
  tapHint: { fontSize: 12, color: TEXT_MUT },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: TEXT_MUT, fontSize: 14 },
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
});