import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { assetsAPI } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

const ACTIVE = '#5BA8D4'; const SKY = '#7DD3F0';
const CARD_BG = '#FFFFFF'; const TEXT_PRI = '#1A1A2E'; const TEXT_SEC = '#5A7A8A'; const TEXT_MUT = '#9DB5C0';

const TYPE_CONFIG = {
  AC: { icon: 'snow-outline', color: '#2196F3', label: 'Air Conditioner' },
  WATER_COOLER: { icon: 'water-outline', color: '#00BCD4', label: 'Water Cooler' },
  DESERT_COOLER: { icon: 'leaf-outline', color: '#FF9800', label: 'Desert Cooler' },
};

export default function AllAssets() {
  const navigation = useNavigation();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useFocusEffect(useCallback(() => { fetchAssets(); }, []));

  const fetchAssets = async () => {
    setLoading(true);
    try { const r = await assetsAPI.getAll(); if (r.data.success) setAssets(r.data.data || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const getFiltered = () => {
    let f = [...assets];
    if (filterType !== 'ALL') f = f.filter(a => a.type === filterType);
    if (searchQuery) { const q = searchQuery.toLowerCase(); f = f.filter(a => a.asset_id?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q) || a.brand?.toLowerCase().includes(q)); }
    return f;
  };

  const filtered = getFiltered();
  const filters = [{ key: 'ALL', label: 'All' }, { key: 'AC', label: 'AC' }, { key: 'WATER_COOLER', label: 'Water' }, { key: 'DESERT_COOLER', label: 'Desert' }];

  const fixedHeaderContent = (
    <>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={TEXT_MUT} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Search by ID, location or brand..." placeholderTextColor={TEXT_MUT} value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={TEXT_MUT} /></TouchableOpacity>}
      </View>
      <View style={s.chipsRow}>
        {filters.map(f => (
          <TouchableOpacity key={f.key} style={[s.chip, filterType === f.key && s.chipActive]} onPress={() => setFilterType(f.key)}>
            <Text style={[s.chipText, filterType === f.key && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.statsCount}>{filtered.length} of {assets.length} equipment</Text>
    </>
  );

  const renderAsset = ({ item }) => {
    const tc = TYPE_CONFIG[item.type] || { icon: 'cube-outline', color: '#666', label: item.type };
    return (
      <TouchableOpacity style={s.card} onPress={() => navigation.navigate('AssetDetail', { asset: item })} activeOpacity={0.85}>
        <View style={s.cardRow}>
          <View style={[s.typeIcon, { backgroundColor: `${tc.color}15` }]}><Ionicons name={tc.icon} size={24} color={tc.color} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.assetId}>{item.asset_id}</Text>
            <Text style={s.assetType}>{tc.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="location-outline" size={12} color={TEXT_MUT} />
              <Text style={s.locationText}> {item.location}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {item.brand && <Text style={{ fontSize: 11, color: TEXT_SEC, marginBottom: 4 }}>{item.brand}</Text>}
            <View style={[s.statusPill, { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }]}>
              <View style={[s.statusDot, { backgroundColor: item.is_active ? '#4CAF50' : '#F44336' }]} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: item.is_active ? '#2E7D32' : '#C62828' }}>{item.is_active ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout title="Equipment" scroll={false} fixedHeader={fixedHeaderContent}>
      <FlatList data={filtered} keyExtractor={item => item._id || item.asset_id} renderItem={renderAsset}
        contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAssets} tintColor={ACTIVE} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="cube-outline" size={50} color={TEXT_MUT} /><Text style={s.emptyText}>No equipment found</Text></View>}
      />
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 12, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, elevation: 3 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_PRI },
  chipsRow: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD_BG, elevation: 2 },
  chipActive: { backgroundColor: SKY },
  chipText: { fontSize: 12, color: TEXT_SEC, fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  statsCount: { fontSize: 13, color: TEXT_SEC, fontWeight: '600', marginBottom: 10 },
  card: { backgroundColor: CARD_BG, borderRadius: 14, marginBottom: 10, elevation: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  typeIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  assetId: { fontSize: 16, fontWeight: '700', color: TEXT_PRI },
  assetType: { fontSize: 12, color: ACTIVE, fontWeight: '500', marginTop: 2 },
  locationText: { fontSize: 11, color: TEXT_MUT },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: TEXT_MUT, fontSize: 14 },
});