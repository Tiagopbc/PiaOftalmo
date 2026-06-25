import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Sale, SaleItem, Payment, OpticalOrder } from '../types';

export const mapSaleToCamel = (sale: any): Sale | null => {
  if (!sale) return null;
  return {
    id: sale.id,
    patientId: sale.patient_id,
    professionalId: sale.professional_id,
    date: sale.date,
    status: sale.status,
    totalAmount: sale.total_amount,
    notes: sale.notes,
    shop_id: sale.shop_id,
    createdAt: sale.created_at
  };
};

export const mapSaleToSnake = (sale: Partial<Sale>): any => {
  if (!sale) return null;
  return {
    patient_id: sale.patientId,
    professional_id: sale.professionalId,
    date: sale.date,
    status: sale.status,
    total_amount: sale.totalAmount,
    notes: sale.notes,
    shop_id: sale.shop_id
  };
};

export const mapSaleItemToCamel = (item: any): SaleItem | null => {
  if (!item) return null;
  return {
    id: item.id,
    saleId: item.sale_id,
    type: item.type,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    shop_id: item.shop_id,
    createdAt: item.created_at
  };
};

export const mapPaymentToCamel = (payment: any): Payment | null => {
  if (!payment) return null;
  return {
    id: payment.id,
    saleId: payment.sale_id,
    patientId: payment.patient_id,
    date: payment.date,
    amount: payment.amount,
    paymentMethod: payment.payment_method,
    status: payment.status,
    shop_id: payment.shop_id,
    createdAt: payment.created_at
  };
};

export const mapOpticalOrderToCamel = (order: any): OpticalOrder | null => {
  if (!order) return null;
  return {
    id: order.id,
    saleId: order.sale_id,
    patientId: order.patient_id,
    status: order.status,
    laboratory: order.laboratory,
    expectedDeliveryDate: order.expected_delivery_date,
    notes: order.notes,
    shop_id: order.shop_id,
    createdAt: order.created_at
  };
};

export const saleService = {
  async getAll(): Promise<Sale[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapSaleToCamel) as Sale[];
  },

  async getByPatient(patientId: string): Promise<Sale[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapSaleToCamel) as Sale[];
  },

  async getPaymentsBySale(saleId: string): Promise<Payment[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('sale_id', saleId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapPaymentToCamel) as Payment[];
  },

  async getPayments(): Promise<Payment[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapPaymentToCamel) as Payment[];
  },

  async getOpticalOrders(): Promise<OpticalOrder[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('optical_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapOpticalOrderToCamel) as OpticalOrder[];
  },

  async createSaleWithItems(sale: Partial<Sale>, items: Partial<SaleItem>[]): Promise<Sale> {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    
    // In a real app, you'd use a Postgres RPC or wrap this in a transaction via a custom function.
    // For now, we do two requests:
    const { data: createdSale, error: saleError } = await supabase
      .from('sales')
      .insert(mapSaleToSnake(sale))
      .select()
      .single();
      
    if (saleError) throw saleError;

    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        sale_id: createdSale.id,
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        shop_id: item.shop_id
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return mapSaleToCamel(createdSale) as Sale;
  },

  async updateSaleStatus(id: string, status: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('sales').update({ status }).eq('id', id);
    if (error) throw error;
  },

  async addPayment(payment: Partial<Payment>): Promise<Payment> {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('payments')
      .insert({
        sale_id: payment.saleId,
        patient_id: payment.patientId,
        date: payment.date,
        amount: payment.amount,
        payment_method: payment.paymentMethod,
        status: payment.status || 'concluido',
        shop_id: payment.shop_id
      })
      .select()
      .single();
    if (error) throw error;
    return mapPaymentToCamel(data) as Payment;
  },

  async createOpticalOrder(order: Partial<OpticalOrder>): Promise<OpticalOrder> {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('optical_orders')
      .insert({
        sale_id: order.saleId,
        patient_id: order.patientId,
        status: order.status || 'producao',
        laboratory: order.laboratory,
        expected_delivery_date: order.expectedDeliveryDate,
        notes: order.notes,
        shop_id: order.shop_id
      })
      .select()
      .single();
    if (error) throw error;
    return mapOpticalOrderToCamel(data) as OpticalOrder;
  },

  async updateOpticalOrderStatus(id: string, status: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('optical_orders').update({ status }).eq('id', id);
    if (error) throw error;
  }
};
