import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_PROFESSIONALS, INITIAL_ROOMS } from '../utils/mockData';

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
  professionals: any[];
  rooms: any[];
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
        professionals: INITIAL_PROFESSIONALS,
        rooms: INITIAL_ROOMS
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
