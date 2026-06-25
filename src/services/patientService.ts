import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Patient } from '../types';

export const mapPatientToCamel = (pat: any): Patient | null => {
  if (!pat) return null;
  return {
    ...pat,
    birthDate: pat.birth_date ?? pat.birthDate,
    isMinor: pat.is_minor ?? pat.isMinor,
    isActive: pat.is_active ?? pat.isActive ?? true,
  };
};

export const mapPatientToSnake = (pat: Partial<Patient>): any => {
  if (!pat) return null;
  const copy: any = { ...pat };
  copy.birth_date = pat.birthDate;
  copy.is_minor = pat.isMinor;
  copy.is_active = pat.isActive ?? true;
  delete copy.birthDate;
  delete copy.isMinor;
  delete copy.isActive;
  return copy;
};

export const patientService = {
  async getAll(): Promise<Patient[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('patients').select('*').order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapPatientToCamel) as Patient[];
  },
  async create(patient: Partial<Patient>): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('patients').insert(mapPatientToSnake(patient));
    if (error) throw error;
  },
  async update(id: string, patient: Partial<Patient>): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('patients').update(mapPatientToSnake(patient)).eq('id', id);
    if (error) throw error;
  },
  async setStatus(id: string, isActive: boolean): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('patients').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  },
  async getTimelineEvents(patientId: string): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('patient_timeline_events')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async addTimelineEvent(event: any): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('patient_timeline_events').insert({
      patient_id: event.patientId,
      type: event.type,
      title: event.title,
      description: event.description,
      date: event.date || new Date().toISOString(),
      shop_id: event.shop_id
    });
    if (error) throw error;
  }
};
