import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setUser(session.user);
          fetchUserRole(session.user.id);
        } else {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', userId)
        .maybeSingle(); // ✅ CHANGED FROM .single() to .maybeSingle()

      if (error) {
        console.error('Error fetching role:', error);
        setRole('USER'); // Default to USER if error
      } else if (data) {
        setRole(data.role);
      } else {
        // Profile doesn't exist - create one with default role
        console.log('Profile not found, creating default profile...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user?.email,
            role: 'USER'
          });
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
        setRole('USER');
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole('USER'); // Default to USER
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);