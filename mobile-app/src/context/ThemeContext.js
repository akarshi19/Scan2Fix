import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';

const ThemeContext = createContext({});

export const THEMES = {
  light: {
    name: 'light',
    sky: '#7DD3F0',
    active: '#5BA8D4',
    slate: '#94A3B8',
    pageBg: '#F2F6F8',
    cardBg: '#FFFFFF',
    textPri: '#1A1A2E',
    textSec: '#5A7A8A',
    textMut: '#9DB5C0',
    navBg: '#EEF6FB',
    inactive: '#A8C8DC',
    inputBg: '#EEF6FB',  // change
    inputBorder: 'rgba(125,211,240,0.37)',
    divider: '#EEF4F8',
    statusBar: 'dark-content',
    open: '#FF9800',
    assigned: '#f7538a',
    inProgress: '#9C27B0',
    finishing: '#f5009fc9',
    staffOnDuty: '#089891', 
    staffUnavailable: '#F44336',
    totalAssets: '#607D8B',
    closed: '#4CAF50',
    black: '#000',
    white: '#fff',
    button:'#004e68',
    admin: '#a11846',
    shadowColor: '#A0BDD0',
    web: '#2E7D32',
    app: '#01579B',
    boxbg:'#EEF6FB',
    icon: '#4A9EC4',
  },
  dark: {
    name: 'dark',
    sky: '#2D6A8A',
    active: '#4A9EC4',
    slate: '#475569',
    pageBg: '#0F172A',
    cardBg: '#1E293B',
    textPri: '#E2E8F0',
    textSec: '#c4d4eb',
    textMut: '#64748B',
    navBg: '#1E293B',  //change
    inactive: '#475569',
    inputBg: '#334155',
    inputBorder: 'rgba(74,158,196,0.3)',
    divider: '#334155',
    statusBar: 'light-content',
    open: '#fbc471',
    assigned: '#fb77a3',
    inProgress: '#e37ef5',
    finishing: '#f5009f',
    staffOnDuty: '#089891', 
    staffUnavailable: '#ed6b62',
    totalAssets: '#999da0',
    closed: '#82e385',
    white: '#fff',
    black: '#000',
    button:'#004e68',
    admin: '#a11846',
    shadowColor: '#A0BDD0',
    web: '#2E7D32',
    app: '#01579B',
    boxbg:'#1E293B',
    icon: '#4A9EC4',
  },
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await SecureStore.getItemAsync('appTheme');
      if (saved && THEMES[saved]) setTheme(saved);
    } catch (e) {}
    setLoaded(true);
  };

  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    await SecureStore.setItemAsync('appTheme', next);
  };

  const setThemeMode = async (mode) => {
    if (THEMES[mode]) {
      setTheme(mode);
      await SecureStore.setItemAsync('appTheme', mode);
    }
  };

  const colors = THEMES[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setThemeMode, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);