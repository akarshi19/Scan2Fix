import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function ProfileAvatar({ size = 24, showBorder = false }) {
  const { user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState(null);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('photo_url, full_name')
        .eq('id', user.id)
        .maybeSingle(); // ✅ CHANGED FROM .single() to .maybeSingle()

      if (error) {
        console.log('Profile avatar fetch error (may be normal):', error.message);
        return;
      }
      
      if (data) {
        setPhotoUrl(data.photo_url);
        setFullName(data.full_name || '');
      }
    } catch (error) {
      console.log('Error fetching profile avatar:', error.message);
    }
  };

  const getInitial = () => {
    if (fullName) return fullName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return '?';
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    borderWidth: showBorder ? 2 : 0,
    borderColor: 'white',
  };

  if (photoUrl) {
    return (
      <Image 
        source={{ uri: photoUrl }} 
        style={containerStyle}
      />
    );
  }

  return (
    <View style={[containerStyle, styles.placeholder]}>
      <Text style={[styles.initial, { fontSize: size * 0.5 }]}>
        {getInitial()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: 'white',
    fontWeight: 'bold',
  },
});