import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

// Create the context object
const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoadingProfile(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoadingProfile(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch the user's profile including their role
  const fetchProfile = async (userId) => {
    setLoadingProfile(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error.message);
    } else {
      setProfile(data);
    }

    setLoadingProfile(false);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loadingProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context from any screen
export const useAuth = () => useContext(AuthContext);