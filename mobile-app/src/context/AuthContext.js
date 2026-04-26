// ============================================
// Auth Context — REWRITTEN for MongoDB/JWT
// ============================================
//
// AFTER (JWT):
//   - Token stored in SecureStore (encrypted)
//   - On app start, check SecureStore for saved token
//   - If token exists, call GET /api/auth/me to verify & get role
//   - No more onAuthStateChange listener needed
//   - signIn/signOut manage the token manually
// ============================================

import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  authAPI,
  saveToken,
  removeToken,
  getToken,
  saveUserData,
  getUserData,
  removeUserData,
} from '../services/api';
import { registerForPushNotifications } from '../utils/notificationSetup';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // ════════════════════════════════════════
  // CHECK AUTH ON APP START
  // ════════════════════════════════════════
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if we have a saved token
      const token = await getToken();

      if (!token) {
        // No token — user is not logged in
        setLoading(false);
        return;
      }

      // Token exists — verify it's still valid by calling /auth/me
      // This also gets the user's current role and profile data
      const response = await authAPI.getMe();

      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        setRole(userData.role);
        await saveUserData(userData);
        registerForPushNotifications().catch(() => {});
      } else {
        // Token is invalid — clear everything
        await clearAuth();
      }
    } catch (error) {
      // Token expired or server unreachable — use cached user data for offline capability
      const cachedUser = await getUserData();
      if (cachedUser) {
        setUser(cachedUser);
        setRole(cachedUser.role);
      } else {
        await clearAuth();
      }
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════
  // SIGN IN
  // ════════════════════════════════════════
   //
  // Returns { error } to match existing screen code pattern
  // ════════════════════════════════════════
  const signIn = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);

      if (response.data.success) {
        const { token, user: userData } = response.data.data;

        // Save token and user data
        await saveToken(token);
        await saveUserData(userData);

        // Update state
        setUser(userData);
        setRole(userData.role);

        registerForPushNotifications().catch(() => {});

        return { error: null };
      } else {
        return { error: { message: response.data.message } };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        error: {
          message: error.message || 'Login failed. Please try again.',
        },
      };
    }
  };

  // ════════════════════════════════════════
  // SIGN OUT
  // ════════════════════════════════════════
  // With JWT, we just delete the token locally.
  // The token will expire naturally (30 days from .env JWT_EXPIRE).
  // ════════════════════════════════════════
  const signOut = async () => {
    await clearAuth();
  };

  // ════════════════════════════════════════
  // CLEAR AUTH STATE
  // ════════════════════════════════════════
  const clearAuth = async () => {
    await removeToken();
    await removeUserData();
    setUser(null);
    setRole(null);
  };

  // ════════════════════════════════════════
  // REFRESH USER DATA
  // ════════════════════════════════════════
  // Call this after profile updates to refresh the context
  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        setRole(userData.role);
        await saveUserData(userData);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);