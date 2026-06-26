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
  serviceName?: string;
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
  shopName?: string;
  shopCode?: string;
  appRole?: string;
  mustChangePassword?: boolean;
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

export interface InventoryItem {
  id: string;
  shop_id?: string;
  name: string;
  sku?: string;
  category: string;
  brand?: string;
  quantity: number;
  minQuantity: number;
  price?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  shop_id?: string;
  type: string;
  quantity: number;
  date: string;
  professionalId?: string;
  notes?: string;
}

export interface Anamnesis {
  queixaPrincipal?: string;
  historicoFamiliar?: string;
  doencasSistemicas?: string;
  medicamentos?: string;
}

export interface VisualAcuity {
  od_cc?: string;
  od_sc?: string;
  oe_cc?: string;
  oe_sc?: string;
}

export interface Tonometry {
  od_pressure?: string;
  oe_pressure?: string;
  time?: string;
}

export interface RefractionData {
  od_sph?: string;
  od_cyl?: string;
  od_axis?: string;
  oe_sph?: string;
  oe_cyl?: string;
  oe_axis?: string;
  add?: string;
}

export interface Diagnosis {
  cid?: string;
  conduta?: string;
  obs_gerais?: string;
}

export interface ClinicalEncounter {
  id: string;
  patient_id: string;
  professional_id?: string;
  date: string;
  shop_id?: string;
  anamnesis: Anamnesis;
  visual_acuity: VisualAcuity;
  tonometry: Tonometry;
  refraction: RefractionData;
  diagnosis: Diagnosis;
  created_at: string;
}

export interface ExamRecord {
  id: string;
  patient_id: string;
  professional_id?: string;
  encounter_id?: string;
  date: string;
  shop_id?: string;
  exam_type: string;
  results?: string;
  conclusion?: string;
  created_at: string;
}

export interface PatientAttachment {
  id: string;
  patient_id: string;
  shop_id: string;
  uploader_id: string;
  name: string;
  storage_path: string;
  file_type: string;
  size_bytes: number;
  is_confidential: boolean;
  created_at: string;
}
