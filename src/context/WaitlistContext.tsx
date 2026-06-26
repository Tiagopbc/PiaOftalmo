import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WaitlistItem } from '../types';
import { waitlistService } from '../services/waitlistService';
import { useAuth } from './AuthContext';

interface WaitlistContextType {
  waitlist: WaitlistItem[];
  addWaitlist: (item: Partial<WaitlistItem>) => Promise<void>;
  removeWaitlist: (id: string) => Promise<void>;
  loading: boolean;
}

const WaitlistContext = createContext<WaitlistContextType>({} as WaitlistContextType);

export const WaitlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await waitlistService.getAll();
      setWaitlist(data);
    } catch (e) {
      console.error('Erro ao carregar fila de espera', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addWaitlist = async (item: Partial<WaitlistItem>) => {
    const newItem: Partial<WaitlistItem> = {
      ...item,
      dateAdded: new Date().toISOString().split('T')[0],
      shop_id: currentUser?.shopId
    };

    try {
      await waitlistService.create(newItem);
      await loadData();
    } catch (err) {
      console.error('Erro ao adicionar à fila remoto', err);
      throw err;
    }
  };

  const removeWaitlist = async (id: string) => {
    try {
      await waitlistService.remove(id);
      await loadData();
    } catch (err) {
      console.error('Erro ao remover da fila remoto', err);
      throw err;
    }
  };

  return (
    <WaitlistContext.Provider value={{ waitlist, addWaitlist, removeWaitlist, loading }}>
      {children}
    </WaitlistContext.Provider>
  );
};

export const useWaitlist = () => useContext(WaitlistContext);
