import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Appointment } from '../types';

export const mapAppToCamel = (app: any): Appointment | null => {
  if (!app) return null;
  return {
    ...app,
    patientId: app.patient_id,
    patientName: app.patient_name,
    professionalId: app.professional_id,
    roomId: app.room_id,
    serviceId: app.service_id,
    paymentType: app.payment_type,
    isEncaixe: app.is_encaixe
  };
};

export const mapAppToSnake = (app: Partial<Appointment>): any => {
  if (!app) return null;
  return {
    id: app.id,
    patient_id: app.patientId,
    patient_name: app.patientName,
    professional_id: app.professionalId,
    room_id: app.roomId,
    service_id: app.serviceId,
    payment_type: app.paymentType,
    date: app.date,
    time: app.time,
    duration: app.duration,
    status: app.status,
    notes: app.notes,
    is_encaixe: app.isEncaixe,
    shop_id: app.shop_id
  };
};

export const appointmentService = {
  async getAll(): Promise<Appointment[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) throw error;
    return (data || []).map(mapAppToCamel) as Appointment[];
  },
  async create(app: Partial<Appointment>): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('appointments').insert(mapAppToSnake(app));
    if (error) throw error;
  },
  async updateStatus(id: string, status: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) throw error;
  }
};
