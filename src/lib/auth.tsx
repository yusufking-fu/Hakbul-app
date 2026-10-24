import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // getSession() reads the persisted session from localStorage — this is the
    // source of truth for the initial load. onAuthStateChange's INITIAL_SESSION
    // event fires synchronously and can report null before getSession resolves,
    // so we ignore it and let getSession decide the initial state.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // INITIAL_SESSION fires before getSession() resolves and may carry null;
      // skip it to avoid prematurely clearing/loading state.
      if (event === 'INITIAL_SESSION') return;

      (async () => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setLoading(false);
          return;
        }

        setSession(newSession);
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT handler clears session; nothing to do here.
  };

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
