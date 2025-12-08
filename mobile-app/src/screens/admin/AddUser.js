import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TouchableOpacity 
} from 'react-native';
import { TextInput, Button, RadioButton } from 'react-native-paper';
import { supabase } from '../../services/supabase';

export default function AddUser({ navigation }) {
  const [loading, setLoading] = useState(false);
  
  // Basic Info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  
  // Role
  const [role, setRole] = useState('USER');
  
  // Address
  const [address, setAddress] = useState('');
  
  // ID Proof
  const [idProofType, setIdProofType] = useState('AADHAR');
  const [idProofNumber, setIdProofNumber] = useState('');
  
  // Staff specific
  const [designation, setDesignation] = useState('JUNIOR');
  const [employeeId, setEmployeeId] = useState('');

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter full name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter email');
      return false;
    }
    if (!password || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return false;
    }
    if (role === 'STAFF' && !employeeId.trim()) {
      Alert.alert('Error', 'Please enter employee ID for staff');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) {
  console.error('Auth Error:', authError);
  
  if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
    Alert.alert(
      'Email Already Exists',
      'This email is already registered. Please use a different email address.',
      [{ text: 'OK' }]
    );
    setLoading(false);
    return;
  }
  
  if (authError.message.includes('invalid')) {
    Alert.alert(
      'Invalid Email', 
      'Please use a valid email format.\n\nExamples:\n• user@gmail.com\n• staff@company.com'
    );
    setLoading(false);
    return;
  }
  
  throw authError;
}

      if (authData.user) {
        // 2. Create profile with all details
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email.trim(),
            full_name: fullName.trim(),
            role: role,
            phone: phone.trim(),
            // alternate_phone: alternatePhone.trim() || null,
            // address: address.trim() || null,
            // id_proof_type: idProofType,
            // id_proof_number: idProofNumber.trim() || null,
            designation: role === 'STAFF' ? designation : null,
            employee_id: role === 'STAFF' ? employeeId.trim() : null,
            is_available: true,
            is_on_leave: false,
          });

        if (profileError) throw profileError;

        Alert.alert(
          'User Created! ✅',
          `${fullName} has been added as ${role}`,
          [{ text: 'OK', onPress: () => {// Reset form
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setAlternatePhone('');
      setAddress('');
      setIdProofNumber('');
      setEmployeeId('');
      
      // Go back
      navigation.goBack();} }]
        );
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Role Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 User Role *</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity 
            style={[styles.roleOption, role === 'USER' && styles.roleOptionActive]}
            onPress={() => setRole('USER')}
          >
            <Text style={styles.roleIcon}>👤</Text>
            <Text style={[styles.roleLabel, role === 'USER' && styles.roleLabelActive]}>User</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.roleOption, role === 'STAFF' && styles.roleOptionActive]}
            onPress={() => setRole('STAFF')}
          >
            <Text style={styles.roleIcon}>🔧</Text>
            <Text style={[styles.roleLabel, role === 'STAFF' && styles.roleLabelActive]}>Staff</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.roleOption, role === 'ADMIN' && styles.roleOptionActive]}
            onPress={() => setRole('ADMIN')}
          >
            <Text style={styles.roleIcon}>👑</Text>
            <Text style={[styles.roleLabel, role === 'ADMIN' && styles.roleLabelActive]}>Admin</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Basic Information</Text>
        
        <TextInput
          label="Full Name *"
          value={fullName}
          onChangeText={setFullName}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Email *"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          left={<TextInput.Icon icon="email" />}
        />

        <TextInput
          label="Password *"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
          left={<TextInput.Icon icon="lock" />}
        />

        <TextInput
          label="Phone Number *"
          value={phone}
          onChangeText={setPhone}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
          left={<TextInput.Icon icon="phone" />}
        />

        {/* <TextInput
          label="Alternate Phone (Optional)"
          value={alternatePhone}
          onChangeText={setAlternatePhone}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
          left={<TextInput.Icon icon="phone-plus" />}
        /> */}
      </View>

      {/* Address */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏠 Address</Text>
        
        <TextInput
          label="Current Address"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          left={<TextInput.Icon icon="home" />}
        />
      </View> */}

      {/* ID Proof */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>🪪 ID Proof</Text>
        
        <Text style={styles.label}>ID Proof Type:</Text>
        <View style={styles.radioRow}>
          <TouchableOpacity 
            style={[styles.radioOption, idProofType === 'AADHAR' && styles.radioOptionActive]}
            onPress={() => setIdProofType('AADHAR')}
          >
            <Text style={[styles.radioLabel, idProofType === 'AADHAR' && styles.radioLabelActive]}>
              Aadhar Card
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.radioOption, idProofType === 'PAN' && styles.radioOptionActive]}
            onPress={() => setIdProofType('PAN')}
          >
            <Text style={[styles.radioLabel, idProofType === 'PAN' && styles.radioLabelActive]}>
              PAN Card
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          label={idProofType === 'AADHAR' ? 'Aadhar Number' : 'PAN Number'}
          value={idProofNumber}
          onChangeText={setIdProofNumber}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="card-account-details" />}
          placeholder={idProofType === 'AADHAR' ? 'XXXX XXXX XXXX' : 'ABCDE1234F'}
        />
      </View> */}

      {/* Staff Specific */}
      {role === 'STAFF' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Staff Details</Text>
          
          <TextInput
            label="Employee ID *"
            value={employeeId}
            onChangeText={setEmployeeId}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="badge-account" />}
            placeholder="e.g., EMP001"
          />

          <Text style={styles.label}>Designation:</Text>
          <View style={styles.radioRow}>
            <TouchableOpacity 
              style={[styles.radioOption, designation === 'JUNIOR' && styles.radioOptionActive]}
              onPress={() => setDesignation('JUNIOR')}
            >
              <Text style={[styles.radioLabel, designation === 'JUNIOR' && styles.radioLabelActive]}>
                Junior Staff
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.radioOption, designation === 'SENIOR' && styles.radioOptionActive]}
              onPress={() => setDesignation('SENIOR')}
            >
              <Text style={[styles.radioLabel, designation === 'SENIOR' && styles.radioLabelActive]}>
                Senior Staff
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Submit Button */}
      <View style={styles.submitSection}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          Create {role === 'STAFF' ? 'Staff Member' : role === 'ADMIN' ? 'Admin' : 'User'}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Section
  section: {
    backgroundColor: 'white',
    margin: 10,
    marginBottom: 0,
    padding: 15,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  
  // Role Selection
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  roleIcon: {
    fontSize: 28,
    marginBottom: 5,
  },
  roleLabel: {
    fontSize: 12,
    color: '#666',
  },
  roleLabelActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  
  // Radio Options
  radioRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  radioOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radioOptionActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  radioLabel: {
    fontSize: 13,
    color: '#666',
  },
  radioLabelActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  
  // Submit
  submitSection: {
    padding: 15,
    paddingBottom: 30,
  },
  submitButton: {
    borderRadius: 10,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  cancelButton: {
    marginTop: 10,
  },
});