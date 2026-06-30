import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';

export type Professional = {
  id: string;
  name: string;
  specialty: string;
  color: string;
  shopId?: string | null;
  shopName?: string | null;
};

type ProfessionalRow = {
  id: string;
  name: string | null;
  specialty: string | null;
  shop_id: string | null;
  shop_name: string | null;
};

const PROFESSIONAL_COLORS = [
  '#2563eb',
  '#0f766e',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#be123c',
  '#4f46e5',
  '#15803d'
];

const mapProfessional = (row: ProfessionalRow, index: number): Professional => ({
  id: row.id,
  name: row.name || 'Especialista',
  specialty: row.specialty || 'Especialista',
  color: PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length],
  shopId: row.shop_id,
  shopName: row.shop_name
});

export const professionalService = {
  async getActive(): Promise<Professional[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase.rpc('list_active_professionals');

    if (error) throw error;

    return ((data || []) as ProfessionalRow[]).map(mapProfessional);
  }
};
