import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Alert,
  TouchableOpacity, TextInput, Dimensions, Modal, FlatList,
} from 'react-native';
import { Ionicons, FontAwesome, AntDesign } from '@expo/vector-icons';
import { usersAPI, getFileUrl } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';
import ConfirmDialog from '../../components/ConfirmDialog';

const MASTER_ADMIN_EMAIL = 'adminscan2fix@gmail.com';
const MASTER_ADMIN_USERNAME = 'Scan2fix_Admin';

const { width } = Dimensions.get('window');
const SKY = '#7DD3F0';
const ACTIVE = '#5BA8D4';
const CARD_BG = '#FFFFFF';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#5A7A8A';
const TEXT_MUT = '#9DB5C0';
const AVATAR_SIZE = 96;

const ROLE_COLORS = { role: { bg: '#E8F5FB', text: ACTIVE, dot: ACTIVE } };

function DetailRow({ iconName, label, value, last }) {
  return (
    <View style={[s.detailRow, !last && s.detailRowBorder]}>
      <Ionicons name={iconName} size={16} color={TEXT_MUT} style={s.detailIcon} />
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
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TEXT_MUT}
        keyboardType={keyboardType ?? 'default'}
        editable={editable}
      />
    </View>
  );
}

export default function UserDetail({ route, navigation }) {
  const { user: userParam } = route.params;
  const [user, setUser] = useState(userParam);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [designation, setDesignation] = useState(user.designation || '');
  const [employeeId, setEmployeeId] = useState(user.employee_id || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Designation picker state
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [existingDesignations, setExistingDesignations] = useState([]);
  const [isAddingCustomDesignation, setIsAddingCustomDesignation] = useState(false);
  const [customDesignation, setCustomDesignation] = useState('');

  const roleStyle = ROLE_COLORS.role;
  const photoUrl = getFileUrl(user.photo_url);

  // Fetch designations when editing staff
  useEffect(() => {
    if (user.role === 'STAFF') {
      fetchDesignations();
    }
  }, []);

  const fetchDesignations = async () => {
    try {
      const response = await usersAPI.getDesignations();
      if (response.data.success) {
        const designations = response.data.data || [];
        // Ensure current designation is in the list
        if (designation && !designations.includes(designation)) {
          designations.push(designation);
        }
        setExistingDesignations(designations.sort());
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      setExistingDesignations(['JUNIOR', 'SENIOR']);
    }
  };

  const handleAddCustomDesignation = () => {
    const trimmed = customDesignation.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a designation');
      return;
    }
    if (trimmed.length < 2) {
      Alert.alert('Error', 'Designation must be at least 2 characters');
      return;
    }
    if (existingDesignations.includes(trimmed)) {
      setDesignation(trimmed);
      setCustomDesignation('');
      setIsAddingCustomDesignation(false);
      setShowDesignationModal(false);
      return;
    }
    setExistingDesignations(prev => [...prev, trimmed].sort());
    setDesignation(trimmed);
    setCustomDesignation('');
    setIsAddingCustomDesignation(false);
    setShowDesignationModal(false);
  };

  const toggleLeaveStatus = async () => {
    setLoading(true);
    try {
      const r = await usersAPI.toggleLeave(user.id);
      if (r.data.success) {
        const updatedUser = { ...user, is_on_leave: !user.is_on_leave };
        setUser(updatedUser);
        navigation.setParams({ user: updatedUser });
        Alert.alert('Success', r.data.message);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    setLoading(true);
    try {
      const r = await usersAPI.update(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        designation: designation || null,
        employee_id: employeeId || null,
      });
      if (r.data.success) {
        const updatedUser = {
          ...user,
          full_name: fullName.trim(),
          phone: phone.trim(),
          designation,
          employee_id: employeeId,
        };
        setUser(updatedUser);
        navigation.setParams({ user: updatedUser });
        setEditing(false);
        Alert.alert('Success', 'User details updated');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(user.full_name || '');
    setPhone(user.phone || '');
    setDesignation(user.designation || '');
    setEmployeeId(user.employee_id || '');
    setEditing(false);
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const response = await usersAPI.deleteUser(user.id);
      if (response.data.success) {
        Alert.alert(
          'User Deleted',
          response.data.message,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Check if user can be deleted
  const isMasterAdmin = user.email === MASTER_ADMIN_EMAIL || user.full_name === MASTER_ADMIN_USERNAME;
  const canDeleteUser = !isMasterAdmin;

  return (
    <ScreenLayout title="User Details" showBack showDecor padBottom={0}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            <Ionicons
              name={user.role === 'ADMIN' ? 'star' : user.role === 'STAFF' ? 'build' : 'person'}
              size={13}
              color={roleStyle.text}
            />
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
            <TouchableOpacity
              style={[s.editIconBtn, editing && s.editIconBtnActive]}
              onPress={() => editing ? handleCancelEdit() : setEditing(true)}
            >
              {editing
                ? <AntDesign name="close" size={14} color="#E53935" />
                : <Ionicons name="pencil-outline" size={16} color={ACTIVE} />
              }
            </TouchableOpacity>
          </View>

          {!editing ? (
            <>
              <DetailRow iconName="mail-outline" label="Email:" value={user.email} />
              <DetailRow iconName="call-outline" label="Phone:" value={user.phone || 'Not provided'} />
              {user.role === 'STAFF' && (
                <>
                  <DetailRow iconName="card-outline" label="Employee ID:" value={user.employee_id || 'Not provided'} />
                  <DetailRow iconName="briefcase-outline" label="Designation:" value={user.designation || 'Not set'} />
                </>
              )}
              <DetailRow
                iconName="calendar-outline"
                label="Joined On:"
                value={new Date(user.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
                last
              />
            </>
          ) : (
            <>
              <Field label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Enter full name" />
              <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Enter phone" keyboardType="phone-pad" />
              {user.role === 'STAFF' && (
                <>
                  <Field label="Employee ID" value={employeeId} onChangeText={setEmployeeId} placeholder="e.g. EMP-001" />

                  {/* Designation Picker */}
                  <View style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>Designation</Text>
                    <TouchableOpacity
                      style={s.designationSelector}
                      onPress={() => setShowDesignationModal(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="briefcase-outline"
                        size={16}
                        color={designation ? ACTIVE : TEXT_MUT}
                      />
                      <Text style={[
                        s.designationSelectorText,
                        { color: designation ? TEXT_PRI : TEXT_MUT },
                      ]}>
                        {designation || 'Select designation...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={TEXT_MUT} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={s.editActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={handleCancelEdit}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, loading && s.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.85}
                >
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
              onPress={toggleLeaveStatus}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons
                name={user.is_on_leave ? 'checkmark-circle-outline' : 'home-outline'}
                size={18}
                color={user.is_on_leave ? '#2E7D32' : '#E65100'}
              />
              <Text style={[
                s.leaveBtnText,
                user.is_on_leave ? s.leaveBtnTextAvail : s.leaveBtnTextLeave,
              ]}>
                {loading ? 'Updating…' : user.is_on_leave ? '  Mark as Available' : '  Mark as On Leave'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Delete User Section - Only show if user can be deleted */}
        {canDeleteUser && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Danger Zone</Text>
            <TouchableOpacity
              style={s.deleteUserBtn}
              onPress={() => setShowDeleteDialog(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={18} color="#E53935" />
              <Text style={s.deleteUserBtnText}>Delete User Account</Text>
            </TouchableOpacity>
            <Text style={s.deleteWarning}>
              This will permanently delete this user and all associated data
            </Text>
          </View>
        )}

        {/* Master Admin Protection Notice */}
        {isMasterAdmin && (
          <View style={s.masterAdminNotice}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={s.masterAdminText}>
              Master Admin account is protected and cannot be deleted
            </Text>
          </View>
        )}

        {/* Add at the end, before </ScreenLayout> */}
        <ConfirmDialog
          visible={showDeleteDialog}
          title="Delete User?"
          message={`Are you sure you want to delete ${user.full_name || user.email}?\n\nThis action cannot be undone.`}
          confirmText={deleting ? 'Deleting...' : 'Delete Forever'}
          cancelText="Cancel"
          type="danger"
          onConfirm={handleDeleteUser}
          onCancel={() => setShowDeleteDialog(false)}
        />

        <View style={{ height: 120 }} />
      </ScrollView>
      {/* Designation Selection Modal */}
      <Modal
        visible={showDesignationModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDesignationModal(false);
          setIsAddingCustomDesignation(false);
          setCustomDesignation('');
        }}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDesignationModal(false);
            setIsAddingCustomDesignation(false);
            setCustomDesignation('');
          }}
        >
          <View
            style={s.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Select Designation</Text>

            {/* None option */}
            <TouchableOpacity
              style={[s.desigOption, !designation && s.desigOptionActive]}
              onPress={() => {
                setDesignation('');
                setShowDesignationModal(false);
              }}
              activeOpacity={0.7}
            >
              <View style={[s.desigOptionIcon, { backgroundColor: '#F2F6F8' }]}>
                <Ionicons name="remove-circle-outline" size={18} color={TEXT_MUT} />
              </View>
              <Text style={[s.desigOptionLabel, !designation && { fontWeight: '700', color: ACTIVE }]}>
                No Designation
              </Text>
              {!designation && (
                <Ionicons name="checkmark-circle" size={20} color={ACTIVE} />
              )}
            </TouchableOpacity>

            {/* Existing Designations */}
            <FlatList
              data={existingDesignations}
              keyExtractor={(item) => item}
              style={s.desigList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.desigOption, designation === item && s.desigOptionActive]}
                  onPress={() => {
                    setDesignation(item);
                    setShowDesignationModal(false);
                    setIsAddingCustomDesignation(false);
                    setCustomDesignation('');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    s.desigOptionIcon,
                    { backgroundColor: designation === item ? `${ACTIVE}15` : '#F2F6F8' },
                  ]}>
                    <Ionicons
                      name="briefcase-outline"
                      size={18}
                      color={designation === item ? ACTIVE : TEXT_MUT}
                    />
                  </View>
                  <Text style={[
                    s.desigOptionLabel,
                    designation === item && { fontWeight: '700', color: ACTIVE },
                  ]}>
                    {item}
                  </Text>
                  {designation === item && (
                    <Ionicons name="checkmark-circle" size={20} color={ACTIVE} />
                  )}
                </TouchableOpacity>
              )}
            />

            {/* Divider */}
            <View style={s.modalDivider} />

            {/* Add Custom Designation */}
            {!isAddingCustomDesignation ? (
              <TouchableOpacity
                style={s.addDesigBtn}
                onPress={() => setIsAddingCustomDesignation(true)}
                activeOpacity={0.8}
              >
                <View style={[s.addDesigIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="add" size={20} color="#4CAF50" />
                </View>
                <Text style={s.addDesigText}>Add New Designation</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.customDesigWrap}>
                <Text style={s.customDesigLabel}>New Designation</Text>
                <TextInput
                  style={s.customDesigInput}
                  value={customDesignation}
                  onChangeText={setCustomDesignation}
                  placeholder="e.g., TECHNICIAN, SUPERVISOR..."
                  placeholderTextColor={TEXT_MUT}
                  autoCapitalize="characters"
                  autoFocus
                />
                {customDesignation.trim() && (
                  <Text style={s.customDesigPreview}>
                    Will be saved as: {customDesignation.trim().toUpperCase()}
                  </Text>
                )}
                <View style={s.customDesigActions}>
                  <TouchableOpacity
                    style={s.customDesigCancelBtn}
                    onPress={() => {
                      setIsAddingCustomDesignation(false);
                      setCustomDesignation('');
                    }}
                  >
                    <Text style={s.customDesigCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.customDesigAddBtn,
                      !customDesignation.trim() && s.customDesigAddBtnDisabled,
                    ]}
                    onPress={handleAddCustomDesignation}
                    disabled={!customDesignation.trim()}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={s.customDesigAddText}> Add & Select</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Close */}
            <TouchableOpacity
              style={s.modalCloseBtn}
              onPress={() => {
                setShowDesignationModal(false);
                setIsAddingCustomDesignation(false);
                setCustomDesignation('');
              }}
            >
              <Text style={s.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 24, marginBottom: 16 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4, borderColor: '#FFF', marginBottom: 14,
  },
  avatarFallback: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#FFF', marginBottom: 14,
  },
  avatarInitial: { color: '#FFF', fontSize: 38, fontWeight: '700' },
  heroName: { fontSize: 22, fontWeight: '800', color: TEXT_PRI, marginBottom: 4 },
  heroEmail: { fontSize: 13, color: TEXT_SEC, marginBottom: 12 },
  rolePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  rolePillText: { fontSize: 13, fontWeight: '700' },
  leaveBadge: {
    backgroundColor: '#FF9800', borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 6, marginTop: 10, flexDirection: 'row', alignItems: 'center',
  },
  leaveBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 12 },

  // Card
  card: {
    backgroundColor: CARD_BG, borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEF4F8',
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRI },
  editIconBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#EEF6FB',
    alignItems: 'center', justifyContent: 'center',
  },
  editIconBtnActive: { backgroundColor: '#FDECEA' },

  // Detail rows
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF4F8' },
  detailIcon: { marginRight: 12 },
  detailLabel: { width: 100, fontSize: 13, color: TEXT_MUT, fontWeight: '500' },
  detailValue: { flex: 1, fontSize: 14, color: TEXT_PRI, fontWeight: '600' },

  // Fields
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: TEXT_SEC, marginBottom: 5 },
  fieldInput: {
    backgroundColor: '#EEF6FB', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, color: TEXT_PRI,
    borderWidth: 1, borderColor: `${SKY}60`,
  },
  fieldInputDisabled: { backgroundColor: '#F5F8FA', color: TEXT_MUT, borderColor: '#E0EBF0' },

  // Designation selector
  designationSelector: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF6FB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: `${SKY}60`, gap: 10,
  },
  designationSelectorText: { flex: 1, fontSize: 14 },

  // Edit actions
  editActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  saveBtn: {
    flex: 2, backgroundColor: ACTIVE, borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  saveBtnDisabled: { backgroundColor: '#B0CDD8' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#EEF4F8', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: TEXT_SEC, fontWeight: '600', fontSize: 14 },

  // Leave button
  leaveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center' },
  leaveBtnLeave: { backgroundColor: '#FFF3E0' },
  leaveBtnAvail: { backgroundColor: '#E8F5E9' },
  leaveBtnText: { fontSize: 14, fontWeight: '700' },
  leaveBtnTextLeave: { color: '#E65100' },
  leaveBtnTextAvail: { color: '#2E7D32' },

  // Designation Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12, maxHeight: '70%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRI, marginBottom: 16 },
  modalDivider: { height: 1, backgroundColor: '#EEF4F8', marginVertical: 12 },

  desigList: { maxHeight: 220 },
  desigOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, gap: 12,
  },
  desigOptionActive: { backgroundColor: '#F0F8FF' },
  desigOptionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  desigOptionLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT_PRI },

  // Add custom designation
  addDesigBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, gap: 12 },
  addDesigIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addDesigText: { fontSize: 15, fontWeight: '600', color: '#4CAF50' },

  customDesigWrap: { marginBottom: 8 },
  customDesigLabel: { fontSize: 12, fontWeight: '600', color: TEXT_SEC, marginBottom: 8 },
  customDesigInput: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    borderWidth: 1.5, borderColor: ACTIVE, backgroundColor: '#F8FAFB', color: TEXT_PRI,
  },
  customDesigPreview: { fontSize: 11, color: TEXT_MUT, marginTop: 6, marginLeft: 4 },
  customDesigActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  customDesigCancelBtn: { flex: 1, backgroundColor: '#F2F6F8', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  customDesigCancelText: { color: TEXT_SEC, fontWeight: '600', fontSize: 13 },
  customDesigAddBtn: {
    flex: 1.5, backgroundColor: '#4CAF50', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  customDesigAddBtnDisabled: { backgroundColor: '#A5D6A7' },
  customDesigAddText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  modalCloseBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F2F6F8', alignItems: 'center' },
  modalCloseBtnText: { fontSize: 15, fontWeight: '600', color: TEXT_SEC },

  deleteUserBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFEBEE', borderRadius: 10, paddingVertical: 14,
    marginTop: 8, gap: 8, borderWidth: 1, borderColor: '#FFCDD2',
  },
  deleteUserBtnText: {
    color: '#E53935', fontWeight: '700', fontSize: 14,
  },
  deleteWarning: {
    fontSize: 11, color: TEXT_MUT, textAlign: 'center',
    marginTop: 8, fontStyle: 'italic',
  },
  masterAdminNotice: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9',
    borderRadius: 12, padding: 14, marginBottom: 14, gap: 10,
  },
  masterAdminText: {
    flex: 1, fontSize: 13, color: '#2E7D32', fontWeight: '600',
  },
});