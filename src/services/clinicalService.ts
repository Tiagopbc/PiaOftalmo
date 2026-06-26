import { supabase } from '../utils/supabaseClient';
import { ClinicalEncounter, ExamRecord } from '../types';

export const clinicalService = {
  // Clinical Encounters
  getPatientEncounters: async (patientId: string): Promise<ClinicalEncounter[]> => {
    const { data, error } = await supabase
      .from('clinical_encounters')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createEncounter: async (encounter: Partial<ClinicalEncounter>): Promise<ClinicalEncounter> => {
    const { data, error } = await supabase
      .from('clinical_encounters')
      .insert([encounter])
      .select()
      .single();

    if (error) throw error;
    
    // Add to timeline
    if (data) {
      await supabase.from('patient_timeline_events').insert([{
        patient_id: data.patient_id,
        type: 'clinical',
        title: 'Prontuário Registrado',
        description: 'Um novo atendimento clínico estruturado foi adicionado.',
        shop_id: data.shop_id
      }]);
    }
    
    return data;
  },

  updateEncounter: async (id: string, updates: Partial<ClinicalEncounter>): Promise<ClinicalEncounter> => {
    const { data, error } = await supabase
      .from('clinical_encounters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Exams
  getPatientExams: async (patientId: string): Promise<ExamRecord[]> => {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createExam: async (exam: Partial<ExamRecord>): Promise<ExamRecord> => {
    const { data, error } = await supabase
      .from('exams')
      .insert([exam])
      .select()
      .single();

    if (error) throw error;
    
    // Add to timeline
    if (data) {
      await supabase.from('patient_timeline_events').insert([{
        patient_id: data.patient_id,
        type: 'clinical',
        title: `Exame: ${data.exam_type}`,
        description: 'Um novo exame foi anexado ao prontuário do paciente.',
        shop_id: data.shop_id
      }]);
    }

    return data;
  }
};
