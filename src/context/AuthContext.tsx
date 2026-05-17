import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

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
  loading: boolean;
  profileLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (fullName: string, email: string, password: string) => Promise<AuthResult>;
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
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = async (currentUser: User | null) => {
    if (!supabase || !currentUser) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      console.warn('Unable to load auth profile', error);
      setProfile(null);
    } else {
      setProfile(data as AuthProfile | null);
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

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      void loadProfile(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void loadProfile(nextSession?.user ?? null);
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

  const signOut = async (): Promise<AuthResult> => {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
    return { error: error?.message ?? null };
  };

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    profile,
    loading,
    profileLoading,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [loading, profile, profileLoading, session, user]);

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
