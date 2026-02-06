import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, auth, db } from '../lib/supabase';

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  role_id: string | null;
  roles: {
    id: string;
    name: string | null;
  } | null;
  status: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await db.getProfile(userId);
      if (error) {
        console.error('Error loading profile:', error);
        return;
      }
      setProfile(data as Profile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  }, [user?.id, loadProfile]);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          console.error('Error getting session:', error);
        }

        const currentSession = data?.session ?? null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          void loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);
        
        try {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            void loadProfile(session.user.id);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error('Error handling auth change:', error);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (username: string, password: string) => {
    setLoading(true);
    
    try {
      let result;
      
      // Check if input looks like an email
      if (username.includes('@')) {
        result = await auth.signIn(username, password);
      } else {
        result = await auth.signInWithUsername(username, password);
      }
      
      if (result.error) {
        setLoading(false);
        return { error: result.error };
      }
      
      // Auth state change listener will handle the rest
      return { error: null };
    } catch (error: any) {
      setLoading(false);
      return { error: { message: error.message || 'Authentication failed' } };
    }
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  const isAdmin = profile?.roles?.name === 'admin' || 
                  profile?.roles?.name === 'director' || 
                  profile?.roles?.name === 'sales';

  return {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    isAdmin,
    refreshProfile,
  };
}
