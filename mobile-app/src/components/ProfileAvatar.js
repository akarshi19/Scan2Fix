import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { authAPI, getFileUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ============================================
// ProfileAvatar — REWRITTEN for MongoDB
// ============================================
//
// AFTER:
//   Uses user data from AuthContext (already fetched on login)
//   No extra API call needed!
// ============================================

export default function ProfileAvatar({ size = 24, showBorder = false }) {
  const { user } = useAuth();

  const getInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
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

  const photoUrl = getFileUrl(user?.photo_url);

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={containerStyle} />;
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
  placeholder: { backgroundColor: '#2196F3', justifyContent: 'center', alignItems: 'center' },
  initial: { color: 'white', fontWeight: 'bold' },
});