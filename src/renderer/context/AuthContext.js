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
    console.log('signInWithGoogle called - using system browser approach');
    try {
      setLoading(true);
      
      // Use system browser integration to avoid Electron security conflicts
      // This approach:
      // 1. Opens user's default browser for OAuth (full JS support)
      // 2. Maintains Supabase flow state (same browser context)  
      // 3. Keeps Electron app secure (no webSecurity compromise)
      // 4. Uses deep link to return session to Electron
      
      const redirectTarget = 'pile-auth://callback';
      
      console.log('OAuth redirect target (deep link):', redirectTarget);
      
      // Get OAuth URL from Supabase using PKCE flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTarget,
          skipBrowserRedirect: true, // We'll handle browser opening manually
          flowType: 'pkce',
        },
      });

      if (error) {
        console.error('Supabase OAuth error:', error);
        throw error;
      }

      console.log('Supabase OAuth response:', data);

      if (data?.url && window.electron?.shell) {
        console.log('Opening OAuth URL in system browser:', data.url);
        
        // Store the current page so we can return after auth
        const returnUrl = window.location.pathname + window.location.search;
        await window.electron?.store?.set('oauth_return_url', returnUrl);
        
        // Open the OAuth URL in the user's default browser
        await window.electron.shell.openExternal(data.url);
        
        // Set up a promise that resolves when deep link callback is received
        return new Promise(async (resolve, reject) => {
          // Set up IPC listener for OAuth callback
          const handleAuthCallback = async (event, callbackData) => {
            console.log('OAuth callback received:', callbackData);
            
            try {
              if (callbackData.success && callbackData.data) {
                const { code, accessToken, callbackUrl } = callbackData.data;
                
                if (accessToken) {
                  // Direct token (implicit flow)
                  console.log('Processing implicit flow tokens');
                  const url = new URL(callbackUrl);
                  const hashParams = new URLSearchParams(url.hash.substring(1));
                  const refreshToken = hashParams.get('refresh_token');
                  
                  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || '',
                  });
                  
                  if (sessionError) {
                    throw sessionError;
                  }
                  
                  resolve({ data: sessionData, error: null });
                } else if (code) {
                  // Authorization code (PKCE flow)
                  console.log('Processing PKCE flow - exchanging code for session');
                  
                  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                  
                  if (exchangeError) {
                    throw exchangeError;
                  }
                  
                  resolve({ data: sessionData, error: null });
                } else {
                  throw new Error('No valid authentication data received');
                }
              } else {
                throw new Error(callbackData.error || 'OAuth failed');
              }
            } catch (error) {
              console.error('Error processing OAuth callback:', error);
              reject(error);
            }
            
            // Clean up listener
            window.electron?.ipcRenderer?.removeListener('oauth-callback', handleAuthCallback);
          };
          
          // Listen for the OAuth callback from main process
          window.electron?.ipcRenderer?.on('oauth-callback', handleAuthCallback);
          
          // Set up timeout to avoid hanging indefinitely
          setTimeout(() => {
            window.electron?.ipcRenderer?.removeListener('oauth-callback', handleAuthCallback);
            reject(new Error('OAuth timeout - no response from browser'));
          }, 5 * 60 * 1000); // 5 minute timeout
        });
        
      } else {
        console.error('No OAuth URL or shell API available');
        throw new Error('OAuth not available - missing URL or shell API');
      }
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

  // Debug function for OAuth configuration
  const debugOAuthConfig = () => {
    const isHttpOrigin = typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol);
    const redirectTarget = isHttpOrigin
      ? window.location.origin + '/auth/callback'
      : 'pilebintang://auth-callback';
    
    console.log('🔧 OAuth Configuration Debug:');
    console.log('Current location:', window.location);
    console.log('Is HTTP origin:', isHttpOrigin);
    console.log('Redirect target:', redirectTarget);
    console.log('\n📋 Required Supabase Redirect URLs:');
    console.log('1. pilebintang://auth-callback');
    console.log('2. ' + window.location.origin + '/auth/callback');
    console.log('\n💡 Add both URLs to your Supabase project settings under "Allowed Redirect URLs"');
    
    return {
      currentLocation: window.location,
      isHttpOrigin,
      redirectTarget,
      requiredUrls: ['pilebintang://auth-callback', window.location.origin + '/auth/callback']
    };
  };
  
  // Make debug function available globally
  if (typeof window !== 'undefined') {
    window.debugOAuthConfig = debugOAuthConfig;
  }

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
