import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Prescription } from '../types';

const withoutUndefined = (payload: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

export const mapPrescriptionToCamel = (presc: any): Prescription | null => {
  if (!presc) return null;
  const longe = presc.longe && Object.keys(presc.longe).length > 0
    ? presc.longe
    : {
      od: {
        esferico: presc.od_sph || '',
        cilindrico: presc.od_cyl || '',
        eixo: presc.od_axis || '',
        dnp: '',
        av: ''
      },
      oe: {
        esferico: presc.os_sph || '',
        cilindrico: presc.os_cyl || '',
        eixo: presc.os_axis || '',
        dnp: '',
        av: ''
      }
    };

  return {
    id: presc.id,
    patientId: presc.patient_id,
    professionalId: presc.professional_id,
    doctor: presc.doctor_name || '',
    date: presc.date,
    validityDate: presc.validity_date,
    glassesType: presc.glasses_type,
    lensType: presc.lens_type,
    lensTypes: presc.lens_types || {},
    longe,
    perto: presc.perto || {},
    adicao: presc.addition,
    odSph: presc.od_sph,
    odCyl: presc.od_cyl,
    odAxis: presc.od_axis,
    osSph: presc.os_sph,
    osCyl: presc.os_cyl,
    osAxis: presc.os_axis,
    addition: presc.addition,
    notes: presc.notes,
    shop_id: presc.shop_id,
    createdAt: presc.created_at,
    updatedAt: presc.updated_at
  };
};

export const mapPrescriptionToSnake = (presc: Partial<Prescription>): any => {
  if (!presc) return null;
  const longeOD = presc.longe?.od || {};
  const longeOE = presc.longe?.oe || {};

  return withoutUndefined({
    patient_id: presc.patientId,
    professional_id: presc.professionalId,
    doctor_name: presc.doctor,
    date: presc.date,
    validity_date: presc.validityDate,
    glasses_type: presc.glassesType,
    lens_type: presc.lensType,
    lens_types: presc.lensTypes,
    longe: presc.longe,
    perto: presc.perto,
    od_sph: presc.odSph ?? longeOD.esferico,
    od_cyl: presc.odCyl ?? longeOD.cilindrico,
    od_axis: presc.odAxis ?? longeOD.eixo,
    os_sph: presc.osSph ?? longeOE.esferico,
    os_cyl: presc.osCyl ?? longeOE.cilindrico,
    os_axis: presc.osAxis ?? longeOE.eixo,
    addition: presc.addition ?? presc.adicao,
    notes: presc.notes,
    shop_id: presc.shop_id
  });
};

export const prescriptionService = {
  async getByPatient(patientId: string): Promise<Prescription[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
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

  async update(id: string, presc: Partial<Prescription>): Promise<Prescription> {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('prescriptions')
      .update(mapPrescriptionToSnake(presc))
      .eq('id', id)
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
