import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, Dimensions, TextInput as RNTextInput,
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { authAPI, getFileUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import PhotoPicker from '../../components/PhotoPicker';
import ScreenLayout from '../../components/ScreenLayout';

const { width } = Dimensions.get('window');
const SKY = '#7DD3F0'; const ACTIVE = '#5BA8D4'; const SLATE = '#94A3B8';
const PAGE_BG = '#F2F6F8'; const CARD_BG = '#FFFFFF';
const TEXT_PRI = '#1A1A2E'; const TEXT_SEC = '#5A7A8A'; const TEXT_MUT = '#9DB5C0';

const ROLE_COLORS = {
  ADMIN: { bg: '#F3E5F5', text: '#6A1B9A', dot: '#9C27B0' },
  STAFF: { bg: '#E8F5FB', text: ACTIVE, dot: ACTIVE },
  USER:  { bg: '#E3F2FD', text: '#1565C0', dot: '#2196F3' },
};

export default function ProfileScreen() {
  const { user, role, signOut, refreshUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // Change password states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const r = await authAPI.getMe();
      if (r.data.success) {
        const p = r.data.data.user;
        setFullName(p.full_name || '');
        setPhone(p.phone || '');
        setPhotoUrl(p.photo_url || '');
      }
    } catch {
      setFullName(user?.full_name || '');
      setPhone(user?.phone || '');
      setPhotoUrl(user?.photo_url || '');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'Please enter your name'); return; }
    setSaving(true);
    try {
      const r = await authAPI.updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
      if (r.data.success) {
        await refreshUser();
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      Alert.alert('Weak Password', 'Password must contain at least one letter and one number');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await authAPI.changePassword(currentPassword, newPassword);
      if (response.data.success) {
        Alert.alert('Success ✅', 'Password changed successfully');
        setShowChangePassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
    setEditing(false);
  };

  const roleStyle = ROLE_COLORS[role] ?? { bg: '#F5F5F5', text: '#666', dot: '#999' };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <Text style={s.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
     <ScreenLayout
    showProfile={false}
    fixedHeader={
      <View style={s.hero}>
          <PhotoPicker
            currentPhoto={photoUrl}
            userId={user?.id}
            onPhotoUploaded={(newUrl) => { setPhotoUrl(newUrl); refreshUser(); }}
          />
          <Text style={s.heroName}>{fullName || 'User'}</Text>
          <Text style={s.heroEmail}>{user?.email}</Text>
          <View style={[s.rolePill, { backgroundColor: roleStyle.bg }]}>
          </View>
        </View>
    }>
      {/* Logout icon top-right */}
      <TouchableOpacity style={s.logoutIcon} onPress={() => setShowLogout(true)} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={22} color="#E53935" />
      </TouchableOpacity>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
       

        {/* Profile card */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>Profile Information</Text>
            <TouchableOpacity
              style={[s.editIconBtn, editing && s.editIconBtnActive]}
              onPress={() => editing ? handleCancelEdit() : setEditing(true)}
              activeOpacity={0.8}
            >
              {editing
                ? <AntDesign name="close" size={13} color="#E53935" />
                : <Ionicons name="pencil-outline" size={16} color={ACTIVE} />
              }
            </TouchableOpacity>
          </View>

          {!editing ? (
            <>
              <InfoRow icon="person-outline" label="Full Name" value={fullName || '—'} />
              <InfoRow icon="mail-outline" label="Email" value={user?.email || '—'} />
              <InfoRow icon="call-outline" label="Phone" value={phone || 'Not provided'} />
              <InfoRow icon="shield-outline" label="Role" value={role || 'USER'} last />
            </>
          ) : (
            <>
              <EditField label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Enter your name" icon="person-outline" />
              <EditField label="Email" value={user?.email || ''} editable={false} icon="mail-outline" />
              <EditField label="Phone" value={phone} onChangeText={setPhone} placeholder="Enter phone number" keyboardType="phone-pad" icon="call-outline" />
              <EditField label="Role" value={role || 'USER'} editable={false} icon="shield-outline" />
              <View style={s.editActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={handleCancelEdit}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, saving && s.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-outline" size={17} color="#FFF" />
                  <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Change Password Card */}
        <View style={s.card}>
          <TouchableOpacity
            style={s.menuItem}
            onPress={() => setShowChangePassword(!showChangePassword)}
            activeOpacity={0.7}
          >
            <Ionicons name="key-outline" size={20} color="#FF9800" style={{ marginRight: 15 }} />
            <Text style={s.menuText}>Change Password</Text>
            <Ionicons
              name={showChangePassword ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={TEXT_MUT}
            />
          </TouchableOpacity>

          {showChangePassword && (
            <View style={{ paddingTop: 10 }}>
              {/* Current Password */}
              <View style={s.passInputWrap}>
                <Ionicons name="lock-closed-outline" size={16} color={TEXT_MUT} style={{ marginRight: 10 }} />
                <RNTextInput
                  style={s.passInput}
                  placeholder="Current Password"
                  placeholderTextColor="#9ca3af"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPass}
                />
                <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)} style={{ padding: 8 }}>
                  <Ionicons name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* New Password */}
              <View style={s.passInputWrap}>
                <Ionicons name="lock-open-outline" size={16} color={TEXT_MUT} style={{ marginRight: 10 }} />
                <RNTextInput
                  style={s.passInput}
                  placeholder="New Password (min 6, letter + number)"
                  placeholderTextColor="#9ca3af"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPass}
                />
                <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={{ padding: 8 }}>
                  <Ionicons name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Password Strength */}
              {newPassword.length > 0 && (
                <View style={s.strengthRow}>
                  <View style={s.strengthBar}>
                    <View style={[s.strengthFill, {
                      width: newPassword.length < 6 ? '30%' :
                        (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) ? '60%' : '100%',
                      backgroundColor: newPassword.length < 6 ? '#ef4444' :
                        (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) ? '#f59e0b' : '#22c55e',
                    }]} />
                  </View>
                  <Text style={[s.strengthText, {
                    color: newPassword.length < 6 ? '#ef4444' :
                      (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) ? '#f59e0b' : '#22c55e',
                  }]}>
                    {newPassword.length < 6 ? 'Too short' :
                      (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) ? 'Add letter + number' : 'Strong ✓'}
                  </Text>
                </View>
              )}

              {/* Confirm Password */}
              <View style={s.passInputWrap}>
                <Ionicons name="lock-closed-outline" size={16} color={TEXT_MUT} style={{ marginRight: 10 }} />
                <RNTextInput
                  style={s.passInput}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#9ca3af"
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={!showNewPass}
                />
              </View>

              {/* Match Indicator */}
              {newPassword.length > 0 && confirmNewPassword.length > 0 && (
                <View style={s.matchRow}>
                  <Ionicons
                    name={newPassword === confirmNewPassword ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={newPassword === confirmNewPassword ? '#4CAF50' : '#F44336'}
                  />
                  <Text style={{
                    fontSize: 11, marginLeft: 4,
                    color: newPassword === confirmNewPassword ? '#4CAF50' : '#F44336',
                  }}>
                    {newPassword === confirmNewPassword ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                </View>
              )}

              {/* Update Button */}
              <TouchableOpacity
                style={[s.changePassBtn, changingPassword && s.changePassBtnDisabled]}
                onPress={handleChangePassword}
                disabled={changingPassword}
                activeOpacity={0.85}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" />
                <Text style={s.changePassBtnText}>
                  {changingPassword ? 'Updating…' : 'Update Password'}
                </Text>
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity
                style={s.changePassCancel}
                onPress={() => {
                  setShowChangePassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
              >
                <Text style={s.changePassCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App info */}
        <View style={s.appInfo}>
          <Ionicons name="construct-outline" size={18} color={TEXT_SEC} />
          <Text style={s.appName}>  Scan2Fix</Text>
          <Text style={s.appVersion}>Version 1.0.0</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <ConfirmDialog
        visible={showLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => { setShowLogout(false); signOut(); }}
        onCancel={() => setShowLogout(false)}
      />
    </ScreenLayout>
  );
}

// ── Helper Components ──

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[s.infoRow, !last && s.infoRowBorder]}>
      <Ionicons name={icon} size={15} color={TEXT_MUT} style={{ marginRight: 8 }} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function EditField({ label, icon, value, onChangeText, placeholder, keyboardType, editable = true }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.fieldRow, !editable && s.fieldRowDisabled]}>
        <Ionicons name={icon} size={16} color={TEXT_MUT} />
        <RNTextInput
          style={[s.fieldInput, !editable && s.fieldInputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={TEXT_MUT}
          keyboardType={keyboardType ?? 'default'}
          editable={editable}
        />
      </View>
    </View>
  );
}

// ── Styles ──

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE_BG },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PAGE_BG },
  loadingText: { color: TEXT_MUT, fontSize: 14 },
  decorBack: { position: 'absolute', width: width * 0.85, height: 200, top: -110, left: width * 0.28, backgroundColor: SLATE, borderRadius: 24, transform: [{ rotate: '15deg' }] },
  decorFront: { position: 'absolute', width: width * 0.75, height: 200, top: -88, left: 8, backgroundColor: SKY, borderRadius: 24, transform: [{ rotate: '15deg' }] },
  logoutIcon: { position: 'absolute', top: 48, right: 20, zIndex: 10, width: 38, height: 38, borderRadius: 10, backgroundColor: '#FEF0F0', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 20, marginBottom: 16 },
  heroName: { fontSize: 22, fontWeight: '800', color: TEXT_PRI, marginTop: 14, marginBottom: 4 },
  heroEmail: { fontSize: 13, color: TEXT_SEC, marginBottom: 12 },

  // Card
  card: { backgroundColor: CARD_BG, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEF4F8' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRI },
  editIconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EEF6FB', alignItems: 'center', justifyContent: 'center' },
  editIconBtnActive: { backgroundColor: '#FDECEA' },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF4F8' },
  infoLabel: { width: 80, fontSize: 13, color: TEXT_MUT, fontWeight: '500' },
  infoValue: { flex: 1, fontSize: 14, color: TEXT_PRI, fontWeight: '600', textAlign: 'right' },

  // Edit fields
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: TEXT_SEC, marginBottom: 5 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF6FB', borderRadius: 10, borderWidth: 1, borderColor: `${SKY}60`, paddingHorizontal: 12 },
  fieldRowDisabled: { backgroundColor: '#F5F8FA', borderColor: '#E0EBF0' },
  fieldInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: TEXT_PRI, marginLeft: 8 },
  fieldInputDisabled: { color: TEXT_MUT },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  saveBtn: { flex: 2, backgroundColor: ACTIVE, borderRadius: 10, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, shadowColor: ACTIVE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  saveBtnDisabled: { backgroundColor: '#B0CDD8', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#EEF4F8', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: TEXT_SEC, fontWeight: '600', fontSize: 14 },

  // Menu item
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuText: { flex: 1, fontSize: 15, color: TEXT_PRI, fontWeight: '600' },

  // Change password
  passInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5', borderRadius: 10, marginBottom: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E8EFF3' },
  passInput: { flex: 1, fontSize: 14, color: TEXT_PRI, paddingVertical: 14 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 10 },
  strengthBar: { width: 80, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginRight: 8, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthText: { fontSize: 11, fontWeight: '500' },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 12 },
  changePassBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF9800', borderRadius: 10, paddingVertical: 14, marginTop: 4, shadowColor: '#FF9800', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  changePassBtnDisabled: { backgroundColor: '#FFCC80', shadowOpacity: 0 },
  changePassBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  changePassCancel: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  changePassCancelText: { color: TEXT_SEC, fontSize: 13, fontWeight: '500' },

  // App info
  appInfo: { alignItems: 'center', paddingVertical: 20, flexDirection: 'column', gap: 4 },
  appName: { fontSize: 15, fontWeight: '700', color: TEXT_SEC },
  appVersion: { color: TEXT_MUT, fontSize: 12 },
});