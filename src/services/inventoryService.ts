import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { InventoryItem, InventoryTransaction } from '../types';

export const mapInventoryItemToCamel = (item: any): InventoryItem | null => {
  if (!item) return null;
  return {
    ...item,
    minQuantity: item.min_quantity,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
};

export const mapInventoryItemToSnake = (item: Partial<InventoryItem>): any => {
  if (!item) return null;
  const copy: any = { ...item };
  copy.min_quantity = item.minQuantity;
  copy.is_active = item.isActive;
  delete copy.minQuantity;
  delete copy.isActive;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy;
};

export const getInventoryItems = async (shopId?: string): Promise<InventoryItem[]> => {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('inventory_items')
    .select('*')
    .order('name', { ascending: true });

  if (shopId) {
    query = query.eq('shop_id', shopId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
  return (data || []).map(mapInventoryItemToCamel) as InventoryItem[];
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('inventory_items')
    .insert([mapInventoryItemToSnake(item)])
    .select()
    .single();

  if (error) {
    console.error('Error adding inventory item:', error);
    throw error;
  }
  return mapInventoryItemToCamel(data) as InventoryItem;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('inventory_items')
    .update({ ...mapInventoryItemToSnake(updates), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
  return mapInventoryItemToCamel(data) as InventoryItem;
};

export const getInventoryTransactions = async (itemId: string): Promise<InventoryTransaction[]> => {
  if (!isSupabaseConfigured) return [];
  
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('item_id', itemId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching inventory transactions:', error);
    throw error;
  }
  
  return (data || []).map(t => ({
    id: t.id,
    itemId: t.item_id,
    shop_id: t.shop_id,
    type: t.type,
    quantity: t.quantity,
    date: t.date,
    professionalId: t.professional_id,
    notes: t.notes
  }));
};

export const adjustStock = async (
  itemId: string, 
  shopId: string, 
  quantityChange: number, 
  type: 'IN' | 'OUT' | 'ADJUST', 
  professionalId?: string, 
  notes?: string
): Promise<void> => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  // Transaction-like logic using Supabase rpc or two queries. 
  // We'll do it via RPC if available, or just two queries sequentially since we have RLS
  
  // 1. Log transaction
  const { error: txError } = await supabase
    .from('inventory_transactions')
    .insert([{
      item_id: itemId,
      shop_id: shopId,
      type,
      quantity: quantityChange,
      professional_id: professionalId,
      notes
    }]);

  if (txError) {
    console.error('Error recording inventory transaction:', txError);
    throw txError;
  }

  // 2. Fetch current quantity to update
  const { data: item, error: fetchError } = await supabase
    .from('inventory_items')
    .select('quantity')
    .eq('id', itemId)
    .single();

  if (fetchError || !item) {
    console.error('Error fetching current item quantity:', fetchError);
    throw fetchError || new Error('Item not found');
  }

  // 3. Update quantity
  const newQuantity = Math.max(0, item.quantity + quantityChange);
  
  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
    .eq('id', itemId);

  if (updateError) {
    console.error('Error updating stock quantity:', updateError);
    throw updateError;
  }
};
