import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Image,
  TouchableOpacity, Modal,
} from 'react-native';
import { Button } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { complaintsAPI, usersAPI, getFileUrl } from '../../services/api';

// ============================================
// ComplaintDetail — REWRITTEN for MongoDB
// ============================================

export default function ComplaintDetail({ route, navigation }) {
  const { complaint } = route.params;
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(
    complaint.assigned_staff_id?.toString() || ''
  );
  const [loading, setLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      const response = await usersAPI.getStaff();
      if (response.data.success) {
        setStaffList(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedStaff) {
      Alert.alert('Error', 'Please select a staff member');
      return;
    }

    const staffMember = staffList.find(s => s.id === selectedStaff);

    if (staffMember?.is_on_leave) {
      Alert.alert(
        '⚠️ Cannot Assign',
        `${staffMember.full_name || staffMember.email} is currently on leave and cannot be assigned new tasks.\n\nPlease select another staff member.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const complaintId = complaint.id || complaint._id;
      const response = await complaintsAPI.assignStaff(complaintId, selectedStaff);

      if (response.data.success) {
        Alert.alert(
          'Staff Assigned! ✅',
          response.data.message,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#ff9800';
      case 'ASSIGNED': return '#2196F3';
      case 'IN_PROGRESS': return '#9C27B0';
      case 'CLOSED': return '#4CAF50';
      default: return '#666';
    }
  };

  const availableStaffCount = staffList.filter(s => !s.is_on_leave).length;
  const onLeaveStaffCount = staffList.filter(s => s.is_on_leave).length;
  const photoUrl = getFileUrl(complaint.photo_url);

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.statusBanner, { backgroundColor: getStatusColor(complaint.status) }]}>
        <Text style={styles.statusText}>Status: {complaint.status}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📋 Complaint Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Asset ID:</Text>
          <Text style={styles.value}>{complaint.asset_id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{complaint.assets?.type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>📍 {complaint.assets?.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Reported:</Text>
          <Text style={styles.value}>
            {new Date(complaint.created_at).toLocaleDateString('en-US', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.label}>Issue Description:</Text>
        <Text style={styles.description}>{complaint.description}</Text>
      </View>

      {photoUrl && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📷 Attached Photo</Text>
          <TouchableOpacity onPress={() => setShowFullImage(true)}>
            <Image source={{ uri: photoUrl }} style={styles.photo} />
            <Text style={styles.tapToEnlarge}>Tap to enlarge</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👷 Assign Staff</Text>

        {complaint.status === 'CLOSED' ? (
          <View style={styles.closedBanner}>
            <Text style={styles.closedText}>✅ This complaint has been resolved</Text>
            <Text style={styles.closedDate}>Closed on: {new Date(complaint.closed_at).toLocaleDateString()}</Text>
          </View>
        ) : (
          <>
            <View style={styles.staffStats}>
              <View style={styles.staffStatItem}>
                <Text style={styles.staffStatNumber}>{availableStaffCount}</Text>
                <Text style={styles.staffStatLabel}>Available</Text>
              </View>
              <View style={[styles.staffStatItem, { backgroundColor: '#fff3e0' }]}>
                <Text style={[styles.staffStatNumber, { color: '#e65100' }]}>{onLeaveStaffCount}</Text>
                <Text style={styles.staffStatLabel}>On Leave</Text>
              </View>
            </View>

            <Text style={styles.pickerLabel}>Select Staff Member:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedStaff}
                onValueChange={(value) => setSelectedStaff(value)}
                style={styles.picker}
              >
                <Picker.Item label="-- Select Staff --" value="" />
                {staffList.map((staff) => (
                  <Picker.Item
                    key={staff.id}
                    label={`${staff.full_name || staff.email}${staff.is_on_leave ? ' 🚫 (On Leave)' : ' ✅'}`}
                    value={staff.id}
                    color={staff.is_on_leave ? '#999' : '#333'}
                    enabled={!staff.is_on_leave}
                  />
                ))}
              </Picker>
            </View>

            {selectedStaff && staffList.find(s => s.id === selectedStaff)?.is_on_leave && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>⚠️ This staff member is on leave and cannot be assigned</Text>
              </View>
            )}

            {staffList.length === 0 && (
              <Text style={styles.noStaffText}>No staff members found. Please add staff users first.</Text>
            )}

            {availableStaffCount === 0 && staffList.length > 0 && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>⚠️ All staff members are currently on leave</Text>
              </View>
            )}

            <Button
              mode="contained" onPress={handleAssign} loading={loading}
              disabled={loading || !selectedStaff || staffList.find(s => s.id === selectedStaff)?.is_on_leave}
              style={styles.assignButton} icon="account-check"
            >
              {complaint.assigned_staff_id ? 'Reassign Staff' : 'Assign Staff'}
            </Button>

            {complaint.assigned_staff_id && (
              <Text style={styles.currentAssignment}>
                Currently assigned to: {staffList.find(s => s.id === complaint.assigned_staff_id?.toString())?.full_name || 'Unknown'}
              </Text>
            )}
          </>
        )}
      </View>

      <Modal visible={showFullImage} transparent={true} animationType="fade" onRequestClose={() => setShowFullImage(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFullImage(false)}>
          <Image source={{ uri: photoUrl }} style={styles.fullImage} resizeMode="contain" />
          <Text style={styles.closeHint}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  statusBanner: { padding: 12, alignItems: 'center' },
  statusText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  card: { backgroundColor: 'white', margin: 15, marginBottom: 0, padding: 20, borderRadius: 12, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  infoRow: { flexDirection: 'row', marginBottom: 10 },
  label: { fontWeight: '600', color: '#666', width: 90, fontSize: 13 },
  value: { flex: 1, color: '#333', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  description: { color: '#333', lineHeight: 22, marginTop: 5 },
  photo: { width: '100%', height: 200, borderRadius: 8 },
  tapToEnlarge: { textAlign: 'center', color: '#2196F3', marginTop: 8, fontSize: 12 },
  staffStats: { flexDirection: 'row', marginBottom: 15 },
  staffStatItem: { flex: 1, backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8, alignItems: 'center', marginRight: 10 },
  staffStatNumber: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },
  staffStatLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  pickerLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  pickerContainer: { backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#e0e0e0' },
  picker: { height: 50 },
  noStaffText: { color: '#ff9800', fontSize: 13, marginBottom: 15, textAlign: 'center' },
  warningBanner: { backgroundColor: '#fff3e0', padding: 12, borderRadius: 8, marginBottom: 15 },
  warningText: { color: '#e65100', fontSize: 13, textAlign: 'center' },
  assignButton: { borderRadius: 8 },
  currentAssignment: { textAlign: 'center', color: '#666', marginTop: 15, fontSize: 13 },
  closedBanner: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 8, alignItems: 'center' },
  closedText: { color: '#4CAF50', fontWeight: 'bold' },
  closedDate: { color: '#666', marginTop: 5, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '95%', height: '70%' },
  closeHint: { color: 'white', marginTop: 20 },
});