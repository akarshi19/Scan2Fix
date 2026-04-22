import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, Image,
  TouchableOpacity, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlatList } from 'react-native';
import { complaintsAPI, usersAPI, getFileUrl } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

const STATUS_COLORS = {
  OPEN:        { bg: '#FFF3E0', text: '#E65100', dot: '#FF9800' },
  ASSIGNED:    { bg: '#E3F2FD', text: '#1565C0', dot: '#2196F3' },
  IN_PROGRESS: { bg: '#F3E5F5', text: '#6A1B9A', dot: '#9C27B0' },
  CLOSED:      { bg: '#E8F5E9', text: '#2E7D32', dot: '#4CAF50' },
};

export default function ComplaintDetail({ route, navigation }) {
  const { complaint } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(complaint.assigned_staff_id?.toString() || '');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState(complaint.description || '');
  const [savingDesc, setSavingDesc] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const canEditDesc = isAdmin || user?.id === complaint.user_id?.toString();

  useEffect(() => {
    if (isAdmin) fetchStaffMembers();
  }, [isAdmin]);

  const fetchStaffMembers = async () => {
    try {
      const r = await usersAPI.getStaff();
      if (r.data.success) setStaffList(r.data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleAssign = async () => {
    if (!selectedStaff) { 
      Alert.alert(t('error'), t('selectStaffError')); 
      return; 
    }
    const staffMember = staffList.find(s => s.id === selectedStaff);
    if (staffMember?.availability?.is_on_leave) {
      Alert.alert(
        t('cannotAssign'), 
        `${staffMember.full_name || staffMember.email} ${t('staffOnLeaveMsg')}`
      );
      return;
    }
    setLoading(true);
    try {
      const id = complaint.id || complaint._id;
      const r = await complaintsAPI.assignStaff(id, selectedStaff);
      if (r.data.success) {
        Alert.alert(
          t('success'), 
          r.data.message, 
          [{ text: t('ok'), onPress: () => navigation.goBack() }]
        );
      }
    } catch (e) { 
      Alert.alert(t('error'), e.message); 
    }
    finally { 
      setLoading(false); 
    }
  };

  const handleSaveDescription = async () => {
    if (!descText.trim()) {
      Alert.alert(t('error'), t('descriptionEmpty'));
      return;
    }
    if (descText.trim().length < 10) {
      Alert.alert(t('error'), t('descriptionMin'));
      return;
    }
    setSavingDesc(true);
    try {
      const id = complaint.id || complaint._id;
      const r = await complaintsAPI.updateDescription(id, descText.trim());
      if (r.data.success) {
        complaint.description = descText.trim();
        setEditingDesc(false);
        Alert.alert(t('success'), t('descUpdated'));
      }
    } catch (e) {
      Alert.alert(t('error'), e.message || t('descUpdateFailed'));
    } finally {
      setSavingDesc(false);
    }
  };

  const handleCancelDescEdit = () => {
    setDescText(complaint.description || '');
    setEditingDesc(false);
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'OPEN': t('open'),
      'ASSIGNED': t('assigned'),
      'IN_PROGRESS': t('inProgress'),
      'CLOSED': t('closed'),
    };
    return statusMap[status] || status.replace('_', ' ');
  };

  function InfoRow({ icon, label, value, colors, iconColor, valueColor, last, t }) {
    if (!value && value !== 0) return null;
    return (
      <View style={[s.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
        <Ionicons name={icon} size={16} color={iconColor || colors.textMut} style={{ marginRight: 8, width: 24, textAlign: 'center' }} />
        <Text style={[s.infoLabel, { color: colors.textMut }]}>{label}</Text>
        <Text style={[s.infoValue, { color: valueColor || colors.textPri }]}>{value || t('na')}</Text>
      </View>
    );
  }

  const s = StyleSheet.create({
    card: {
      borderRadius: 16, padding: 18, marginBottom: 14,
      shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
    },
    cardTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    cardTitle: { fontSize: 15, fontWeight: '800' },
    cardTitleSimple: {
      fontSize: 15, fontWeight: '800',
      marginBottom: 16, paddingBottom: 10,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    statusBadge: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 12, gap: 5,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },
    assetHeader: {
      flexDirection: 'row', alignItems: 'center',
      marginBottom: 14,
    },
    assetHeaderInfo: { flex: 1 },
    assetIdText: { fontSize: 17, fontWeight: '800' },
    assetTypeText: { fontSize: 12, marginTop: 2 },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
    infoLabel: { width: 90, fontSize: 12, fontWeight: '600' },
    infoValue: { flex: 1, fontSize: 14, fontWeight: '500' },
    sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
    descriptionBox: {
      backgroundColor: colors.divider, borderRadius: 10,
      padding: 12, borderWidth: 1, borderColor: colors.divider,
    },
    description: { fontSize: 14, lineHeight: 22 },
    photoWrap: { borderRadius: 12, overflow: 'hidden' },
    photo: { width: '100%', height: 200, borderRadius: 12 },
    enlargeOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(255,255,255,0.92)',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 8,
    },
    leaveWarning: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#FFEBEE', borderRadius: 10,
      padding: 12, marginBottom: 14, gap: 8,
    },
    leaveWarningText: { flex: 1, color: colors.staffUnavailable, fontSize: 12, fontWeight: '500', lineHeight: 18 },
    pickerLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    pickerWrap: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderRadius: 10, marginBottom: 14, borderWidth: 1, overflow: 'hidden',
      paddingHorizontal: 14, height: 52,
    },
    pickerValue: { flex: 1, fontSize: 14, marginRight: 8 },
    staffModalSheet: {
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 20, paddingBottom: 30, paddingTop: 12,
    },
    staffModalHandle: {
      width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
      alignSelf: 'center', marginBottom: 16,
    },
    staffModalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
    staffOption: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, marginBottom: 4,
    },
    staffOptionAvatar: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    staffOptionAvatarText: { fontSize: 15, fontWeight: '700' },
    staffOptionIcon: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    staffOptionName: { fontSize: 14 },
    staffOptionStatus: { fontSize: 11, marginTop: 2 },
    staffModalCloseBtn: {
      marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    },
    staffModalCloseTxt: { fontSize: 14, fontWeight: '600' },
    currentAssignRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      marginBottom: 14, padding: 12, borderRadius: 10,
    },
    currentAssignAvatar: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    currentAssignAvatarText: { fontSize: 16, fontWeight: '800' },
    currentAssignName: { fontSize: 15, fontWeight: '700', marginTop: 1 },
    changeStaffBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    },
    changeStaffTxt: { fontSize: 12, fontWeight: '700' },
    warnBox: { backgroundColor: '#FFF3E0', borderRadius: 8, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
    warnText: { color: '#E65100', fontSize: 13 },
    assignBtn: {
      backgroundColor: '#004e68', borderRadius: 10, paddingVertical: 14,
      alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
      shadowColor: '#004e68', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
    },
    assignBtnDisabled: { backgroundColor: '#004e684b', shadowOpacity: 0, elevation: 0 },
    assignBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    currentAssign: { textAlign: 'center', marginTop: 12, fontSize: 12 },
    staffInfoBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#EEF6FB', borderRadius: 10,
      padding: 14, gap: 12,
    },
    staffAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#5BA8D4' },
    staffAvatarFallback: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.active, alignItems: 'center',
      justifyContent: 'center', borderWidth: 2, borderColor: colors.white,
    },
    staffAvatarInitial: { color: colors.white, fontWeight: '700', fontSize: 16 },
    staffName: { fontSize: 15, fontWeight: '700' },
    staffRole: { fontSize: 12, marginTop: 2 },
    notAssignedBox: {
      backgroundColor: colors.divider, borderRadius: 10,
      padding: 24, alignItems: 'center', gap: 6,
    },
    notAssignedTitle: { fontSize: 16, fontWeight: '700', color: '#E65100' },
    notAssignedText: { fontSize: 13, color: '#666', textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: '95%', height: '70%' },
    closeHintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
    closeHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
    descTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    descEditBtn: {
      width: 30, height: 30, borderRadius: 8,
      backgroundColor: colors.navBg,
      alignItems: 'center', justifyContent: 'center',
    },
    descEditWrap: {
      backgroundColor: colors.divider,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.active,
      overflow: 'hidden',
    },
    descEditInput: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 8,
      minHeight: 100,
      fontSize: 14,
      textAlignVertical: 'top',
      lineHeight: 21,
    },
    descCharRow: {
      alignItems: 'flex-end',
      paddingHorizontal: 14,
      paddingBottom: 8,
    },
    descCharCount: {
      fontSize: 11,
      color: '#9DB5C0',
    },
    descEditActions: {
      flexDirection: 'row',
      gap: 8,
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    descCancelBtn: {
      flex: 1,
      backgroundColor: colors.divider,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    descCancelText: {
      color: colors.textMut,
      fontWeight: '600',
      fontSize: 13,
    },
    descSaveBtn: {
      flex: 1,
      backgroundColor: colors.active,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    descSaveBtnDisabled: {
      backgroundColor: colors.shadowColor,
    },
    descSaveText: {
      color: colors.white,
      fontWeight: '700',
      fontSize: 13,
    },
  });

  const statusInfo = STATUS_COLORS[complaint.status] ?? { bg: '#F5F5F5', text: '#666', dot: '#999' };
  const photoUrl = getFileUrl(complaint.photo_url);
  const isClosed = complaint.status === 'CLOSED';
  const staffOnLeave = complaint.profiles?.is_on_leave && !isClosed;
  const selectedLeave = selectedStaff && staffList.find(s => s.id === selectedStaff)?.availability?.is_on_leave;

  const reporterName = complaint.source === 'WEB' 
    ? complaint.contact_name 
    : (complaint.reporter?.full_name
      || complaint.reporter?.email
      || complaint.user?.full_name
      || complaint.user?.email
      || t('unknown'));

  const resolverName = complaint.profiles?.full_name 
    || complaint.profiles?.email 
    || t('unknown');

  return (
    <ScreenLayout title={t('complaintDetails')} showBack showDecor padBottom={100}>
      {/* Complaint Info Card  */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        {/* Title row */}
        <View style={s.cardTitleRow}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('complaintDetails')}</Text>
          <View style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <View style={[s.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <View style={[s.statusDot, { backgroundColor: statusInfo.dot }]} />
              <Text style={[s.statusBadgeText, { color: statusInfo.text }]}>
                {getStatusLabel(complaint.status)}
              </Text>
            </View>
            {complaint.source && (
              <View style={[s.statusBadge, { backgroundColor: complaint.source === 'WEB' ? '#E8F5E9' : '#E1F5FE' }]}>
                <Text style={[s.statusBadgeText, { color: complaint.source === 'WEB' ? '#2E7D32' : '#01579B' }]}>
                  {complaint.source}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Complaint Number + Asset Type */}
        <View style={s.assetHeader}>
          <View style={s.assetHeaderInfo}>
            <Text style={[s.assetIdText, { color: colors.textPri }]}>{complaint.complaint_number}</Text>
            <Text style={[s.assetTypeText, { color: colors.textSec }]}>{complaint.asset_type}</Text>
          </View>
        </View>

        {/* Location fields */}
        <InfoRow icon="business-outline"  label="Station"  value={complaint.station}  colors={colors} iconColor={colors.active} t={t} />
        <InfoRow icon="map-outline"       label="Area"     value={complaint.area}     colors={colors} t={t} />
        <InfoRow icon="location-outline"  label="Location" value={complaint.location} colors={colors} t={t} />

        {/* Complaint Meta */}
        <InfoRow 
          icon="calendar-outline" 
          label={t('reportedOn')} 
          value={new Date(complaint.created_at).toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })} 
          colors={colors}
          t={t}
        />

        <InfoRow 
          icon="person-outline" 
          label={t('reportedBy')} 
          value={reporterName} 
          colors={colors}
          t={t}
        />

        <InfoRow icon="call-outline" label="Phone" value={complaint.contact_phone} colors={colors} t={t} />
        {complaint.contact_email && (
          <InfoRow icon="mail-outline" label="Email" value={complaint.contact_email} colors={colors} t={t} />
        )}

        {complaint.complaint_number && (
          <InfoRow 
            icon="document-text-outline" 
            label={t('complaintNo')} 
            value={complaint.complaint_number} 
            colors={colors}
            t={t}
          />
        )}

        {isClosed && (
          <>
            <InfoRow 
              icon="checkmark-done-outline" 
              label={t('resolvedBy')} 
              value={resolverName} 
              colors={colors} 
              valueColor="#000"
              t={t}
            />
            <InfoRow 
              icon="calendar-outline" 
              label={t('resolvedOn')} 
              value={new Date(complaint.closed_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })} 
              colors={colors} 
              valueColor="#000"
              t={t}
            />
            {complaint.verified_at && (
              <InfoRow 
                icon="shield-checkmark-outline" 
                label={t('verifiedOn')} 
                value={new Date(complaint.verified_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })} 
                colors={colors} 
                valueColor="#000" 
                last
                t={t}
              />
            )}
          </>
        )}

        {/* Issue Description */}
        <View style={s.descTitleRow}>
          <Text style={[s.sectionLabel, { color: colors.textPri }]}>{t('issueDescription')}</Text>
          {canEditDesc && !isClosed && !editingDesc && (
            <TouchableOpacity
              style={s.descEditBtn}
              onPress={() => setEditingDesc(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil-outline" size={14} color={colors.active} />
            </TouchableOpacity>
          )}
        </View>

        {!editingDesc ? (
          <View style={s.descriptionBox}>
            <Text style={[s.description, { color: colors.textSec }]}>
              {descText}
            </Text>
          </View>
        ) : (
          <View style={s.descEditWrap}>
            <TextInput
              style={[s.descEditInput, { color: colors.textPri }]}
              value={descText}
              onChangeText={setDescText}
              multiline
              placeholder={t('describeIssue')}
              placeholderTextColor={colors.textMut}
              autoFocus
            />
            <View style={s.descCharRow}>
              <Text style={[s.descCharCount, descText.trim().length < 10 && { color: '#E53935' }]}>
                {descText.trim().length} {t('characters')} {descText.trim().length < 10 ? t('minChars') : '✓'}
              </Text>
            </View>
            <View style={s.descEditActions}>
              <TouchableOpacity style={s.descCancelBtn} onPress={handleCancelDescEdit}>
                <Text style={s.descCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.descSaveBtn, (savingDesc || descText.trim().length < 10) && s.descSaveBtnDisabled]}
                onPress={handleSaveDescription}
                disabled={savingDesc || descText.trim().length < 10}
                activeOpacity={0.85}
              >
                {savingDesc ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={16} color={colors.white} />
                    <Text style={s.descSaveText}> {t('save')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Photo Card   */}
      {photoUrl && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>{t('attachedPhoto')}</Text>
          <TouchableOpacity onPress={() => setShowFullImage(true)} activeOpacity={0.9}>
            <View style={s.photoWrap}>
              <Image source={{ uri: photoUrl }} style={s.photo} />
              <View style={s.enlargeOverlay}>
                <Ionicons name="expand-outline" size={13} color={colors.active} />
                <Text style={{ fontSize: 12, color: colors.active, fontWeight: '500' }}> {t('tapToEnlarge')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
      {/* Acknowledgement Photo — shown when closed via written ack */}
      {isClosed && complaint.ack_photo_url && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>Acknowledgement Photo</Text>
          <View style={s.photoWrap}>
            <Image source={{ uri: getFileUrl(complaint.ack_photo_url) }} style={s.photo} />
          </View>
        </View>
      )}

      {/* Assign Staff — ADMIN ONLY    */}
      {!isClosed && isAdmin && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>{t('assignStaff')}</Text>

          {staffOnLeave && (
            <View style={s.leaveWarning}>
              <Ionicons name="warning" size={16} color={colors.staffUnavailable} />
              <Text style={s.leaveWarningText}>
                {t('staffOnLeaveWarning')}
              </Text>
            </View>
          )}

          {complaint.assigned_staff_id ? (
            <View style={s.currentAssignRow}>
              <View style={[s.currentAssignAvatar, { backgroundColor: `${colors.active}20` }]}>
                <Text style={[s.currentAssignAvatarText, { color: colors.active }]}>
                  {(complaint.profiles?.full_name || complaint.profiles?.email || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.pickerLabel, { color: colors.textSec, marginBottom: 0 }]}>{t('assignedStaff') || 'Assigned Staff'}</Text>
                <Text style={[s.currentAssignName, { color: colors.textPri }]}>
                  {staffList.find(s => s.id === complaint.assigned_staff_id?.toString())?.full_name
                    || complaint.profiles?.full_name
                    || t('unknown')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowStaffModal(true)} style={[s.changeStaffBtn, { backgroundColor: `${colors.active}15` }]}>
                <Ionicons name="swap-horizontal-outline" size={14} color={colors.active} />
                <Text style={[s.changeStaffTxt, { color: colors.active }]}>{t('reassign') || 'Change'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[s.pickerLabel, { color: colors.textSec }]}>{t('selectStaff')}</Text>
              <TouchableOpacity
                style={[s.pickerWrap, { backgroundColor: colors.navBg, borderColor: colors.inputBorder }]}
                onPress={() => setShowStaffModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.pickerValue, { color: selectedStaff ? colors.textPri : colors.textMut }]} numberOfLines={1}>
                  {selectedStaff
                    ? (() => { const st = staffList.find(s => s.id === selectedStaff); return st ? `${st.full_name || st.email}` : t('selectStaffPlaceholder'); })()
                    : t('selectStaffPlaceholder')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.active} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[s.assignBtn, (loading || !selectedStaff || selectedLeave) && s.assignBtnDisabled]}
            onPress={handleAssign}
            disabled={loading || !selectedStaff || selectedLeave}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color={colors.white} />
            <Text style={s.assignBtnText}>
              {loading ? t('assigning') : complaint.assigned_staff_id ? t('reassign') : t('assign')}
            </Text>
          </TouchableOpacity>

          {/* {complaint.assigned_staff_id && (
            <Text style={[s.currentAssign, { color: colors.textMut }]}>
              {t('current')} {staffList.find(s => s.id === complaint.assigned_staff_id?.toString())?.full_name || complaint.profiles?.full_name || t('unknown')}
            </Text>
          )} */}
        </View>
      )}

      {/* Assigned Staff — NON-ADMIN read-only     */}
      {!isClosed && !isAdmin && complaint.profiles && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitleSimple, { color: colors.textPri }]}>{t('assignedStaff')}</Text>
          <View style={s.staffInfoBar}>
            {complaint.profiles.photo_url ? (
              <Image source={{ uri: getFileUrl(complaint.profiles.photo_url) }} style={s.staffAvatar} />
            ) : (
              <View style={s.staffAvatarFallback}>
                <Text style={s.staffAvatarInitial}>
                  {complaint.profiles.full_name?.charAt(0) ?? 'S'}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[s.staffName, { color: colors.textPri }]}>
                {complaint.profiles.full_name || complaint.profiles.email}
              </Text>
              <Text style={[s.staffRole, { color: colors.textMut }]}>{t('maintenanceStaff')}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.closed} />
          </View>

          {staffOnLeave && (
            <View style={s.leaveWarning}>
              <Ionicons name="warning" size={16} color={colors.staffUnavailable} />
              <Text style={s.leaveWarningText}>{t('staffCurrentlyOnLeave')}</Text>
            </View>
          )}
        </View>
      )}

      {/* Not assigned — NON-ADMIN */}
      {!isClosed && !isAdmin && !complaint.profiles && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <View style={s.notAssignedBox}>
            <Ionicons name="time-outline" size={32} color={colors.open}/>
            <Text style={s.notAssignedTitle}>{t('pendingAssignment')}</Text>
            <Text style={s.notAssignedText}>{t('staffWillAssign')}</Text>
          </View>
        </View>
      )}

      {/* Staff picker modal */}
      <Modal visible={showStaffModal} transparent animationType="fade" onRequestClose={() => setShowStaffModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowStaffModal(false)}>
          <View style={[s.staffModalSheet, { backgroundColor: colors.cardBg }]} onStartShouldSetResponder={() => true}>
            <View style={s.staffModalHandle} />
            <Text style={[s.staffModalTitle, { color: colors.textPri }]}>{t('selectStaff')}</Text>
            <FlatList
              data={staffList}
              keyExtractor={item => item.id}
              style={{ maxHeight: 360 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[s.staffOption, !selectedStaff && { backgroundColor: `${colors.active}12` }]}
                  onPress={() => { setSelectedStaff(''); setShowStaffModal(false); }}
                >
                  <View style={[s.staffOptionIcon, { backgroundColor: colors.navBg }]}>
                    <Ionicons name="remove-circle-outline" size={18} color={colors.textMut} />
                  </View>
                  <Text style={[s.staffOptionName, { color: !selectedStaff ? colors.active : colors.textPri, fontWeight: !selectedStaff ? '700' : '500' }]}>
                    {t('selectStaffPlaceholder')}
                  </Text>
                  {!selectedStaff && <Ionicons name="checkmark-circle" size={18} color={colors.active} />}
                </TouchableOpacity>
              }
              renderItem={({ item }) => {
                const isOnLeave = item.availability?.is_on_leave;
                const isSelected = selectedStaff === item.id;
                return (
                  <TouchableOpacity
                    style={[s.staffOption, isSelected && { backgroundColor: `${colors.active}12` }, isOnLeave && { opacity: 0.5 }]}
                    onPress={() => { if (!isOnLeave) { setSelectedStaff(item.id); setShowStaffModal(false); } }}
                    activeOpacity={isOnLeave ? 1 : 0.7}
                  >
                    <View style={[s.staffOptionAvatar, { backgroundColor: isSelected ? `${colors.active}20` : colors.navBg }]}>
                      <Text style={[s.staffOptionAvatarText, { color: isSelected ? colors.active : colors.textSec }]}>
                        {(item.full_name || item.email || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.staffOptionName, { color: isSelected ? colors.active : colors.textPri, fontWeight: isSelected ? '700' : '500' }]}>
                        {item.full_name || item.email}
                      </Text>
                      <Text style={[s.staffOptionStatus, { color: isOnLeave ? colors.staffUnavailable : '#22C55E' }]}>
                        {isOnLeave ? `● ${t('onLeave')}` : `● ${t('available')}`}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.active} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={[s.staffModalCloseBtn, { backgroundColor: colors.navBg }]}
              onPress={() => setShowStaffModal(false)}
            >
              <Text style={[s.staffModalCloseTxt, { color: colors.textSec }]}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full image modal */}
      <Modal visible={showFullImage} transparent animationType="fade" onRequestClose={() => setShowFullImage(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowFullImage(false)}>
          <Image source={{ uri: photoUrl }} style={s.fullImage} resizeMode="contain" />
          <View style={s.closeHintRow}>
            <Ionicons name="close-circle-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={s.closeHint}> {t('tapToClose')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}