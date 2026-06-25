import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { WaitlistItem } from '../types';

export const mapWaitToCamel = (wait: any): WaitlistItem | null => {
  if (!wait) return null;
  return {
    ...wait,
    patientName: wait.patient_name,
    preferredDoctor: wait.preferred_doctor,
    dateAdded: wait.date_added
  };
};

export const mapWaitToSnake = (wait: Partial<WaitlistItem>): any => {
  if (!wait) return null;
  return {
    id: wait.id,
    patient_name: wait.patientName,
    phone: wait.phone,
    preferred_doctor: wait.preferredDoctor,
    service: wait.service,
    date_added: wait.dateAdded,
    shop_id: wait.shop_id
  };
};

export const waitlistService = {
  async getAll(): Promise<WaitlistItem[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('waitlist').select('*');
    if (error) throw error;
    return (data || []).map(mapWaitToCamel) as WaitlistItem[];
  },
  async create(item: Partial<WaitlistItem>): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('waitlist').insert(mapWaitToSnake(item));
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('waitlist').delete().eq('id', id);
    if (error) throw error;
  }
};
