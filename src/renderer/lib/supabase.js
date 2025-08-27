import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://cikhrockryhbgeefhhec.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpa2hyb2NrcnloYmdlZWZoaGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODMwNDYsImV4cCI6MjA3MTg1OTA0Nn0.U2htepxAIT44IxyCJfpV_HYvk0ukZbr1EghuS7pCKRk';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable auto-refresh of tokens
    autoRefreshToken: true,
    // Persist session across page reloads
    persistSession: true,
    // Detect session from URL (for OAuth callbacks)
    detectSessionInUrl: true,
    // Storage options for Electron
    storage: {
      getItem: (key) => {
        // Use electron-store for secure storage
        return window.electron?.store?.get(key) || null;
      },
      setItem: (key, value) => {
        // Use electron-store for secure storage
        window.electron?.store?.set(key, value);
      },
      removeItem: (key) => {
        // Use electron-store for secure storage
        window.electron?.store?.delete(key);
      },
    },
  },
});

// Helper function to get current user
export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

// Helper function to get current session
export const getCurrentSession = () => {
  return supabase.auth.getSession();
};

// Helper function for sign up
export const signUp = async (email, password, userData = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
  return { data, error };
};

// Helper function for sign in
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Helper function for OAuth sign in
export const signInWithOAuth = async (provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Redirect URL for Electron app
      redirectTo: 'http://localhost:1212/auth/callback',
    },
  });
  return { data, error };
};

// Helper function for sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Helper function to listen for auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Helper function to update user profile
export const updateProfile = async (profileData) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: supabase.auth.getUser()?.data?.user?.id,
      ...profileData,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { data, error };
};

// Helper function to get user profile
export const getProfile = async (userId = null) => {
  const targetUserId = userId || supabase.auth.getUser()?.data?.user?.id;

  if (!targetUserId) {
    return { data: null, error: { message: 'No user ID provided' } };
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  return { data, error };
};

export default supabase;
