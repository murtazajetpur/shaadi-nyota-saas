import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isPasswordRecoveryCallback, isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export interface AuthProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'couple' | 'admin';
}

interface AuthResult {
  error: string | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  isPasswordRecovery: boolean;
  loading: boolean;
  profileLoading: boolean;
  profileError: string;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (fullName: string, email: string, password: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getFriendlyError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isPasswordRecoveryCallback);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profileLoading, setProfileLoading] = useState(isSupabaseConfigured);
  const [profileError, setProfileError] = useState('');

  const loadProfile = async (currentUser: User | null) => {
    if (!supabase || !currentUser) {
      setProfile(null);
      setProfileError('');
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError('');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      console.warn('Unable to load auth profile', error);
      setProfile(null);
      setProfileError(error.message);
    } else {
      setProfile(data as AuthProfile | null);
      setProfileError('');
    }
    setProfileLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setProfileLoading(false);
      return;
    }

    let isMounted = true;

    // Subscribe before awaiting initialization so a fast recovery redirect cannot lose the event.
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }
      void loadProfile(nextSession?.user ?? null);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      if (!isMounted) return;
      setLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    await loadProfile(user);
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured for this environment.' };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (fullName: string, email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured for this environment.' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) return { error: error.message };

    return {
      error: null,
      needsEmailConfirmation: Boolean(data.user && !data.session),
    };
  };

  const requestPasswordReset = async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured for this environment.' };

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured for this environment.' };

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };

    setIsPasswordRecovery(false);
    const { error: signOutError } = await supabase.auth.signOut();
    return { error: signOutError?.message ?? null };
  };
  const signOut = async (): Promise<AuthResult> => {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileError('');
      setIsPasswordRecovery(false);
    }
    return { error: error?.message ?? null };
  };

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    profile,
    isPasswordRecovery,
    profileError,
    loading,
    profileLoading,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    signOut,
    refreshProfile,
  }), [isPasswordRecovery, loading, profile, profileError, profileLoading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}

export { getFriendlyError };
