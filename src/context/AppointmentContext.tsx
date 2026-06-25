import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appointment } from '../types';
import { patientService } from '../services/patientService';
import { appointmentService } from '../services/appointmentService';
import { readLocalData } from '../utils/localData';
import { INITIAL_APPOINTMENTS } from '../utils/mockData';
import { useAuth } from './AuthContext';
import { usePatients } from './PatientContext';
import { v4 as uuidv4 } from 'uuid';

interface AppointmentContextType {
  appointments: Appointment[];
  addAppointment: (app: Partial<Appointment>) => Promise<{ success: boolean; error?: string; appointment?: Appointment }>;
  updateAppointmentStatus: (id: string, status: string, cancelReason?: string) => Promise<void>;
  loading: boolean;
}

const AppointmentContext = createContext<AppointmentContextType>({} as AppointmentContextType);

export const AppointmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isRemoteSession } = useAuth();
  const { patients, updatePatient } = usePatients();
  const [appointments, setAppointments] = useState<Appointment[]>(() => readLocalData('pia_demo_appointments_v2', INITIAL_APPOINTMENTS));
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    if (currentUser.isDemo || !isRemoteSession) return;

    setLoading(true);
    try {
      const data = await appointmentService.getAll();
      setAppointments(data);
    } catch (e) {
      console.error('Erro ao carregar agendamentos', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isRemoteSession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (currentUser?.isDemo || !isRemoteSession) {
      localStorage.setItem('pia_demo_appointments_v2', JSON.stringify(appointments));
    }
  }, [appointments, currentUser, isRemoteSession]);

  const addAppointment = async (app: Partial<Appointment>) => {
    const patient = patients.find((item) => item.id === app.patientId);
    if (patient?.isActive === false) {
      return { success: false, error: 'Reative o paciente antes de criar um novo agendamento.' };
    }

    const newId = `app-${uuidv4()}`;
    const newApp: Appointment = {
      ...app,
      id: newId,
      status: 'confirmado',
      shop_id: !currentUser?.shopId || currentUser?.shopId === 'all' ? 'loja-1' : currentUser.shopId
    } as Appointment;

    setAppointments((prev) => [...prev, newApp]);

    if (patient) {
      const serviceName = app.serviceId || 'Consulta / Exame';
      patientService.addTimelineEvent({
        patientId: patient.id,
        date: app.date,
        type: 'appointment',
        title: 'Agendamento Criado',
        description: `${serviceName} agendado para o dia ${app.date} às ${app.time}hs.`,
        shop_id: patient.shop_id
      }).catch(console.error);
    }

    if (isRemoteSession) {
      await appointmentService.create(newApp);
    }

    return { success: true, appointment: newApp };
  };

  const updateAppointmentStatus = async (id: string, status: string, cancelReason = '') => {
    let appInfo: Appointment | null = null;
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          appInfo = { ...app, status, cancelReason };
          return appInfo;
        }
        return app;
      })
    );

    if (isRemoteSession) {
      await appointmentService.updateStatus(id, status);
    }

    if (appInfo) {
      const patient = patients.find((p) => p.id === appInfo?.patientId);
      if (patient) {
        let title = 'Agendamento Atualizado';
        let desc = `Consulta de ${appInfo.time} foi marcada como ${status}.`;
        if (status === 'cancelado') {
          title = 'Agendamento Cancelado';
          desc = `Cancelado por motivo: ${cancelReason || 'Não informado'}.`;
        } else if (status === 'atendido') {
          title = 'Atendimento Realizado';
          desc = `Paciente atendido e finalizado pelo profissional.`;
        } else if (status === 'falta') {
          title = 'Falta Registrada';
          desc = `Paciente não compareceu ao horário agendado.`;
        }

        patientService.addTimelineEvent({
          patientId: patient.id,
          date: new Date().toISOString().split('T')[0],
          type: 'appointment',
          title,
          description: desc,
          shop_id: patient.shop_id
        }).catch(console.error);
      }
    }
  };

  return (
    <AppointmentContext.Provider value={{ appointments, addAppointment, updateAppointmentStatus, loading }}>
      {children}
    </AppointmentContext.Provider>
  );
};

export const useAppointments = () => useContext(AppointmentContext);
