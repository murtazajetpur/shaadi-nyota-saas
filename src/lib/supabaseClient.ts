import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const getPasswordRecoveryCallbackState = () => {
  if (typeof window === 'undefined' || window.location.pathname !== '/reset-password') return false;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return searchParams.get('type') === 'recovery'
    || hashParams.get('type') === 'recovery'
    || searchParams.has('code');
};

// Capture this before Supabase consumes and removes the recovery parameters.
export const isPasswordRecoveryCallback = getPasswordRecoveryCallbackState();
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Public invite links must not inherit a dashboard/admin browser session. A
// session-free client also avoids stale authenticated tokens blocking an
// otherwise anonymous RSVP submission.
export const publicSupabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  : null;
export const createAuthenticatedDataClient = (accessToken: string): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => accessToken,
  });
};
