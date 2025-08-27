import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  supabase,
  onAuthStateChange,
  getCurrentUser,
  getCurrentSession,
} from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        // Get current session
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await getCurrentSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
        } else if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);

          // Load user profile
          await loadUserProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        // Load or create user profile
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating new user profile for:', userId);
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            display_name:
              user?.user_metadata?.full_name ||
              user?.email?.split('@')[0] ||
              'User',
            preferences: {},
            ai_settings: {},
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
        } else {
          setProfile(newProfile);
        }
      } else if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Profile loading error:', error);
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    console.log('signInWithGoogle called');
    try {
      setLoading(true);
      // Choose redirect based on environment. In dev (http/https origin), use in-app callback.
      // In production (file://), use the custom deep link.
      const isHttpOrigin = typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol);
      const redirectTarget = isHttpOrigin
        ? window.location.origin + '/auth/callback'
        : 'pilebintang://auth-callback';
      
      // Get OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTarget,
          skipBrowserRedirect: true, // Don't redirect automatically
          // Prefer PKCE to receive an authorization code we can exchange
          flowType: 'pkce',
        },
      });

      if (error) {
        console.error('Supabase OAuth error:', error);
        throw error;
      }

      console.log('Supabase OAuth response:', data);

      // Use Electron's OAuth handler for the popup flow
      if (data?.url && window.electron?.oauth) {
        console.log('Opening OAuth popup with URL:', data.url);
        const result = await window.electron.oauth.google(data.url);
        console.log('OAuth result:', result);
        
        if (result.success && result.callbackUrl) {
          // Parse the callback URL and extract auth data
          const url = new URL(result.callbackUrl);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const searchParams = new URLSearchParams(url.search);
          
          // Check for tokens in hash or search params
          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
          const authCode = searchParams.get('code');
          
          if (accessToken) {
            // Set the session using the tokens
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionError) {
              throw sessionError;
            }
            
            return { data: sessionData, error: null };
          } else if (authCode && typeof supabase?.auth?.exchangeCodeForSession === 'function') {
            // PKCE code flow: exchange authorization code for a session
            try {
              const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);

              if (exchangeError) throw exchangeError;
              return { data: sessionData, error: null };
            } catch (ex) {
              console.error('Exchange code for session failed:', ex);
              throw ex;
            }
          }
        } else if (result.error) {
          throw new Error(result.error);
        }
      }
      
      // Fallback to regular OAuth flow
      return { data, error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user?.id) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('Profile update error:', error);
      return { data: null, error };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:1212/auth/reset-password',
      });

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Password update error:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    // Helper computed properties
    isAuthenticated: !!user,
    isLoading: loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
