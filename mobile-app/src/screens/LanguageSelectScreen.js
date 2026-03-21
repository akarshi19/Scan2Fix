import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function LanguageSelectScreen() {
  const { setLanguage } = useLanguage();

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={s.topDecoration}>
        <View style={s.shapeBack}>
          <LinearGradient colors={['#94a3b8', '#64748b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.shapeGradient} />
        </View>
        <View style={s.shapeFront}>
          <LinearGradient colors={['#7dd3fc', '#38bdf8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.shapeGradient} />
        </View>
      </View>

      <View style={s.content}>
        <Ionicons name="language-outline" size={60} color="#38bdf8" />
        <Text style={s.title}>Select Language</Text>
        <Text style={s.titleHi}>भाषा चुनें</Text>
        <Text style={s.subtitle}>Choose your preferred language</Text>

        <View style={s.options}>
          <TouchableOpacity style={s.langBtn} onPress={() => setLanguage('en')} activeOpacity={0.85}>
            <Text style={s.flag}>🇬🇧</Text>
            <View style={s.langInfo}>
              <Text style={s.langName}>English</Text>
              <Text style={s.langNative}>English</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={s.langBtn} onPress={() => setLanguage('hi')} activeOpacity={0.85}>
            <Text style={s.flag}>🇮🇳</Text>
            <View style={s.langInfo}>
              <Text style={s.langName}>Hindi</Text>
              <Text style={s.langNative}>हिंदी</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <Text style={s.note}>You can change this later in settings</Text>
        <Text style={s.noteHi}>आप इसे बाद में सेटिंग्स में बदल सकते हैं</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  topDecoration: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, overflow: 'hidden' },
  shapeBack: { position: 'absolute', width: width * 0.85, height: 180, top: -80, left: width * 0.25, transform: [{ rotate: '15deg' }], borderRadius: 24, overflow: 'hidden', elevation: 5 },
  shapeFront: { position: 'absolute', width: width * 0.75, height: 180, top: -60, left: -width * 0.05, transform: [{ rotate: '15deg' }], borderRadius: 24, overflow: 'hidden', elevation: 6 },
  shapeGradient: { flex: 1, borderRadius: 24 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginTop: 20 },
  titleHi: { fontSize: 22, fontWeight: '600', color: '#64748b', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#9ca3af', marginTop: 8, marginBottom: 40 },
  options: { width: '100%', gap: 16 },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  flag: { fontSize: 36, marginRight: 16 },
  langInfo: { flex: 1 },
  langName: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  langNative: { fontSize: 13, color: '#64748b', marginTop: 2 },
  note: { fontSize: 12, color: '#9ca3af', marginTop: 40 },
  noteHi: { fontSize: 11, color: '#cbd5e1', marginTop: 4 },
});