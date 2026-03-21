import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, Image,
  TouchableOpacity, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { complaintsAPI, usersAPI, getFileUrl } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
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
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(complaint.assigned_staff_id?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => { fetchStaffMembers(); }, []);

  const fetchStaffMembers = async () => {
    try {
      const r = await usersAPI.getStaff();
      if (r.data.success) setStaffList(r.data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleAssign = async () => {
    if (!selectedStaff) { Alert.alert('Error', 'Please select a staff member'); return; }
    const staffMember = staffList.find(s => s.id === selectedStaff);
    if (staffMember?.is_on_leave) {
      Alert.alert('Cannot Assign', `${staffMember.full_name || staffMember.email} is on leave.`);
      return;
    }
    setLoading(true);
    try {
      const id = complaint.id || complaint._id;
      const r = await complaintsAPI.assignStaff(id, selectedStaff);
      if (r.data.success) Alert.alert('Staff Assigned!', r.data.message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const statusInfo = STATUS_COLORS[complaint.status] ?? { bg: '#F5F5F5', text: '#666', dot: '#999' };
  const photoUrl = getFileUrl(complaint.photo_url);
  const isClosed = complaint.status === 'CLOSED';
  const staffOnLeave = complaint.profiles?.is_on_leave && !isClosed;
  const selectedLeave = selectedStaff && staffList.find(s => s.id === selectedStaff)?.is_on_leave;

  // Get reporter name
  const reporterName = complaint.reporter?.full_name || complaint.reporter?.email || 'Unknown';

  // Get resolver name (staff who was assigned when complaint was closed)
  const resolverName = complaint.profiles?.full_name || complaint.profiles?.email || 'Unknown';

  return (
    <ScreenLayout title="Complaint Details" showBack={true}>

      {/* Status badge */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
        <View style={[s.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <View style={[s.statusDot, { backgroundColor: statusInfo.dot }]} />
          <Text style={[s.statusBadgeText, { color: statusInfo.text }]}>
            {complaint.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Complaint info card */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>Complaint Details</Text>

        <InfoRow icon="barcode-outline" label="Asset ID" value={complaint.asset_id} colors={colors} />
        <InfoRow icon="cube-outline" label="Type" value={complaint.assets?.type} colors={colors} />
        <InfoRow icon="location-outline" label="Location" value={complaint.assets?.location} colors={colors} iconColor={colors.active} />
        <InfoRow icon="calendar-outline" label="Reported" value={
          new Date(complaint.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        } colors={colors} />

        {/* Reported by */}
        <InfoRow icon="person-outline" label="Reported By" value={reporterName} colors={colors} />

        {/* Resolved by — only for closed complaints */}
        {isClosed && (
          <InfoRow icon="checkmark-done-outline" label="Resolved By" value={resolverName} colors={colors} valueColor="#4CAF50" last />
        )}

        {!isClosed && <View style={{ height: 1 }} />}

        <View style={[s.divider, { backgroundColor: colors.divider }]} />
        <Text style={[s.infoLabel, { color: colors.textMut }]}>Issue Description</Text>
        <Text style={[s.description, { color: colors.textSec }]}>{complaint.description}</Text>
      </View>

      {/* Photo */}
      {photoUrl && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>Attached Photo</Text>
          <TouchableOpacity onPress={() => setShowFullImage(true)} activeOpacity={0.9}>
            <Image source={{ uri: photoUrl }} style={s.photo} />
            <View style={s.enlargeRow}>
              <Ionicons name="expand-outline" size={13} color={colors.active} />
              <Text style={{ fontSize: 12, color: colors.active, fontWeight: '500' }}> Tap to enlarge</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Closed banner — replaces assign staff when complaint is resolved */}
      {isClosed ? (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <View style={s.closedBox}>
            <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
            <Text style={s.closedTitle}>Complaint Resolved</Text>
            <Text style={s.closedDate}>
              Closed: {new Date(complaint.closed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            {complaint.verified_at && (
              <Text style={s.closedDate}>
                Verified: {new Date(complaint.verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            )}
          </View>
        </View>
      ) : (
        /* Assign staff card — only for non-closed complaints */
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>Assign Staff</Text>

          {/* Staff on leave warning for this complaint */}
          {staffOnLeave && (
            <View style={s.leaveWarning}>
              <Ionicons name="warning" size={16} color="#F44336" />
              <Text style={s.leaveWarningText}>
                  Assigned staff ({complaint.profiles?.full_name}) is currently on leave. Consider reassigning.
              </Text>
            </View>
          )}

          <Text style={[s.pickerLabel, { color: colors.textSec }]}>Select Staff Member</Text>
          <View style={[s.pickerWrap, { borderColor: colors.inputBorder }]}>
            <Picker selectedValue={selectedStaff} onValueChange={setSelectedStaff} style={{ height: 52, color: colors.textPri }} dropdownIconColor={colors.active}>
              <Picker.Item label="-- Select Staff --" value="" />
              {staffList.map(staff => (
                <Picker.Item key={staff.id}
                  label={`${staff.full_name || staff.email}${staff.is_on_leave ? '  (On Leave)' : '  ✓'}`}
                  value={staff.id} color={staff.is_on_leave ? '#AAA' : colors.textPri} enabled={!staff.is_on_leave} />
              ))}
            </Picker>
          </View>

          {selectedLeave && (
            <View style={s.warnBox}>
              <Ionicons name="warning-outline" size={16} color="#E65100" />
              <Text style={s.warnText}> This staff member is on leave</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.assignBtn, (loading || !selectedStaff || selectedLeave) && s.assignBtnDisabled]}
            onPress={handleAssign}
            disabled={loading || !selectedStaff || selectedLeave}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={s.assignBtnText}>
              {loading ? 'Assigning…' : complaint.assigned_staff_id ? 'Reassign Staff' : 'Assign Staff'}
            </Text>
          </TouchableOpacity>

          {complaint.assigned_staff_id && (
            <Text style={[s.currentAssign, { color: colors.textMut }]}>
              Currently: {staffList.find(s => s.id === complaint.assigned_staff_id?.toString())?.full_name || complaint.profiles?.full_name || 'Unknown'}
            </Text>
          )}
        </View>
      )}

      {/* Full image modal */}
      <Modal visible={showFullImage} transparent animationType="fade" onRequestClose={() => setShowFullImage(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowFullImage(false)}>
          <Image source={{ uri: photoUrl }} style={s.fullImage} resizeMode="contain" />
          <View style={s.closeHintRow}>
            <Ionicons name="close-circle-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={s.closeHint}> Tap anywhere to close</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}

function InfoRow({ icon, label, value, colors, iconColor, valueColor, last }) {
  return (
    <View style={[s.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Ionicons name={icon} size={16} color={iconColor || colors.textMut} style={{ marginRight: 8, width: 24, textAlign: 'center' }} />
      <Text style={[s.infoLabel, { color: colors.textMut }]}>{label}</Text>
      <Text style={[s.infoValue, { color: valueColor || colors.textPri }]}>{value || 'N/A'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEF4F8' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  infoLabel: { width: 90, fontSize: 12, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 12 },
  description: { fontSize: 14, lineHeight: 22, marginTop: 6 },
  photo: { width: '100%', height: 200, borderRadius: 10 },
  enlargeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  leaveWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 14, gap: 8 },
  leaveWarningText: { flex: 1, color: '#C62828', fontSize: 12, fontWeight: '500', lineHeight: 18 },
  pickerLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  pickerWrap: { backgroundColor: '#EEF6FB', borderRadius: 10, marginBottom: 14, borderWidth: 1, overflow: 'hidden' },
  warnBox: { backgroundColor: '#FFF3E0', borderRadius: 8, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  warnText: { color: '#E65100', fontSize: 13 },
  assignBtn: { backgroundColor: '#5BA8D4', borderRadius: 10, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: '#5BA8D4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  assignBtnDisabled: { backgroundColor: '#B0CDD8', shadowOpacity: 0, elevation: 0 },
  assignBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  currentAssign: { textAlign: 'center', marginTop: 12, fontSize: 12 },
  closedBox: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 24, alignItems: 'center', gap: 6 },
  closedTitle: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  closedDate: { fontSize: 12, color: '#666' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '95%', height: '70%' },
  closeHintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  closeHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
});