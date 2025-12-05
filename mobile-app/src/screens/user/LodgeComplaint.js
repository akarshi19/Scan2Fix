import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  TouchableOpacity, 
  Image,
  ActivityIndicator 
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

/**
 * LodgeComplaint - Form to submit a complaint with photo
 * 
 * FEATURES:
 * 1. Shows asset details from QR scan
 * 2. User describes the issue
 * 3. User can take/select photo of the problem
 * 4. Photo uploads to Supabase Storage
 * 5. Complaint saved with photo URL
 */

export default function LodgeComplaint({ route, navigation }) {
  // Get asset details passed from QR scanner
  const { assetId, assetType, assetLocation } = route.params || {};
  
  // Get current user
  const { user } = useAuth();
  
  // Form state
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Photo state
  const [photo, setPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Get icon based on asset type
  const getAssetIcon = (type) => {
    switch (type) {
      case 'AC': return '❄️';
      case 'WATER_COOLER': return '💧';
      case 'DESERT_COOLER': return '🌀';
      default: return '🔧';
    }
  };

  // Get display name for asset type
  const getAssetTypeName = (type) => {
    switch (type) {
      case 'AC': return 'Air Conditioner';
      case 'WATER_COOLER': return 'Water Cooler';
      case 'DESERT_COOLER': return 'Desert Cooler';
      default: return 'Equipment';
    }
  };

  /**
   * Take photo with camera
   */
  const takePhoto = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Camera access is required to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Compress to reduce upload size
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0]);
        console.log('📷 Photo taken:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  /**
   * Pick photo from gallery
   */
  const pickFromGallery = async () => {
    try {
      // Request gallery permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Gallery access is required to select photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0]);
        console.log('🖼️ Photo selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  /**
   * Show photo options
   */
  const handleAddPhoto = () => {
    Alert.alert(
      'Add Photo',
      'Choose how to add a photo of the issue',
      [
        { text: '📷 Take Photo', onPress: takePhoto },
        { text: '🖼️ Choose from Gallery', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  /**
   * Upload photo to Supabase Storage
   */
  const uploadPhoto = async () => {
    if (!photo) return null;

    try {
      setUploadingPhoto(true);

      // Create unique file name
      const fileExt = photo.uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Fetch the image and convert to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();

      // Convert blob to ArrayBuffer
      const arrayBuffer = await new Response(blob).arrayBuffer();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('complaint-photos')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('complaint-photos')
        .getPublicUrl(fileName);

      console.log('✅ Photo uploaded:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  /**
   * Submit complaint to database
   */
  const handleSubmit = async () => {
    // Validate
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert('Error', 'Please provide more details (at least 10 characters)');
      return;
    }

    setLoading(true);

    try {
      // Upload photo first (if exists)
      let photoUrl = null;
      if (photo) {
        photoUrl = await uploadPhoto();
      }

      // Insert complaint into database
      const { data, error } = await supabase.from('complaints').insert({
        asset_id: assetId,
        user_id: user.id,
        description: description.trim(),
        photo_url: photoUrl,
        status: 'OPEN',
      }).select();

      if (error) throw error;

      console.log('✅ Complaint created:', data);

      // Show success message
      Alert.alert(
        'Complaint Submitted! ✅', 
        `Your complaint for ${assetId} has been submitted successfully.\n\nWe will resolve it as soon as possible.`,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('UserHome') 
          }
        ]
      );

    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      
      {/* Asset Information Card */}
      <View style={styles.assetCard}>
        <View style={styles.assetHeader}>
          <Text style={styles.assetIcon}>{getAssetIcon(assetType)}</Text>
          <View style={styles.assetInfo}>
            <Text style={styles.assetId}>{assetId || 'Unknown'}</Text>
            <Text style={styles.assetType}>{getAssetTypeName(assetType)}</Text>
          </View>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.assetLocation}>{assetLocation || 'Unknown'}</Text>
        </View>
      </View>

      {/* Complaint Form */}
      <View style={styles.form}>
        
        {/* Description Input */}
        <Text style={styles.formTitle}>What's the problem?</Text>
        <Text style={styles.formSubtitle}>
          Describe the issue in detail so our team can fix it quickly.
        </Text>
        
        <TextInput
          mode="outlined"
          placeholder="E.g., AC is not cooling properly, making loud noise..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={styles.textArea}
          outlineColor="#e0e0e0"
          activeOutlineColor="#2196F3"
        />

        {/* Quick issue buttons */}
        <View style={styles.quickIssues}>
          {['Not cooling', 'Making noise', 'Water leaking', 'Not turning on'].map((issue) => (
            <TouchableOpacity
              key={issue}
              style={[
                styles.quickIssueChip,
                description.includes(issue) && styles.quickIssueChipActive
              ]}
              onPress={() => {
                if (description.includes(issue)) {
                  setDescription(description.replace(issue + '. ', ''));
                } else {
                  setDescription(prev => prev ? `${prev} ${issue}.` : `${issue}.`);
                }
              }}
            >
              <Text style={[
                styles.quickIssueText,
                description.includes(issue) && styles.quickIssueTextActive
              ]}>
                {issue}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Section */}
        <Text style={styles.sectionTitle}>📷 Add Photo (Optional)</Text>
        <Text style={styles.sectionSubtitle}>
          A photo helps our team understand the issue better
        </Text>

        {!photo ? (
          // No photo - show add button
          <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
            <Text style={styles.addPhotoIcon}>📷</Text>
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        ) : (
          // Photo selected - show preview
          <View style={styles.photoPreview}>
            <Image source={{ uri: photo.uri }} style={styles.previewImage} />
            <View style={styles.photoActions}>
              <TouchableOpacity 
                style={styles.changePhotoBtn}
                onPress={handleAddPhoto}
              >
                <Text style={styles.changePhotoText}>🔄 Change</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.removePhotoBtn}
                onPress={() => setPhoto(null)}
              >
                <Text style={styles.removePhotoText}>🗑️ Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <Button 
          mode="contained" 
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || uploadingPhoto}
          style={styles.submitBtn}
          contentStyle={styles.submitBtnContent}
        >
          {uploadingPhoto ? 'Uploading Photo...' : loading ? 'Submitting...' : 'Submit Complaint'}
        </Button>

        {/* Cancel Button */}
        <Button 
          mode="text" 
          onPress={() => navigation.goBack()}
          style={styles.cancelBtn}
          textColor="#666"
          disabled={loading}
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
  
  // Asset Card
  assetCard: {
    backgroundColor: '#2196F3',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  assetIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  assetInfo: {
    flex: 1,
  },
  assetId: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  assetType: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 8,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  assetLocation: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  
  // Form
  form: {
    padding: 15,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  textArea: {
    backgroundColor: 'white',
    minHeight: 100,
  },
  
  // Quick Issues
  quickIssues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 25,
  },
  quickIssueChip: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  quickIssueChipActive: {
    backgroundColor: '#2196F3',
  },
  quickIssueText: {
    fontSize: 13,
    color: '#666',
  },
  quickIssueTextActive: {
    color: 'white',
  },

  // Photo Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  addPhotoButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  addPhotoIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  addPhotoText: {
    fontSize: 16,
    color: '#666',
  },
  photoPreview: {
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  changePhotoBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 10,
  },
  changePhotoText: {
    color: '#2196F3',
    fontSize: 14,
  },
  removePhotoBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  removePhotoText: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  
  // Buttons
  submitBtn: {
    borderRadius: 10,
    marginBottom: 10,
  },
  submitBtnContent: {
    paddingVertical: 8,
  },
  cancelBtn: {
    marginBottom: 30,
  },
});