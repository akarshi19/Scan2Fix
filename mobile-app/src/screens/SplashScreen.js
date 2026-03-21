import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

/**
 * SplashScreen Component
 * 
 * PURPOSE: Display app logo and name for 3 seconds when app starts
 * 
 * PROPS:
 * - onFinish: Function to call when splash animation completes
 * 
 * HOW IT WORKS:
 * 1. Component mounts (appears on screen)
 * 2. useEffect starts a 3-second timer
 * 3. After 3 seconds, calls onFinish() to move to next screen
 * 4. Cleanup: If user closes app before timer ends, we clear the timer
 */

export default function SplashScreen({ onFinish }) {
  
  useEffect(() => {
    // Start a timer for 3 seconds (3000 milliseconds)
    const timer = setTimeout(() => {
      onFinish(); // Tell the parent component we're done
    }, 3000);

    // Cleanup: Cancel timer if component unmounts early
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      {/* App Logo - Using an emoji for now, you can replace with actual image */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoIcon}>🔧</Text>
      </View>
      
      {/* App Name */}
      <Text style={styles.appName}>Scan2Fix</Text>
      
      {/* Tagline */}
      <Text style={styles.tagline}>Scan. Report. Resolve.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,                        // Take full screen
    backgroundColor: '#7DD3F0',     
    justifyContent: 'center',       // Center content vertically
    alignItems: 'center',           // Center content horizontally
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'white',
    borderRadius: 60,               // Makes it circular
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    // Shadow for Android
    elevation: 8,
  },
  logoIcon: {
    fontSize: 60,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)', // Slightly transparent white
    marginTop: 10,
  },
});