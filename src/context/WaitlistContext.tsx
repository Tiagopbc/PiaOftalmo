import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WaitlistItem } from '../types';
import { waitlistService } from '../services/waitlistService';
import { readLocalData } from '../utils/localData';
import { INITIAL_WAITLIST } from '../utils/mockData';
import { useAuth } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface WaitlistContextType {
  waitlist: WaitlistItem[];
  addWaitlist: (item: Partial<WaitlistItem>) => Promise<void>;
  removeWaitlist: (id: string) => Promise<void>;
  loading: boolean;
}

const WaitlistContext = createContext<WaitlistContextType>({} as WaitlistContextType);

export const WaitlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isRemoteSession } = useAuth();
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>(() => readLocalData('pia_demo_waitlist_v2', INITIAL_WAITLIST));
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    if (currentUser.isDemo || !isRemoteSession) return;

    setLoading(true);
    try {
      const data = await waitlistService.getAll();
      setWaitlist(data);
    } catch (e) {
      console.error('Erro ao carregar fila de espera', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isRemoteSession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (currentUser?.isDemo || !isRemoteSession) {
      localStorage.setItem('pia_demo_waitlist_v2', JSON.stringify(waitlist));
    }
  }, [waitlist, currentUser, isRemoteSession]);

  const addWaitlist = async (item: Partial<WaitlistItem>) => {
    const newItem: WaitlistItem = {
      ...item,
      id: `w-${uuidv4()}`,
      dateAdded: new Date().toISOString().split('T')[0],
      shop_id: !currentUser?.shopId || currentUser?.shopId === 'all' ? 'loja-1' : currentUser.shopId
    } as WaitlistItem;

    setWaitlist((prev) => [...prev, newItem]);

    if (isRemoteSession) {
      await waitlistService.create(newItem);
    }
  };

  const removeWaitlist = async (id: string) => {
    setWaitlist((prev) => prev.filter((item) => item.id !== id));

    if (isRemoteSession) {
      await waitlistService.remove(id);
    }
  };

  return (
    <WaitlistContext.Provider value={{ waitlist, addWaitlist, removeWaitlist, loading }}>
      {children}
    </WaitlistContext.Provider>
  );
};

export const useWaitlist = () => useContext(WaitlistContext);
