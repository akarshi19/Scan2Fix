import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Alert,
  TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { Ionicons, FontAwesome, AntDesign } from '@expo/vector-icons';
import { usersAPI, getFileUrl } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

const { width } = Dimensions.get('window');
const SKY = '#7DD3F0'; const ACTIVE = '#5BA8D4'; const SLATE = '#94A3B8';
const PAGE_BG = '#F2F6F8'; const CARD_BG = '#FFFFFF';
const TEXT_PRI = '#1A1A2E'; const TEXT_SEC = '#5A7A8A'; const TEXT_MUT = '#9DB5C0';
const AVATAR_SIZE = 96;

const ROLE_COLORS = {
  ADMIN: { bg: '#F3E5F5', text: '#6A1B9A', dot: '#9C27B0' },
  STAFF: { bg: '#E8F5FB', text: ACTIVE,    dot: ACTIVE    },
  USER:  { bg: '#E3F2FD', text: '#1565C0', dot: '#2196F3' },
};

function DetailRow({ iconName, iconLib = 'Ionicons', label, value, last }) {
  const iconColor = TEXT_MUT;
  const IconComponent = iconLib === 'FontAwesome' ? FontAwesome : Ionicons;
  return (
    <View style={[s.detailRow, !last && s.detailRowBorder]}>
      <IconComponent name={iconName} size={16} color={iconColor} style={s.detailIcon} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, editable = true }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, !editable && s.fieldInputDisabled]}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={TEXT_MUT}
        keyboardType={keyboardType ?? 'default'} editable={editable}
      />
    </View>
  );
}

