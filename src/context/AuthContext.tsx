import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getAuthUserProfile } from '../utils/authUser';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const user = session.user;
        await ensureUserMetadata(user);
        const profile = await getAuthUserProfile(user);
        setCurrentUser(profile);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const user = session.user;
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          await ensureUserMetadata(user);
        }
        const profile = await getAuthUserProfile(user);
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
