import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { getAuthUserProfile } from '../utils/authUser';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  isRemoteSession: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const isRemoteSession = isSupabaseConfigured && Boolean(currentUser) && !currentUser?.isDemo;

  useEffect(() => {
    if (isSupabaseConfigured) {
      const ensureUserMetadata = async (user: any) => {
        const name = user.user_metadata?.name || user.email.split('@')[0];
        if (!user.user_metadata?.name) {
          try {
            await supabase.auth.updateUser({
              data: { ...user.user_metadata, name }
            });
          } catch (err) {
            console.error('Erro ao inicializar o nome do usuário:', err);
          }
        }
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const user = session.user;
          ensureUserMetadata(user);
          setCurrentUser(getAuthUserProfile(user) as UserProfile);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          const user = session.user;
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            ensureUserMetadata(user);
          }
          setCurrentUser(getAuthUserProfile(user) as UserProfile);
        } else {
          setCurrentUser(null);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const logout = async () => {
    if (isRemoteSession) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, isRemoteSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
