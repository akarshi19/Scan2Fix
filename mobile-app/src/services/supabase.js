import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tdylzqwlowvniwhvrejh.supabase.co'; // Paste from Step 1.1
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeWx6cXdsb3d2bml3aHZyZWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4Mjc1MzUsImV4cCI6MjA4MDQwMzUzNX0.IImaK-DVYiMYaZu4HUOiX9oGhm8zjEXJ4ePDTs9Abyw'; // Paste from Step 1.1

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});