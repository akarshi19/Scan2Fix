import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Alert,
  TouchableOpacity, TextInput, Dimensions, Modal, FlatList,
} from 'react-native';
import { Ionicons, FontAwesome, AntDesign } from '@expo/vector-icons';
import { usersAPI, getFileUrl } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
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
  const { t } = useLanguage();
  const [user, setUser] = useState(userParam);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [designation, setDesignation] = useState(user.staff_details?.designation || '');
  const [employeeId, setEmployeeId] = useState(user.staff_details?.employee_id || '');
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
      console.log('Designations API response', response.data);
      if (response.data.success) {
        const designations = response.data.data || [];
        // Ensure current designation is in the list (case-insensitive check)
        if (designation && !designations.some(d => d.toLowerCase() === designation.toLowerCase())) {
          designations.push(designation);
        }
        // Normalize current designation to match canonical casing from the list
        const canonical = designations.find(d => d.toLowerCase() === designation.toLowerCase());
        if (canonical && canonical !== designation) {
          setDesignation(canonical);
        }
        setExistingDesignations(designations.sort());
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      setExistingDesignations(['HELPER', 'SENIOR']);
    }
  };

  const handleAddCustomDesignation = () => {
    const trimmed = customDesignation.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert(t('error'), t('enterDesignation'));
      return;
    }
    if (trimmed.length < 2) {
      Alert.alert(t('error'), t('designationMin'));
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
        const updatedUser = { ...user, availability: { ...user.availability, is_on_leave: !user.availability?.is_on_leave } };
        setUser(updatedUser);
        navigation.setParams({ user: updatedUser });
        Alert.alert(t('success'), r.data.message);
      }
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('error'), t('fullNameRequired'));
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
          staff_details: { ...user.staff_details, designation, employee_id: employeeId },
        };
        setUser(updatedUser);
        navigation.setParams({ user: updatedUser });
        setEditing(false);
        Alert.alert(t('success'), t('userUpdated'));
      }
    } catch (e) {
      Alert.alert(t('error'), e.message || t('userUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(user.full_name || '');
    setPhone(user.phone || '');
    setDesignation(user.staff_details?.designation || '');
    setEmployeeId(user.staff_details?.employee_id || '');
    setEditing(false);
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const response = await usersAPI.deleteUser(user.id);
      if (response.data.success) {
        Alert.alert(
          t('success'),
          response.data.message,
          [
            {
              text: t('ok'),
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('deleteFailed'));
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Check if user can be deleted
  const isMasterAdmin = user.email === MASTER_ADMIN_EMAIL || user.full_name === MASTER_ADMIN_USERNAME;
  const canDeleteUser = !isMasterAdmin;

  return (
    <ScreenLayout title={t('userDetails')} showBack showDecor padBottom={0}>
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
          <Text style={s.heroName}>{user.full_name || t('noName')}</Text>
          <Text style={s.heroEmail}>{user.email}</Text>
          <View style={[s.rolePill, { backgroundColor: roleStyle.bg }]}>
            <Ionicons
              name={user.role === 'ADMIN' ? 'star' : user.role === 'STAFF' ? 'build' : 'person'}
              size={13}
              color={roleStyle.text}
            />
            <Text style={[s.rolePillText, { color: roleStyle.text }]}>  {user.role}</Text>
          </View>
          {user.availability?.is_on_leave && (
            <View style={s.leaveBadge}>
              <Ionicons name="home-outline" size={13} color="#FFF" />
              <Text style={s.leaveBadgeText}>  {t('currentlyOnLeave')}</Text>
            </View>
          )}
        </View>

        {/* Details card */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>{t('userDetails')}</Text>
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
              <DetailRow iconName="mail-outline" label={t('email')} value={user.email} />
              <DetailRow iconName="call-outline" label={t('phone')} value={user.phone || t('notProvided')} />
              {user.role === 'STAFF' && (
                <>
                  <DetailRow iconName="card-outline" label={t('employeeId')} value={user.staff_details?.employee_id || t('notProvided')} />
                  <DetailRow iconName="briefcase-outline" label={t('designation')} value={user.staff_details?.designation || t('notSet')} />
                </>
              )}
              <DetailRow
                iconName="calendar-outline"
                label={t('joinedOn')}
                value={new Date(user.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
                last
              />
            </>
          ) : (
            <>
              <Field 
                label={t('fullName')} 
                value={fullName} 
                onChangeText={setFullName} 
                placeholder={t('enterFullName')} 
              />
              <Field 
                label={t('phone')} 
                value={phone} 
                onChangeText={setPhone} 
                placeholder={t('enterPhone')} 
                keyboardType="phone-pad" 
              />
              {user.role === 'STAFF' && (
                <>
                  <Field 
                    label={t('employeeId')} 
                    value={employeeId} 
                    onChangeText={setEmployeeId} 
                    placeholder="e.g. EMP-001" 
                  />

                  {/* Designation Picker */}
                  <View style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>{t('designation')}</Text>
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
                        {designation || t('selectDesignation')}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={TEXT_MUT} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={s.editActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={handleCancelEdit}>
                  <Text style={s.cancelBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, loading && s.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-outline" size={17} color="#FFF" />
                  <Text style={s.saveBtnText}>
                    {loading ? t('saving') : t('saveChanges')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Staff actions */}
        {user.role === 'STAFF' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('staffActions')}</Text>
            <TouchableOpacity
              style={[s.leaveBtn, user.availability?.is_on_leave ? s.leaveBtnAvail : s.leaveBtnLeave]}
              onPress={toggleLeaveStatus}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons
                name={user.availability?.is_on_leave ? 'checkmark-circle-outline' : 'home-outline'}
                size={18}
                color={user.availability?.is_on_leave ? '#2E7D32' : '#E65100'}
              />
              <Text style={[
                s.leaveBtnText,
                user.availability?.is_on_leave ? s.leaveBtnTextAvail : s.leaveBtnTextLeave,
              ]}>
                {loading 
                  ? t('updating') 
                  : user.availability?.is_on_leave 
                    ? `  ${t('markAsAvailable')}` 
                    : `  ${t('markAsOnLeave')}`
                }
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Delete User Section */}
        {canDeleteUser && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('dangerZone')}</Text>
            <TouchableOpacity
              style={s.deleteUserBtn}
              onPress={() => setShowDeleteDialog(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={18} color="#E53935" />
              <Text style={s.deleteUserBtnText}>{t('deleteUser')}</Text>
            </TouchableOpacity>
            <Text style={s.deleteWarning}>
              {t('deleteWarning')}
            </Text>
          </View>
        )}

        {/* Master Admin Protection Notice */}
        {isMasterAdmin && (
          <View style={s.masterAdminNotice}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={s.masterAdminText}>
              {t('masterAdminProtected')}
            </Text>
          </View>
        )}

        <ConfirmDialog
          visible={showDeleteDialog}
          title={t('deleteUserTitle')}
          message={`${t('deleteUserConfirm')}\n\n${user.full_name || user.email}`}
          confirmText={deleting ? t('deleting') : t('deleteForever')}
          cancelText={t('cancel')}
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
            <Text style={s.modalTitle}>{t('selectDesignationTitle')}</Text>

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
                {t('noDesignation')}
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
                <Text style={s.addDesigText}>{t('addNewDesignation')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.customDesigWrap}>
                <Text style={s.customDesigLabel}>{t('newDesignation')}</Text>
                <TextInput
                  style={s.customDesigInput}
                  value={customDesignation}
                  onChangeText={setCustomDesignation}
                  placeholder={t('designationPlaceholder')}
                  placeholderTextColor={TEXT_MUT}
                  autoCapitalize="characters"
                  autoFocus
                />
                {customDesignation.trim() && (
                  <Text style={s.customDesigPreview}>
                    {t('willBeSavedAs')} {customDesignation.trim().toUpperCase()}
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
                    <Text style={s.customDesigCancelText}>{t('cancel')}</Text>
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
                    <Text style={s.customDesigAddText}> {t('addAndSelect')}</Text>
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
              <Text style={s.modalCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}

// Styles remain exactly the same
const s = StyleSheet.create({
  // ... (all your existing styles remain unchanged)
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
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
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF4F8' },
  detailIcon: { marginRight: 12 },
  detailLabel: { width: 100, fontSize: 13, color: TEXT_MUT, fontWeight: '500' },
  detailValue: { flex: 1, fontSize: 14, color: TEXT_PRI, fontWeight: '600' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: TEXT_SEC, marginBottom: 5 },
  fieldInput: {
    backgroundColor: '#EEF6FB', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, color: TEXT_PRI,
    borderWidth: 1, borderColor: `${SKY}60`,
  },
  fieldInputDisabled: { backgroundColor: '#F5F8FA', color: TEXT_MUT, borderColor: '#E0EBF0' },
  designationSelector: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF6FB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: `${SKY}60`, gap: 10,
  },
  designationSelectorText: { flex: 1, fontSize: 14 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  saveBtn: {
    flex: 2, backgroundColor: ACTIVE, borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  saveBtnDisabled: { backgroundColor: '#B0CDD8' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#EEF4F8', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: TEXT_SEC, fontWeight: '600', fontSize: 14 },
  leaveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center' },
  leaveBtnLeave: { backgroundColor: '#FFF3E0' },
  leaveBtnAvail: { backgroundColor: '#E8F5E9' },
  leaveBtnText: { fontSize: 14, fontWeight: '700' },
  leaveBtnTextLeave: { color: '#E65100' },
  leaveBtnTextAvail: { color: '#2E7D32' },
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