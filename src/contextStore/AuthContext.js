import React, { useState, createContext, useEffect, useMemo } from 'react';
import { supabase } from 'backend/config';

export const AuthContext = createContext(null);

function ContextAuth({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const handleSession = async (session) => {
      const u = session?.user;
      if (u) {
        // Ensure profile exists (critical for Google OAuth signups)
        const { data } = await supabase.from('profiles').select('id').eq('id', u.id).maybeSingle();
        if (!data) {
          await supabase.from('profiles').insert([{
            id: u.id,
            full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
            avatar_url: u.user_metadata?.avatar_url || ''
          }]);
        }

        setUser({ 
          ...u, 
          uid: u.id, 
          displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] 
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);

      // Clean up the URL if it contains the OAuth access token hash
      if (window.location.hash && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    // Get initial session
    const setupAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await handleSession(session);
    };

    setupAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ user, setUser, authLoading }),
    [user, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default ContextAuth;
