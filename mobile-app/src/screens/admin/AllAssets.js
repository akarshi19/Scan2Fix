import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { assetsAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';

export default function AllAssets({ route }) {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Base config for known types — new types get fallback icon/color
  const BASE_TYPE_CONFIG = {
    AC:           { icon: 'hardware-chip-outline',    color: colors.active, label: t('airConditioners') },
    WATER_COOLER: { icon: 'hardware-chip-outline',    color: colors.active, label: t('waterCoolers') },
    DESERT_COOLER:{ icon: 'hardware-chip-outline',    color: colors.active, label: t('desertCoolers') },
  };

  // Derive all types that actually exist in the loaded assets
  const assetTypes = [...new Set(assets.map(a => a.type).filter(Boolean))].sort();

  const TYPE_CONFIG = assetTypes.reduce((acc, type, i) => {
    acc[type] = BASE_TYPE_CONFIG[type] || {
      icon: 'hardware-chip-outline',
      color: colors.active,
      label: type.replace(/_/g, ' '),
    };
    return acc;
  }, { ...BASE_TYPE_CONFIG });

  // Build filter options dynamically from real asset types
  const FILTER_OPTIONS = [
    { key: 'ALL', label: t('allEquipment'), icon: 'cube-outline', color: colors.active },
    ...assetTypes.map((type) => ({
      key: type,
      label: TYPE_CONFIG[type].label,
      icon: TYPE_CONFIG[type].icon,
      color: TYPE_CONFIG[type].color,
    })),
    { key: 'INACTIVE', label: t('inactive'), icon: 'close-circle-outline', color: colors.staffUnavailable },
  ];

  useFocusEffect(useCallback(() => { fetchAssets(); }, []));

  useEffect(() => {
    if (route?.params?.initialFilter) {
      setFilterType(route.params.initialFilter);
      navigation.setParams({ initialFilter: undefined });
    }
  }, [route?.params?.initialFilter]);

  useEffect(() => {
    const unsubscribe = navigation.getParent()?.addListener('tabPress', (e) => {
      if (!route?.params?.initialFilter) {
        setFilterType('ALL');
        setSearchQuery('');
      }
    });
    return unsubscribe;
  }, [navigation, route?.params?.initialFilter]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const r = await assetsAPI.getAll();
      if (r.data.success) setAssets(r.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getFiltered = () => {
    let f = [...assets];
    if (filterType === 'INACTIVE') {
      f = f.filter(a => a.is_active === false);
    } else if (filterType !== 'ALL') {
      f = f.filter(a => a.type === filterType);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(a =>
        a.asset_id?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.brand?.toLowerCase().includes(q)
      );
    }
    return f;
  };

  const getFilterCount = (key) => {
    if (key === 'ALL') return assets.length;
    if (key === 'INACTIVE') return assets.filter(a => a.is_active === false).length;
    return assets.filter(a => a.type === key).length;
  };

  const getActiveFilterLabel = () => {
    return FILTER_OPTIONS.find(o => o.key === filterType)?.label || t('all');
  };

  const getActiveFilterColor = () => {
    return FILTER_OPTIONS.find(o => o.key === filterType)?.color || colors.active;
  };

  const filtered = getFiltered();
  const activeCount = filtered.filter(a => a.is_active !== false).length;
  const inactiveCount = filtered.filter(a => a.is_active === false).length;

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
      backgroundColor: colors.pageBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPri,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.pageBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    filterButtonActive: {
      backgroundColor: colors.button,
      borderColor: colors.button,
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
      color: colors.textMut,
    },
    statsBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      marginTop: 4,
    },
    countTextAll: {
      fontSize: 13,
      color: colors.textSec,
      fontWeight: '600',
    },
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statPillText: {
      fontSize: 11,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 34,
      paddingTop: 12,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#DDD',
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPri,
      marginBottom: 16,
    },
    filterOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 4,
      gap: 12,
    },
    filterOptionActive: {
      backgroundColor: '#F0F8FF',
    },
    filterOptionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterOptionLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPri,
    },
    filterOptionCount: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
      marginRight: 4,
    },
    filterOptionCountText: {
      fontSize: 12,
      fontWeight: '700',
    },
    modalCloseBtn: {
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.pageBg,
      alignItems: 'center',
    },
    modalCloseBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSec,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      marginBottom: 10,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    typeIcon: {
      width: 48,
      height: 48,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    assetId: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPri,
    },
    assetType: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 2,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    locationText: {
      fontSize: 11,
      color: colors.textMut,
    },
    brandText: {
      fontSize: 11,
      color: colors.textSec,
      marginBottom: 4,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      gap: 4,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textSec,
    },
    emptyText: {
      color: colors.textMut,
      fontSize: 13,
      textAlign: 'center',
    },
  });

  // Fixed Header — Search + Filter Button
  const fixedHeaderContent = (
    <View style={s.headerRow}>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMut} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={colors.textMut}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMut} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[s.filterButton, filterType !== 'ALL' && s.filterButtonActive]}
        onPress={() => setShowFilterModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="filter-outline"
          size={20}
          color={filterType !== 'ALL' ? colors.white : colors.active}
        />
      </TouchableOpacity>
    </View>
  );

  const renderAsset = ({ item }) => {
    const tc = TYPE_CONFIG[item.type] || {
      icon: 'cube-outline',
      color: colors.active,
      label: item.type
    };

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('AssetDetail', { asset: item })}
        activeOpacity={0.85}
      >
        <View style={s.cardRow}>
          <View style={[s.typeIcon, { backgroundColor: `${colors.textMut}25` }]}>
            <Ionicons name="cube-outline" size={25} color={colors.textMut} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.assetId}>{item.asset_id}</Text>
            <Text style={[s.assetType, { color: colors.textMut }]}>{tc.label}</Text>
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMut} />
              <Text style={s.locationText}> {item.location}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {item.brand && (
              <Text style={s.brandText}>{item.brand}</Text>
            )}
            <View style={[
              s.statusPill,
              { backgroundColor: item.is_active !== false ? '#E8F5E9' : '#FFEBEE' },
            ]}>
              <View style={[
                s.statusDot,
                { backgroundColor: item.is_active !== false ? '#4CAF50' : '#F44336' },
              ]} />
              <Text style={{
                fontSize: 10,
                fontWeight: '600',
                color: item.is_active !== false ? '#2E7D32' : '#C62828',
              }}>
                {item.is_active !== false ? t('active') : t('inactiveStatus')}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout
      title={t('equipments')}
      scroll={false}
      fixedHeader={fixedHeaderContent}
      showDecor
      transparentFixedHeader
      padBottom={false}
    >
      {/* Stats bar — always visible */}
      <View style={s.statsBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {filterType !== 'ALL' && (
            <View style={[
              s.activeFilterPill,
              { backgroundColor: `${getActiveFilterColor()}15`, paddingVertical: 3, paddingHorizontal: 8 },
            ]}>
              <View style={[s.activeFilterDot, { backgroundColor: getActiveFilterColor() }]} />
              <Text style={[s.activeFilterText, { color: getActiveFilterColor(), fontSize: 11 }]}>
                {getActiveFilterLabel()}
              </Text>
              <TouchableOpacity
                onPress={() => setFilterType('ALL')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={14} color={getActiveFilterColor()} />
              </TouchableOpacity>
            </View>
          )}
          <Text style={s.countTextAll}>{filtered.length} {filterType === 'ALL' ? t('equipmentCount') : t('results')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {activeCount > 0 && (
            <View style={[s.statPill, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#4CAF50" />
              <Text style={[s.statPillText, { color: '#2E7D32' }]}> {activeCount}</Text>
            </View>
          )}
          {inactiveCount > 0 && (
            <View style={[s.statPill, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="close-circle-outline" size={12} color="#F44336" />
              <Text style={[s.statPillText, { color: '#C62828' }]}> {inactiveCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Assets List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item._id || item.asset_id}
        renderItem={renderAsset}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchAssets} tintColor={colors.active} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={50} color={colors.textMut} />
            <Text style={s.emptyTitle}>
              {filterType === 'ALL'
                ? t('noEquipmentFound')
                : filterType === 'INACTIVE'
                  ? t('noInactiveEquipment')
                  : t('noEquipmentType')}
            </Text>
            <Text style={s.emptyText}>
              {filterType === 'ALL'
                ? t('equipmentWillAppear')
                : filterType === 'INACTIVE'
                  ? t('allActiveMessage')
                  : t('noEquipmentTypeFound')}
            </Text>
          </View>
        }
      />

      {/* ════════════════════════════════════════ */}
      {/* Filter Modal                             */}
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
          <View style={s.modalContent}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t('filterByType')}</Text>

            {FILTER_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  s.filterOption,
                  filterType === option.key && s.filterOptionActive,
                ]}
                onPress={() => {
                  setFilterType(option.key);
                  setShowFilterModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  s.filterOptionIcon,
                  {
                    backgroundColor: filterType === option.key
                      ? `${option.color}15`
                      : colors.pageBg,
                  },
                ]}>
                  <Ionicons name={option.icon} size={18} color={option.color} />
                </View>

                <Text style={[
                  s.filterOptionLabel,
                  filterType === option.key && { fontWeight: '700', color: option.color },
                ]}>
                  {option.label}
                </Text>

                <View style={[
                  s.filterOptionCount,
                  {
                    backgroundColor: filterType === option.key
                      ? `${option.color}20`
                      : colors.pageBg,
                  },
                ]}>
                  <Text style={[s.filterOptionCountText, { color: option.color }]}>
                    {getFilterCount(option.key)}
                  </Text>
                </View>

                {filterType === option.key && (
                  <Ionicons name="checkmark-circle" size={20} color={option.color} />
                )}
              </TouchableOpacity>
            ))}

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