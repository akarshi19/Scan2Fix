import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';

const ROLES = [
  { key: 'USER',  label: 'User',  icon: 'person-outline', color: '#2196F3' },
  { key: 'STAFF', label: 'Staff', icon: 'build-outline',  color: '#5BA8D4' },
  { key: 'ADMIN', label: 'Admin', icon: 'star-outline',   color: '#9C27B0' },
];

const DESIGNATIONS = [
  { key: 'JUNIOR', label: 'Junior Staff', icon: 'school-outline', color: '#FF9800' },
  { key: 'SENIOR', label: 'Senior Staff', icon: 'ribbon-outline', color: '#4CAF50' },
];

function DropdownSelect({ label, options, selected, onSelect, colors }) {
  const [visible, setVisible] = useState(false);
  const selectedOption = options.find(o => o.key === selected);

  return (
    <>
      {label ? <Text style={[s.fieldLabel, { color: colors.textSec }]}>{label}</Text> : null}
      <TouchableOpacity
        style={[s.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        {selectedOption && (
          <View style={[s.dropdownIcon, { backgroundColor: `${selectedOption.color}15` }]}>
            <Ionicons name={selectedOption.icon} size={20} color={selectedOption.color} />
          </View>
        )}
        <Text style={[s.dropdownText, { color: colors.textPri }]}>
          {selectedOption?.label || 'Select...'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMut} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={[s.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[s.modalTitle, { color: colors.textPri }]}>{label || 'Select'}</Text>
            {options.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[s.modalOption, selected === option.key && { backgroundColor: `${option.color}10`, borderColor: option.color }, { borderColor: colors.divider }]}
                onPress={() => { onSelect(option.key); setVisible(false); }}
                activeOpacity={0.8}
              >
                <View style={[s.modalOptionIcon, { backgroundColor: `${option.color}15` }]}>
                  <Ionicons name={option.icon} size={22} color={option.color} />
                </View>
                <Text style={[s.modalOptionText, { color: colors.textPri }, selected === option.key && { color: option.color, fontWeight: '700' }]}>
                  {option.label}
                </Text>
                {selected === option.key && <Ionicons name="checkmark-circle" size={22} color={option.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function AddUser({ navigation }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('USER');
  const [designation, setDesignation] = useState('JUNIOR');
  const [employeeId, setEmployeeId] = useState('');

  const validateForm = () => {
    if (!fullName.trim()) { Alert.alert('Error', 'Please enter full name'); return false; }
    if (!email.trim()) { Alert.alert('Error', 'Please enter email'); return false; }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) { Alert.alert('Invalid Email', 'Please enter a valid email'); return false; }
    if (!password || password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return false; }
    if (!phone.trim()) { Alert.alert('Error', 'Please enter phone number'); return false; }
    if (role === 'STAFF' && !employeeId.trim()) { Alert.alert('Error', 'Employee ID is required for staff'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await usersAPI.create({
        email: email.trim(), password, full_name: fullName.trim(), role,
        phone: phone.trim(),
        designation: role === 'STAFF' ? designation : null,
        employee_id: role === 'STAFF' ? employeeId.trim() : null,
      });
      if (response.data.success) {
        Alert.alert('User Created!', response.data.message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error) { Alert.alert('Error', error.message || 'Failed to create user'); }
    finally { setLoading(false); }
  };

  return (
    <ScreenLayout title="Add User" showBack={true}>
      {/* Role Dropdown */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>Select Role</Text>
        <DropdownSelect label="" options={ROLES} selected={role} onSelect={setRole} colors={colors} />
      </View>

      {/* Basic Info */}
      <View style={[s.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[s.cardTitle, { color: colors.textPri }]}>Basic Information</Text>

        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="person-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
          <TextInput style={[s.input, { color: colors.textPri }]} placeholder="Full Name *" placeholderTextColor={colors.textMut} value={fullName} onChangeText={setFullName} />
        </View>

        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="mail-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
          <TextInput style={[s.input, { color: colors.textPri }]} placeholder="Email *" placeholderTextColor={colors.textMut} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
          <TextInput style={[s.input, { color: colors.textPri }]} placeholder="Password * (min 6 chars)" placeholderTextColor={colors.textMut} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMut} />
          </TouchableOpacity>
        </View>

        {password.length > 0 && (
          <View style={s.strengthRow}>
            <View style={s.strengthBar}>
              <View style={[s.strengthFill, {
                width: password.length < 6 ? '30%' : (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? '60%' : '100%',
                backgroundColor: password.length < 6 ? '#ef4444' : (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? '#f59e0b' : '#22c55e',
              }]} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '500', color: password.length < 6 ? '#ef4444' : (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? '#f59e0b' : '#22c55e' }}>
              {password.length < 6 ? 'Too short' : (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) ? 'Add letter + number' : 'Strong ✓'}
            </Text>
          </View>
        )}

        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="call-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
          <TextInput style={[s.input, { color: colors.textPri }]} placeholder="Phone Number *" placeholderTextColor={colors.textMut} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>
      </View>

      {/* Staff Details */}
      {role === 'STAFF' && (
        <View style={[s.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>Staff Details</Text>

          <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Ionicons name="card-outline" size={18} color={colors.textMut} style={{ marginRight: 10 }} />
            <TextInput style={[s.input, { color: colors.textPri }]} placeholder="Employee ID * (e.g., EMP001)" placeholderTextColor={colors.textMut} value={employeeId} onChangeText={setEmployeeId} />
          </View>

          <DropdownSelect label="Designation" options={DESIGNATIONS} selected={designation} onSelect={setDesignation} colors={colors} />
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity style={[s.submitBtn, loading && s.submitBtnDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={s.submitBtnText}>  Creating...</Text>
          </View>
        ) : (
          <>
            <Ionicons name="person-add-outline" size={20} color="#fff" />
            <Text style={s.submitBtnText}>
              Create {role === 'STAFF' ? 'Staff Member' : role === 'ADMIN' ? 'Admin' : 'User'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 14, paddingVertical: 14 },
  dropdown: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, marginBottom: 12 },
  dropdownIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dropdownText: { flex: 1, fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, marginBottom: 10 },
  modalOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 12, paddingHorizontal: 4 },
  strengthBar: { width: 80, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginRight: 8, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#5BA8D4', borderRadius: 12, paddingVertical: 16, marginTop: 10, shadowColor: '#5BA8D4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  submitBtnDisabled: { backgroundColor: '#B0CDD8' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});