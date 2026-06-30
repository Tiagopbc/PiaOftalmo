import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appointment } from '../types';
import { patientService } from '../services/patientService';
import { appointmentService } from '../services/appointmentService';
import { useAuth } from './AuthContext';
import { usePatients } from './PatientContext';
import { isDoctorUser } from '../utils/roles';

interface AppointmentContextType {
  appointments: Appointment[];
  addAppointment: (app: Partial<Appointment>) => Promise<{ success: boolean; error?: string; appointment?: Appointment }>;
  updateAppointmentStatus: (id: string, status: string, cancelReason?: string) => Promise<void>;
  loading: boolean;
}

const AppointmentContext = createContext<AppointmentContextType>({} as AppointmentContextType);

export const AppointmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { patients } = usePatients();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = isDoctorUser(currentUser)
        ? await appointmentService.getByProfessional(currentUser.id)
        : await appointmentService.getAll();
      setAppointments(data);
    } catch (e) {
      console.error('Erro ao carregar agendamentos', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addAppointment = async (app: Partial<Appointment>) => {
    const patient = patients.find((item) => item.id === app.patientId);
    if (patient?.isActive === false) {
      return { success: false, error: 'Reative o paciente antes de criar um novo agendamento.' };
    }

    const newApp: Partial<Appointment> = {
      ...app,
      status: 'confirmado',
      shop_id: patient?.shop_id || (currentUser?.shopId === 'all' ? undefined : currentUser?.shopId)
    };

    try {
      await appointmentService.create(newApp);
      await loadData();
      
      if (patient) {
        const serviceName = app.serviceId || 'Consulta / Exame';
        await patientService.addTimelineEvent({
          patientId: patient.id,
          date: new Date().toISOString(),
          type: 'appointment',
          title: 'Agendamento Criado',
          description: `${serviceName} agendado para o dia ${app.date} às ${app.time}hs.`,
          shop_id: patient.shop_id
        });
      }
      return { success: true, appointment: newApp as Appointment };
    } catch (err: any) {
      console.error('Erro ao criar agendamento remoto', err);
      return { success: false, error: err.message };
    }
  };

  const updateAppointmentStatus = async (id: string, status: string, cancelReason = '') => {
    try {
      await appointmentService.updateStatus(id, status);
      const appInfo = appointments.find(a => a.id === id);
      await loadData();

      if (appInfo) {
        const patient = patients.find((p) => p.id === appInfo?.patientId);
        if (patient) {
          let title = 'Agendamento Atualizado';
          let desc = `Consulta de ${appInfo.time} foi marcada como ${status}.`;
          if (status === 'cancelado') {
            title = 'Agendamento Cancelado';
            desc = `Cancelado por motivo: ${cancelReason || 'Não informado'}.`;
          } else if (status === 'em_atendimento') {
            title = 'Atendimento Iniciado';
            desc = `Atendimento clínico iniciado pelo profissional.`;
          } else if (status === 'atendido') {
            title = 'Atendimento Realizado';
            desc = `Paciente atendido e finalizado pelo profissional.`;
          } else if (status === 'falta') {
            title = 'Falta Registrada';
            desc = `Paciente não compareceu ao horário agendado.`;
          }

          await patientService.addTimelineEvent({
            patientId: patient.id,
            date: new Date().toISOString(),
            type: 'appointment',
            title,
            description: desc,
            shop_id: patient.shop_id
          });
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar status do agendamento', err);
      throw err;
    }
  };

  return (
    <AppointmentContext.Provider value={{ appointments, addAppointment, updateAppointmentStatus, loading }}>
      {children}
    </AppointmentContext.Provider>
  );
};

export const useAppointments = () => useContext(AppointmentContext);
