import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Patient } from '../types';
import { patientService } from '../services/patientService';
import { useAuth } from './AuthContext';

interface PatientContextType {
  patients: Patient[];
  addPatient: (patient: Partial<Patient>) => Promise<Patient>;
  updatePatient: (patient: Patient) => Promise<void>;
  setPatientActiveStatus: (id: string, isActive: boolean) => Promise<{ success: boolean; error?: string; patient?: Patient }>;
  loading: boolean;
}

const PatientContext = createContext<PatientContextType>({} as PatientContextType);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch (e) {
      console.error('Erro ao carregar pacientes', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addPatient = async (patient: Partial<Patient>) => {
    const newPatient: Partial<Patient> = {
      ...patient,
      isActive: true,
      shop_id: currentUser?.shopId
    };

    try {
      const createdPatient = await patientService.create(newPatient);
      // Recarrega a lista para obter o ID gerado pelo banco e os dados exatos
      await loadData();
      return createdPatient as unknown as Patient; // Note: create doesn't currently return the object, we should probably change service to return it.
    } catch (err) {
      console.error('Erro ao criar paciente remoto', err);
      throw err;
    }
  };

  const updatePatient = async (patient: Patient) => {
    try {
      await patientService.update(patient.id, patient);
      await loadData();
    } catch (err) {
      console.error('Erro ao atualizar paciente', err);
      throw err;
    }
  };

  const setPatientActiveStatus = async (id: string, isActive: boolean) => {
    try {
      await patientService.setStatus(id, isActive);
      await loadData();
      const updatedPatient = patients.find(p => p.id === id);
      return { success: true, patient: updatedPatient };
    } catch (err: any) {
      console.error('Erro ao inativar/ativar paciente', err);
      return { success: false, error: err.message };
    }
  };

  return (
    <PatientContext.Provider value={{ patients, addPatient, updatePatient, setPatientActiveStatus, loading }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => useContext(PatientContext);
