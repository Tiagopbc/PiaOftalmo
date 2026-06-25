import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Patient } from '../types';
import { patientService } from '../services/patientService';
import { readLocalData } from '../utils/localData';
import { INITIAL_PATIENTS } from '../utils/mockData';
import { useAuth } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface PatientContextType {
  patients: Patient[];
  addPatient: (patient: Partial<Patient>) => Promise<Patient>;
  updatePatient: (patient: Patient) => Promise<void>;
  setPatientActiveStatus: (id: string, isActive: boolean) => Promise<{ success: boolean; error?: string; patient?: Patient }>;
  loading: boolean;
}

const PatientContext = createContext<PatientContextType>({} as PatientContextType);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isRemoteSession } = useAuth();
  const [patients, setPatients] = useState<Patient[]>(() => readLocalData('pia_demo_patients_v2', INITIAL_PATIENTS));
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    if (currentUser.isDemo || !isRemoteSession) return;

    setLoading(true);
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch (e) {
      console.error('Erro ao carregar pacientes', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isRemoteSession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (currentUser?.isDemo || !isRemoteSession) {
      localStorage.setItem('pia_demo_patients_v2', JSON.stringify(patients));
    }
  }, [patients, currentUser, isRemoteSession]);

  const addPatient = async (patient: Partial<Patient>) => {
    const newId = `pat-${uuidv4()}`;
    const newPatient: Patient = {
      ...patient,
      id: newId,
      isActive: true,
      shop_id: !currentUser?.shopId || currentUser?.shopId === 'all' ? 'loja-1' : currentUser.shopId
    } as Patient;

    setPatients((prev) => [newPatient, ...prev]);

    if (isRemoteSession) {
      await patientService.create(newPatient);
    }
    return newPatient;
  };

  const updatePatient = async (updatedPatient: Patient) => {
    setPatients((prev) => prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)));
    if (isRemoteSession) {
      await patientService.update(updatedPatient.id, updatedPatient);
    }
  };

  const setPatientActiveStatus = async (id: string, isActive: boolean) => {
    const canManagePatientStatus = currentUser?.isDemo
      ? currentUser.role === 'admin'
      : currentUser?.appRole === 'admin';

    if (!canManagePatientStatus) {
      return { success: false, error: 'Apenas administradores podem inativar ou reativar pacientes.' };
    }

    const patient = patients.find((item) => item.id === id);
    if (!patient) return { success: false, error: 'Paciente não encontrado.' };

    const updatedPatient = { ...patient, isActive };

    if (isRemoteSession) {
      try {
        await patientService.setStatus(id, isActive);
      } catch (e) {
        return { success: false, error: 'Erro no Supabase' };
      }
    }

    setPatients((prev) => prev.map((item) => item.id === id ? updatedPatient : item));
    return { success: true, patient: updatedPatient };
  };

  return (
    <PatientContext.Provider
      value={{
        patients,
        addPatient,
        updatePatient,
        setPatientActiveStatus,
        loading
      }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => useContext(PatientContext);