export default function UserDetail({ route, navigation }) {
  const { user: userParam } = route.params;
  const [user, setUser]             = useState(userParam);
  const [loading, setLoading]       = useState(false);
  const [editing, setEditing]       = useState(false);
  const [fullName, setFullName]     = useState(user.full_name || '');
  const [phone, setPhone]           = useState(user.phone || '');
  const [designation, setDesignation] = useState(user.designation || '');
  const [employeeId, setEmployeeId]   = useState(user.employee_id || '');

  const roleStyle = ROLE_COLORS[user.role] ?? { bg: '#F5F5F5', text: '#666', dot: '#999' };
  const photoUrl  = getFileUrl(user.photo_url);

  const toggleLeaveStatus = async () => {
    setLoading(true);
     try {
      const r = await usersAPI.toggleLeave(user.id);
      if (r.data.success) {
        const updatedUser = { ...user, is_on_leave: !user.is_on_leave };
        setUser(updatedUser);
        // Update the params so ManageUsers can read it
        navigation.setParams({ user: updatedUser });
        Alert.alert('Success', r.data.message);
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const r = await usersAPI.update(user.id, { full_name: fullName.trim(), phone: phone.trim(), designation: designation || null, employee_id: employeeId || null });
      if (r.data.success) {
        setUser({ ...user, full_name: fullName.trim(), phone: phone.trim(), designation, employee_id: employeeId });
        setEditing(false);
        Alert.alert('Success', 'User details updated');
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  return (
      <ScreenLayout title="User Details" showBack={true}>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatarFallback, { backgroundColor: roleStyle.dot }]}>
              <Text style={s.avatarInitial}>{user.full_name?.charAt(0) ?? '?'}</Text>
            </View>
          )}
          <Text style={s.heroName}>{user.full_name || 'No Name'}</Text>
          <Text style={s.heroEmail}>{user.email}</Text>
          <View style={[s.rolePill, { backgroundColor: roleStyle.bg }]}>
            <Ionicons name={user.role === 'ADMIN' ? 'star' : user.role === 'STAFF' ? 'build' : 'person'} size={13} color={roleStyle.text} />
            <Text style={[s.rolePillText, { color: roleStyle.text }]}>  {user.role}</Text>
          </View>
          {user.is_on_leave && (
            <View style={s.leaveBadge}>
              <Ionicons name="home-outline" size={13} color="#FFF" />
              <Text style={s.leaveBadgeText}>  Currently On Leave</Text>
            </View>
          )}
        </View>

        {/* Details card */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>User Details</Text>
            <TouchableOpacity style={[s.editIconBtn, editing && s.editIconBtnActive]} onPress={() => setEditing(!editing)}>
              {editing
                ? <AntDesign name="close" size={14} color="#E53935" />
                : <Ionicons name="pencil-outline" size={16} color={ACTIVE} />
              }
            </TouchableOpacity>
          </View>

          {!editing ? (
            <>
              <DetailRow iconName="mail-outline"     label="Email"       value={user.email} />
              <DetailRow iconName="call-outline"     label="Phone"       value={user.phone || 'Not provided'} />
              {user.role === 'STAFF' && (
                <>
                  <DetailRow iconName="card-outline"   label="Employee ID" value={user.employee_id || 'Not provided'} />
                  <DetailRow iconName="briefcase-outline" label="Designation" value={user.designation || 'Not set'} />
                </>
              )}
              <DetailRow iconName="calendar-outline" label="Joined"
                value={new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                last />
            </>
          ) : (
            <>
              <Field label="Full Name"   value={fullName}   onChangeText={setFullName}   placeholder="Enter full name" />
              <Field label="Phone"       value={phone}      onChangeText={setPhone}       placeholder="Enter phone" keyboardType="phone-pad" />
              {user.role === 'STAFF' && (
                <>
                  <Field label="Employee ID"  value={employeeId}  onChangeText={setEmployeeId}  placeholder="e.g. EMP-001" />
                  <Field label="Designation"  value={designation} onChangeText={setDesignation} placeholder="JUNIOR or SENIOR" />
                </>
              )}
              <View style={s.editActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, loading && s.saveBtnDisabled]} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
                  <Ionicons name="checkmark-outline" size={17} color="#FFF" />
                  <Text style={s.saveBtnText}>{loading ? 'Saving…' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Staff actions */}
        {user.role === 'STAFF' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Staff Actions</Text>
            <TouchableOpacity
              style={[s.leaveBtn, user.is_on_leave ? s.leaveBtnAvail : s.leaveBtnLeave]}
              onPress={toggleLeaveStatus} disabled={loading} activeOpacity={0.85}
            >
              <Ionicons
                name={user.is_on_leave ? 'checkmark-circle-outline' : 'home-outline'}
                size={18}
                color={user.is_on_leave ? '#2E7D32' : '#E65100'}
              />
              <Text style={[s.leaveBtnText, user.is_on_leave ? s.leaveBtnTextAvail : s.leaveBtnTextLeave]}>
                {loading ? 'Updating…' : user.is_on_leave ? '  Mark as Available' : '  Mark as On Leave'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back-outline" size={16} color={ACTIVE} />
          <Text style={s.backBtnText}>  Back to Users List</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE_BG },
  decorBack: { position: 'absolute', width: width * 0.85, height: 200, top: -110, left: width * 0.28, backgroundColor: SLATE, borderRadius: 24, transform: [{ rotate: '15deg' }] },
  decorFront: { position: 'absolute', width: width * 0.75, height: 200, top: -88, left: 8, backgroundColor: SKY, borderRadius: 24, transform: [{ rotate: '15deg' }] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  hero: { alignItems: 'center', paddingVertical: 24, marginBottom: 16 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 4, borderColor: '#FFF', marginBottom: 14, shadowColor: ACTIVE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  avatarFallback: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFF', marginBottom: 14 },
  avatarInitial: { color: '#FFF', fontSize: 38, fontWeight: '700' },
  heroName: { fontSize: 22, fontWeight: '800', color: TEXT_PRI, marginBottom: 4 },
  heroEmail: { fontSize: 13, color: TEXT_SEC, marginBottom: 12 },
  rolePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  rolePillText: { fontSize: 13, fontWeight: '700' },
  leaveBadge: { backgroundColor: '#FF9800', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  leaveBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: CARD_BG, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEF4F8' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRI },
  editIconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EEF6FB', alignItems: 'center', justifyContent: 'center' },
  editIconBtnActive: { backgroundColor: '#FDECEA' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF4F8' },
  detailIcon: { marginRight: 12 },
  detailLabel: { width: 100, fontSize: 13, color: TEXT_MUT, fontWeight: '500' },
  detailValue: { flex: 1, fontSize: 14, color: TEXT_PRI, fontWeight: '600' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: TEXT_SEC, marginBottom: 5 },
  fieldInput: { backgroundColor: '#EEF6FB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT_PRI, borderWidth: 1, borderColor: `${SKY}60` },
  fieldInputDisabled: { backgroundColor: '#F5F8FA', color: TEXT_MUT, borderColor: '#E0EBF0' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  saveBtn: { flex: 2, backgroundColor: ACTIVE, borderRadius: 10, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: ACTIVE, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  saveBtnDisabled: { backgroundColor: '#B0CDD8', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#EEF4F8', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: TEXT_SEC, fontWeight: '600', fontSize: 14 },
  leaveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center' },
  leaveBtnLeave: { backgroundColor: '#FFF3E0' },
  leaveBtnAvail: { backgroundColor: '#E8F5E9' },
  leaveBtnText: { fontSize: 14, fontWeight: '700' },
  leaveBtnTextLeave: { color: '#E65100' },
  leaveBtnTextAvail: { color: '#2E7D32' },
  backBtn: { alignSelf: 'center', marginTop: 4, paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backBtnText: { color: ACTIVE, fontSize: 14, fontWeight: '600' },
});