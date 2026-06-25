export interface Guardian {
  name: string;
  cpf: string;
  phone: string;
}

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  gender: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  isMinor: boolean;
  guardian?: Guardian;
  alerts?: any[];
  notes?: string;
  exams?: any[];
  attachments?: any[];
  isActive: boolean;
  shop_id?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  roomId: string;
  serviceId: string;
  paymentType: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  notes?: string;
  isEncaixe: boolean;
  shop_id?: string;
  cancelReason?: string;
}

export interface WaitlistItem {
  id: string;
  patientName: string;
  phone: string;
  preferredDoctor: string;
  service: string;
  dateAdded: string;
  shop_id?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  shopId: string;
  isDemo: boolean;
  appRole?: string;
}

export interface PatientTimelineEvent {
  id: string;
  patientId: string;
  type: string;
  title: string;
  description?: string;
  date: string;
  shop_id?: string;
  createdAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  professionalId?: string;
  date: string;
  validityDate?: string;
  glassesType?: string;
  lensType?: string;
  odSph?: string;
  odCyl?: string;
  odAxis?: string;
  osSph?: string;
  osCyl?: string;
  osAxis?: string;
  addition?: string;
  notes?: string;
  shop_id?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  patientId: string;
  professionalId?: string;
  date: string;
  status: string;
  totalAmount: number;
  notes?: string;
  shop_id?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  shop_id?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  saleId: string;
  patientId: string;
  date: string;
  amount: number;
  paymentMethod: string;
  status: string;
  shop_id?: string;
  createdAt: string;
}

export interface OpticalOrder {
  id: string;
  saleId: string;
  patientId: string;
  status: string;
  laboratory?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  shop_id?: string;
  createdAt: string;
}
