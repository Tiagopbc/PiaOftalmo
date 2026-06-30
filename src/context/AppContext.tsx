import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROOMS } from '../utils/constants';
import { isDoctorRole } from '../utils/roles';
import { useAuth } from './AuthContext';
import { professionalService, type Professional } from '../services/professionalService';

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  activePrintData: any | null;
  setActivePrintData: (data: any | null) => void;
  clinicSettings: any;
  updateClinicSettings: (settings: any) => void;
  theme: string;
  toggleTheme: () => void;
  professionals: Professional[];
  rooms: any[];
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('pia_theme') || 'light';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pia_theme', next);
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activePrintData, setActivePrintData] = useState<any | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  const [clinicSettings, setClinicSettings] = useState(() => {
    const local = localStorage.getItem('pia_clinic_settings');
    return local ? JSON.parse(local) : {
      name: 'Centro Visual Optometria',
      address: 'Av. Quatro, Nº 01, Sl. 02 - Cohab Anil IV - São Luís/MA',
      cep: '65050-700',
      phone: '(98) 98815-4507'
    };
  });

  const updateClinicSettings = (newSettings: any) => {
    setClinicSettings(newSettings);
    localStorage.setItem('pia_clinic_settings', JSON.stringify(newSettings));
  };

  useEffect(() => {
    if (!currentUser) {
      setProfessionals([]);
      return undefined;
    }

    let cancelled = false;

    professionalService.getActive()
      .then((data) => {
        if (cancelled) return;

        const currentUserIsDoctor = isDoctorRole(currentUser.appRole) || isDoctorRole(currentUser.role);

        if (currentUserIsDoctor) {
          setProfessionals([
            {
              id: currentUser.id,
              name: currentUser.name || currentUser.email || 'Médico',
              specialty: 'Especialista',
              color: '#2563eb',
              shopId: currentUser.shopId === 'all' ? null : currentUser.shopId,
              shopName: currentUser.shopName || null
            }
          ]);
          return;
        }

        setProfessionals(data);
      })
      .catch((error) => {
        console.error('Não foi possível carregar especialistas ativos.', error);
        if (!cancelled) setProfessionals([]);
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentUser?.appRole,
    currentUser?.email,
    currentUser?.id,
    currentUser?.name,
    currentUser?.role,
    currentUser?.shopId,
    currentUser?.shopName
  ]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedPatientId,
        setSelectedPatientId,
        activePrintData,
        setActivePrintData,
        clinicSettings,
        updateClinicSettings,
        theme,
        toggleTheme,
        professionals,
        rooms: ROOMS
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
