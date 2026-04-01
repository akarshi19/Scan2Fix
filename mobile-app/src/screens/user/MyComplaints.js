import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, TextInput, Image, Modal, Share, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { complaintsAPI, getFileUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
  FINISHING: '#FF9800',
  CLOSED: '#4CAF50',
};

export default function MyComplaints() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [complaints, setComplaints] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState(null);
  const [otpComplaint, setOtpComplaint] = useState(null);

  // Dynamic sort options using translations
  const SORT_OPTIONS = [
    { key: 'ALL', label: t('allComplaints'), icon: 'list-outline' },
    { key: 'OPEN', label: t('open'), icon: 'alert-circle-outline' },
    { key: 'ASSIGNED', label: t('assigned'), icon: 'person-outline' },
    { key: 'IN_PROGRESS', label: t('inProgress'), icon: 'time-outline' },
    { key: 'FINISHING', label: t('finishing'), icon: 'flag-outline' },
    { key: 'CLOSED', label: t('closed'), icon: 'checkmark-circle-outline' },
  ];

  useFocusEffect(
    useCallback(() => {
      fetchComplaints();
    }, [])
  );

  React.useEffect(() => {
    filterComplaints();
  }, [complaints, activeFilter, searchQuery]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await complaintsAPI.getMine();
      if (response.data.success) {
        setComplaints(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaints = () => {
    let result = [...complaints];
    if (activeFilter !== 'ALL') {
      result = result.filter(c => c.status === activeFilter);
    }
    if (searchQuery) {
      result = result.filter(c =>
        c.asset_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFiltered(result);
  };

  const navigateToDetail = (complaint) => {
    navigation.navigate('ComplaintDetail', { complaint });
  };

  const handleGenerateOTP = async (complaint) => {
    try {
      const response = await complaintsAPI.generateOTP(complaint.id || complaint._id);
      if (response.data.success) {
        setGeneratedOTP(response.data.data.otp);
        setOtpComplaint(complaint);
        setShowOTPModal(true);
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('generateOtpFailed'));
    }
  };

  const shareOTP = async () => {
    try {
      await Share.share({
        message: `Scan2Fix ${t('completionOtp')}\n\n${t('complaintNo')} ${otpComplaint.asset_id}\n${t('enterOtp')}: ${generatedOTP}\n\n${t('validFor')}\n\n${t('otpNoteUser')}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getActiveFilterLabel = () => {
    return SORT_OPTIONS.find(o => o.key === activeFilter)?.label || t('all');
  };

  // Get translated status label
  const getStatusLabel = (status) => {
    const statusMap = {
      'OPEN': t('open'),
      'ASSIGNED': t('assigned'),
      'IN_PROGRESS': t('inProgress'),
      'FINISHING': t('finishing'),
      'CLOSED': t('closed'),
    };
    return statusMap[status] || status.replace('_', ' ');
  };

  // Fixed Header
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
    const isClosed = item.status === 'CLOSED';
    const isFinishing = item.status === 'FINISHING';
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.85}
        onPress={() => navigateToDetail(item)}
      >
        <View style={s.cardTopRow}>
          <Text style={s.assetId}>{item.asset_id}</Text>
          <View style={[s.statusPill, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
            <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
            <Text style={[s.statusLabel, { color: STATUS_COLORS[item.status] }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <Text style={s.assetType}>{item.assets?.type}</Text>

        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={13} color={isClosed ? TEXT_MUT : ACTIVE} />
          <Text style={[s.location, isClosed && { color: TEXT_MUT }]}>
            {' '}{item.assets?.location || t('unknown')}
          </Text>
        </View>

        <Text style={[s.description, isClosed && { color: TEXT_MUT }]} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Photo — only for non-closed */}
        {!isClosed && item.photo_url && (
          <TouchableOpacity onPress={() => setSelectedImage(getFileUrl(item.photo_url))}>
            <Image source={{ uri: getFileUrl(item.photo_url) }} style={s.thumbnail} />
            <Text style={s.tapToViewImage}>{t('tapToViewImage')}</Text>
          </TouchableOpacity>
        )}

        {/* Assigned staff */}
        {isClosed ? (
          item.profiles && (
            <View style={s.closedStaffRow}>
              <Ionicons name="person-outline" size={13} color={TEXT_MUT} />
              <Text style={s.closedStaffLabel}>  {t('handledBy')} </Text>
              <Text style={s.closedStaffName}>
                {item.profiles.full_name || item.profiles.email}
              </Text>
            </View>
          )
        ) : (
          item.profiles ? (
            <View style={s.assignedBar}>
              {item.profiles.photo_url ? (
                <Image
                  source={{ uri: getFileUrl(item.profiles.photo_url) }}
                  style={s.avatar}
                />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitial}>
                    {item.profiles.full_name?.charAt(0) ?? 'S'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.assignedLabel}>{t('assignedTo')}</Text>
                <Text style={s.assignedName}>
                  {item.profiles.full_name || item.profiles.email}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
            </View>
          ) : (
            <View style={s.unassignedBar}>
              <Ionicons name="warning-outline" size={14} color="#E65100" />
              <Text style={s.unassignedText}>  {t('notAssigned')}</Text>
            </View>
          )
        )}

        {/* OTP button — only for finishing */}
        {!isClosed && isFinishing && (
          <TouchableOpacity
            style={s.generateOtpButton}
            onPress={() => handleGenerateOTP(item)}
          >
            <Ionicons name="key-outline" size={16} color="#FFF" />
            <Text style={s.generateOtpButtonText}>  {t('generateOtp')}</Text>
          </TouchableOpacity>
        )}

        {/* Work finishing notice */}
        {isFinishing && (
          <View style={s.finishingNotice}>
            <Ionicons name="flag-outline" size={14} color="#FF9800" />
            <Text style={s.finishingNoticeText}>
              {t('otpHelpNote')}
            </Text>
          </View>
        )}

        {/* Resolved date — only for closed */}
        {isClosed && item.closed_at && (
          <View style={s.closedRow}>
            <Ionicons name="checkmark-done-circle" size={14} color={TEXT_MUT} />
            <Text style={s.closedDate}>
              {' '}{t('resolvedOn')} {new Date(item.closed_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>
        )}

        <View style={s.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={12} color={TEXT_MUT} />
            <Text style={s.date}>
              {'  '}
              {new Date(item.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
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
      title={t('myComplaints')} 
      scroll={false} 
      fixedHeader={fixedHeaderContent} 
      showDecor 
      transparentFixedHeader 
      padBottom={0}
    >
      {activeFilter !== 'ALL' && (
        <View style={s.activeFilterRow}>
          <View style={[s.activeFilterPill, { backgroundColor: `${STATUS_COLORS[activeFilter]}15` }]}>
            <View style={[s.activeFilterDot, { backgroundColor: STATUS_COLORS[activeFilter] }]} />
            <Text style={[s.activeFilterText, { color: STATUS_COLORS[activeFilter] }]}>
              {getActiveFilterLabel()}
            </Text>
            <TouchableOpacity
              onPress={() => setActiveFilter('ALL')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={16} color={STATUS_COLORS[activeFilter]} />
            </TouchableOpacity>
          </View>
          <Text style={s.countText}>{filtered.length} {t('results')}</Text>
        </View>
      )}

      {activeFilter === 'ALL' && (
        <Text style={s.countTextAll}>{t('totalComplaintsLabel')} {filtered.length}</Text>
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
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="mail-open-outline" size={50} color={TEXT_MUT} />
            <Text style={s.emptyTitle}>
              {activeFilter === 'ALL'
                ? t('noComplaintsYet')
                : `${t('noFilteredComplaints')}`}
            </Text>
            <Text style={s.emptyText}>
              {activeFilter === 'ALL'
                ? t('noComplaintsDesc')
                : t('noFilteredDesc')}
            </Text>
          </View>
        }
      />

      {/* Sort / Filter Modal */}
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
                    color={STATUS_COLORS[option.key] || ACTIVE}
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
                    { color: STATUS_COLORS[option.key] || TEXT_SEC },
                  ]}>
                    {option.key === 'ALL'
                      ? complaints.length
                      : complaints.filter(c => c.status === option.key).length}
                  </Text>
                </View>

                {activeFilter === option.key && (
                  <Ionicons name="checkmark-circle" size={20} color={STATUS_COLORS[option.key] || ACTIVE} />
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

      {/* Full image modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={s.imageModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <Image
            source={{ uri: selectedImage }}
            style={s.fullImage}
            resizeMode="contain"
          />
          <Text style={s.closeHint}>{t('tapToClose')}</Text>
        </TouchableOpacity>
      </Modal>

      {/* OTP Display Modal */}
      <Modal
        visible={showOTPModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOTPModal(false)}
      >
        <View style={s.otpModalOverlay}>
          <View style={s.otpModalContent}>
            <View style={s.otpHandle} />

            <View style={s.otpIconWrap}>
              <Ionicons name="key" size={32} color="#004e68" />
            </View>

            <Text style={s.otpTitle}>{t('completionOtp')}</Text>
            <Text style={s.otpSubtitle}>
              {t('otpSubtitleUser')}
            </Text>

            <View style={s.otpDisplay}>
              {generatedOTP?.toString().split('').map((digit, i) => (
                <View key={i} style={s.otpDigitBox}>
                  <Text style={s.otpDigit}>{digit}</Text>
                </View>
              ))}
            </View>

            <View style={s.validityRow}>
              <Ionicons name="time-outline" size={14} color="#FF9800" />
              <Text style={s.validityText}> {t('validFor')}</Text>
            </View>

            <TouchableOpacity
              style={s.shareBtn}
              onPress={shareOTP}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFF" />
              <Text style={s.shareBtnText}>  {t('shareOtp')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.closeOtpBtn}
              onPress={() => setShowOTPModal(false)}
              activeOpacity={0.8}
            >
              <Text style={s.closeOtpBtnText}>{t('close')}</Text>
            </TouchableOpacity>

            <View style={s.noteRow}>
              <Ionicons name="information-circle-outline" size={14} color={TEXT_MUT} />
              <Text style={s.noteText}>
                {t('otpNoteUser')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

// Styles remain the same
const s = StyleSheet.create({
  // ... (keep all your existing styles unchanged)
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
    backgroundColor: 'rgb(255, 255, 255, 0.96)',
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
    backgroundColor: 'transparent',
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
  statusLabel: { fontSize: 11, fontWeight: '700' },
  assetType: { fontSize: 12, color: TEXT_SEC, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  location: { fontSize: 12, color: TEXT_SEC },
  description: { fontSize: 13, color: TEXT_SEC, lineHeight: 19, marginBottom: 12 },
  thumbnail: { width: '100%', height: 150, borderRadius: 8, marginBottom: 4 },
  tapToViewImage: { fontSize: 11, color: ACTIVE, textAlign: 'center', marginBottom: 10 },
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
    backgroundColor: '#FFF3E0', borderRadius: 8, padding: 10,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
  },
  unassignedText: { color: '#E65100', fontSize: 13, fontWeight: '600' },
  closedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  closedDate: { fontSize: 12, color: TEXT_MUT },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 4,
  },
  date: { fontSize: 12, color: TEXT_MUT },
  tapHint: { fontSize: 12, color: TEXT_MUT },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 40, gap: 12, backgroundColor: 'transparent',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT_SEC },
  emptyText: { color: TEXT_MUT, fontSize: 13, textAlign: 'center' },
  imageModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullImage: { width: '95%', height: '70%' },
  closeHint: { color: 'white', marginTop: 20, fontSize: 14 },
  closedStaffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  closedStaffLabel: {
    fontSize: 12,
    color: TEXT_MUT,
  },
  closedStaffName: {
    fontSize: 12,
    color: TEXT_MUT,
    flex: 1,
  },
  generateOtpButton: {
    backgroundColor: '#004e68', padding: 12, borderRadius: 8,
    alignItems: 'center', marginBottom: 10, flexDirection: 'row',
    justifyContent: 'center', shadowColor: '#004e68',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25,
    shadowRadius: 6, elevation: 4,
  },
  generateOtpButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  finishingNotice: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1',
    borderRadius: 8, padding: 10, marginBottom: 10, gap: 8,
  },
  finishingNoticeText: {
    flex: 1, fontSize: 12, color: '#FF9800', fontWeight: '500', lineHeight: 18,
  },
  otpModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  otpModalContent: {
    borderRadius: 24, padding: 28, width: '100%', maxWidth: 360,
    alignItems: 'center', backgroundColor: CARD_BG,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 15,
  },
  otpHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', marginBottom: 20,
  },
  otpIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#004e6812',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  otpTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6, color: TEXT_PRI },
  otpSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19, color: TEXT_SEC },
  otpDisplay: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpDigitBox: {
    width: 48, height: 56, borderRadius: 12, backgroundColor: '#EEF6FB',
    borderWidth: 2, borderColor: '#5BA8D4', alignItems: 'center', justifyContent: 'center',
  },
  otpDigit: { fontSize: 28, fontWeight: '800', color: '#004e68' },
  validityRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 24,
  },
  validityText: { fontSize: 12, fontWeight: '600', color: '#FF9800' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#004e68', borderRadius: 12, paddingVertical: 14,
    width: '100%', shadowColor: '#004e68', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginBottom: 10,
  },
  shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  closeOtpBtn: {
    backgroundColor: '#F2F6F8', borderRadius: 12, paddingVertical: 14,
    width: '100%', alignItems: 'center', marginBottom: 16,
  },
  closeOtpBtnText: { color: '#5A7A8A', fontWeight: '600', fontSize: 14 },
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFB',
    borderRadius: 10, padding: 12, gap: 8,
  },
  noteText: { flex: 1, fontSize: 11, lineHeight: 17, color: TEXT_MUT },
});