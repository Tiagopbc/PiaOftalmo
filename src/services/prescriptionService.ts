import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Prescription } from '../types';

export const mapPrescriptionToCamel = (presc: any): Prescription | null => {
  if (!presc) return null;
  return {
    id: presc.id,
    patientId: presc.patient_id,
    professionalId: presc.professional_id,
    date: presc.date,
    validityDate: presc.validity_date,
    glassesType: presc.glasses_type,
    lensType: presc.lens_type,
    odSph: presc.od_sph,
    odCyl: presc.od_cyl,
    odAxis: presc.od_axis,
    osSph: presc.os_sph,
    osCyl: presc.os_cyl,
    osAxis: presc.os_axis,
    addition: presc.addition,
    notes: presc.notes,
    shop_id: presc.shop_id,
    createdAt: presc.created_at
  };
};

export const mapPrescriptionToSnake = (presc: Partial<Prescription>): any => {
  if (!presc) return null;
  return {
    patient_id: presc.patientId,
    professional_id: presc.professionalId,
    date: presc.date,
    validity_date: presc.validityDate,
    glasses_type: presc.glassesType,
    lens_type: presc.lensType,
    od_sph: presc.odSph,
    od_cyl: presc.odCyl,
    od_axis: presc.odAxis,
    os_sph: presc.osSph,
    os_cyl: presc.osCyl,
    os_axis: presc.osAxis,
    addition: presc.addition,
    notes: presc.notes,
    shop_id: presc.shop_id
  };
};

export const prescriptionService = {
  async getByPatient(patientId: string): Promise<Prescription[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapPrescriptionToCamel) as Prescription[];
  },

  async create(presc: Partial<Prescription>): Promise<Prescription> {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('prescriptions')
      .insert(mapPrescriptionToSnake(presc))
      .select()
      .single();
    if (error) throw error;
    return mapPrescriptionToCamel(data) as Prescription;
  },

  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('prescriptions').delete().eq('id', id);
    if (error) throw error;
  }
};
