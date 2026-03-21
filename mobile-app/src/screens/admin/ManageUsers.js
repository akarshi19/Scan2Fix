import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image, Alert, TextInput,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { usersAPI, getFileUrl } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

const ACTIVE = '#5BA8D4'; const SKY = '#7DD3F0';
const CARD_BG = '#FFFFFF'; const TEXT_PRI = '#1A1A2E'; const TEXT_SEC = '#5A7A8A'; const TEXT_MUT = '#9DB5C0';

const ROLE_COLORS = {
  ADMIN: { bg: '#F3E5F5', text: '#6A1B9A', dot: '#9C27B0' },
  STAFF: { bg: '#E8F5FB', text: ACTIVE, dot: ACTIVE },
  USER:  { bg: '#E3F2FD', text: '#1565C0', dot: '#2196F3' },
};
const ROLE_ICONS = {
  ADMIN: <FontAwesome name="star" size={12} color="#6A1B9A" />,
  STAFF: <Ionicons name="build" size={12} color={ACTIVE} />,
  USER:  <Ionicons name="person" size={12} color="#1565C0" />,
};

export default function ManageUsers() {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  useFocusEffect(useCallback(() => { fetchUsers(); }, []));

  const fetchUsers = async () => {
    setLoading(true);
    try { const r = await usersAPI.getAll(); if (r.data.success) setUsers(r.data.data || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const getFiltered = () => {
    let f = [...users];
    if (filterRole !== 'ALL') f = f.filter(u => u.role === filterRole);
    if (searchQuery) { const q = searchQuery.toLowerCase(); f = f.filter(u => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.employee_id?.toLowerCase().includes(q)); }
    return f;
  };

  const toggleAvailability = async (userId, currentStatus, userName) => {
    const newStatus = !currentStatus;
    Alert.alert(newStatus ? 'Mark On Leave' : 'Mark Available', `Mark ${userName} as ${newStatus ? 'On Leave' : 'Available'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        try { const r = await usersAPI.toggleLeave(userId); if (r.data.success) { setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_on_leave: newStatus } : u)); Alert.alert('Success', `${userName} is now ${newStatus ? 'On Leave' : 'Available'}`); } }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const filtered = getFiltered();
  const onLeaveCount = users.filter(u => u.role === 'STAFF' && u.is_on_leave).length;
  const availCount = users.filter(u => u.role === 'STAFF' && !u.is_on_leave).length;
  const filterBtns = [{ key: 'ALL', label: 'All' }, { key: 'ADMIN', label: 'Admin' }, { key: 'STAFF', label: 'Staff' }, { key: 'USER', label: 'Users' }];

  const fixedHeaderContent = (
    <>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={TEXT_MUT} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Search by name, email or ID..." placeholderTextColor={TEXT_MUT} value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={TEXT_MUT} /></TouchableOpacity>}
      </View>
      <View style={s.chipsRow}>
        {filterBtns.map(f => (
          <TouchableOpacity key={f.key} style={[s.chip, filterRole === f.key && s.chipActive]} onPress={() => setFilterRole(f.key)}>
            <Text style={[s.chipText, filterRole === f.key && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.statsBar}>
        <Text style={s.statsCount}>{filtered.length} users</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[s.statPill, { backgroundColor: '#E8F5FB' }]}><Ionicons name="checkmark-circle-outline" size={12} color={ACTIVE} /><Text style={[s.statPillText, { color: ACTIVE }]}> {availCount}</Text></View>
          <View style={[s.statPill, { backgroundColor: '#FFF3E0' }]}><Ionicons name="home-outline" size={12} color="#E65100" /><Text style={[s.statPillText, { color: '#E65100' }]}> {onLeaveCount}</Text></View>
        </View>
      </View>
    </>
  );

  const renderUser = ({ item }) => {
    const rs = ROLE_COLORS[item.role] ?? { bg: '#F5F5F5', text: '#666', dot: '#999' };
    return (
      <TouchableOpacity style={[s.card, item.is_on_leave && s.cardOnLeave]} onPress={() => navigation.navigate('UserDetail', { user: item })} activeOpacity={0.88}>
        <View style={s.cardRow}>
          {item.photo_url ? <Image source={{ uri: getFileUrl(item.photo_url) }} style={s.avatar} /> : (
            <View style={[s.avatarFallback, { backgroundColor: rs.dot }]}><Text style={s.avatarInitial}>{item.full_name?.charAt(0) ?? '?'}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.userName}>{item.full_name || 'No Name'}</Text>
              {item.is_on_leave && <View style={s.leavePill}><Ionicons name="home-outline" size={10} color="#FFF" /><Text style={s.leavePillText}> On Leave</Text></View>}
            </View>
            <Text style={s.userEmail}>{item.email}</Text>
            {item.employee_id && <Text style={s.userMeta}>ID: {item.employee_id}</Text>}
            {item.designation && <Text style={[s.userMeta, { color: ACTIVE }]}>{item.designation}</Text>}
          </View>
          <View style={[s.roleBadge, { backgroundColor: rs.bg }]}>{ROLE_ICONS[item.role]}<Text style={[s.roleText, { color: rs.text }]}> {item.role}</Text></View>
        </View>
        {item.role === 'STAFF' && (
          <TouchableOpacity style={[s.actionBtn, item.is_on_leave ? s.actionBtnAvail : s.actionBtnLeave]} onPress={() => toggleAvailability(item.id, item.is_on_leave, item.full_name || item.email)} activeOpacity={0.85}>
            <Ionicons name={item.is_on_leave ? 'checkmark-circle-outline' : 'home-outline'} size={15} color={item.is_on_leave ? '#2E7D32' : '#E65100'} />
            <Text style={[s.actionBtnText, item.is_on_leave ? s.actionBtnTextAvail : s.actionBtnTextLeave]}>{item.is_on_leave ? '  Mark Available' : '  Mark On Leave'}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout title="Manage Users" scroll={false} fixedHeader={fixedHeaderContent}>
      <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderUser}
        contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchUsers} tintColor={ACTIVE} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="people-outline" size={50} color={TEXT_MUT} /><Text style={s.emptyText}>No users found</Text></View>}
      />
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 12, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#B0CCE0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_PRI },
  chipsRow: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD_BG, elevation: 2 },
  chipActive: { backgroundColor: SKY },
  chipText: { fontSize: 12, color: TEXT_SEC, fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statsCount: { fontSize: 13, color: TEXT_SEC, fontWeight: '600' },
  statPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statPillText: { fontSize: 11, fontWeight: '600' },
  card: { backgroundColor: CARD_BG, borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardOnLeave: { borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarInitial: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  userName: { fontSize: 15, fontWeight: '700', color: TEXT_PRI },
  leavePill: { backgroundColor: '#FF9800', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, flexDirection: 'row', alignItems: 'center' },
  leavePillText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  userEmail: { fontSize: 12, color: TEXT_SEC, marginTop: 3 },
  userMeta: { fontSize: 11, color: TEXT_MUT, marginTop: 2 },
  roleBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center' },
  roleText: { fontSize: 11, fontWeight: '700' },
  actionBtn: { paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#EEF4F8', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  actionBtnLeave: { backgroundColor: '#FFF8F0' },
  actionBtnAvail: { backgroundColor: '#F0FBF5' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  actionBtnTextLeave: { color: '#E65100' },
  actionBtnTextAvail: { color: '#2E7D32' },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: TEXT_MUT, fontSize: 14 },
});