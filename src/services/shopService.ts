import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export type Shop = {
  id: string;
  legacyCode?: string | null;
  name: string;
  address?: string | null;
  cep?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ShopPayload = {
  name: string;
  address?: string;
  cep?: string;
  phone?: string;
  isActive?: boolean;
};

const SHOP_SELECT = 'id, legacy_code, name, address, cep, phone, is_active, created_at, updated_at';
const SHOP_SELECT_FALLBACK = 'id, legacy_code, name, address, phone, is_active, created_at';

const mapShopToCamel = (shop: any): Shop => ({
  id: shop.id,
  legacyCode: shop.legacy_code,
  name: shop.name,
  address: shop.address,
  cep: shop.cep,
  phone: shop.phone,
  isActive: shop.is_active !== false,
  createdAt: shop.created_at,
  updatedAt: shop.updated_at
});

const mapShopToSnake = (shop: ShopPayload) => ({
  name: shop.name?.trim(),
  address: shop.address?.trim() || null,
  cep: shop.cep?.trim() || null,
  phone: shop.phone?.trim() || null,
  is_active: shop.isActive !== false
});

const isMissingColumnError = (error: any) =>
  error?.code === '42703' ||
  String(error?.message || '').toLowerCase().includes('column') ||
  String(error?.message || '').toLowerCase().includes('schema cache');

const fetchShopsWithSelect = async (select: string) => {
  const { data, error } = await supabase
    .from('shops')
    .select(select)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapShopToCamel);
};

export const shopService = {
  async getAll(): Promise<Shop[]> {
    if (!isSupabaseConfigured) return [];

    try {
      return await fetchShopsWithSelect(SHOP_SELECT);
    } catch (error) {
      if (isMissingColumnError(error)) {
        return fetchShopsWithSelect(SHOP_SELECT_FALLBACK);
      }
      throw error;
    }
  },

  async createShop(shop: ShopPayload): Promise<Shop> {
    if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');

    const { data, error } = await supabase
      .from('shops')
      .insert(mapShopToSnake(shop))
      .select(SHOP_SELECT)
      .single();

    if (error) throw error;
    return mapShopToCamel(data);
  },

  async updateShop(id: string, shop: ShopPayload): Promise<Shop> {
    if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');

    const { data, error } = await supabase
      .from('shops')
      .update(mapShopToSnake(shop))
      .eq('id', id)
      .select(SHOP_SELECT)
      .single();

    if (error) throw error;
    return mapShopToCamel(data);
  }
};
