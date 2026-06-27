import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { usePatients } from '../context/PatientContext';
import { useApp } from '../context/AppContext';
import { patientService } from '../services/patientService';
import { prescriptionService } from '../services/prescriptionService';
import { saleService } from '../services/saleService';
import { attachmentService } from '../services/attachmentService';
import { shopService, type Shop } from '../services/shopService';
import { getShopDisplayName } from '../utils/shops';
import PageHeader from './PageHeader';
import { StatusBadge } from './StatusBadge';
import { StatePanel } from './StatePanel';
import { ClinicalRecordTab } from './ClinicalRecordTab';
import {
  Search,
  UserPlus,
  Phone,
  FileText,
  AlertTriangle,
  Clock,
  Plus,
  UserX,
  RotateCcw,
  Paperclip,
  Calendar,
  Printer,
  FlaskConical,
  Download,
  Lock,
  Trash2
} from 'lucide-react';
import type { Patient, PatientAttachment } from '../types';

type LegacyRecord = Record<string, any>;
type PatientWithLegacyData = Patient & {
  timeline?: LegacyRecord[];
  alerts?: LegacyRecord[];
};
type PatientStatusFilter = 'active' | 'inactive' | 'all';

const onlyDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');

const formatCpf = (value?: string | null) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
};

const formatBrazilPhone = (value?: string | null) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const getErrorMessage = (error: unknown) => {
  const fallback = 'Erro inesperado.';
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : '';
  const details = typeof error === 'object' && error !== null && 'details' in error
    ? String((error as { details?: unknown }).details || '')
    : '';
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';
  const message = [rawMessage, details].filter(Boolean).join(' ');
  const normalized = message.toLowerCase();

  if (code === '23505' || normalized.includes('duplicate key') || normalized.includes('unique constraint')) {
    return 'Já existe um paciente cadastrado com este CPF.';
  }

  if (normalized.includes('row-level security') || normalized.includes('violates row-level security')) {
    return 'Sem permissão para cadastrar paciente nesta unidade. Confira a unidade responsável.';
  }

  if (normalized.includes('schema cache') || normalized.includes('could not find')) {
    return 'O banco ainda não reconhece um dos campos enviados. Atualize o schema/migrations antes de tentar novamente.';
  }

  return rawMessage || details || fallback;
};

const getPatientAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasNotHadBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());

  if (hasNotHadBirthday) age -= 1;
  return age;
};

const getLastPatientEvent = (patient?: PatientWithLegacyData | null) => {
  const events = patient?.timeline || [];
  if (events.length === 0) return null;

  return events.reduce<LegacyRecord | null>((latest, event) => {
    if (!latest) return event;
    return String(event.date || '') > String(latest.date || '') ? event : latest;
  }, null);
};

const formatPatientDate = (date?: string) => {
  if (!date) return 'Data não informada';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? 'Data não informada' : parsed.toLocaleDateString('pt-BR');
};

const PatientManager = () => {
  const { currentUser } = useAuth();
  const { 
    patients, 
    addPatient, 
    updatePatient, 
    setPatientActiveStatus, 
    loading 
  } = usePatients();
  const { 
    selectedPatientId, 
    setSelectedPatientId, 
    professionals, 
    setActivePrintData 
  } = useApp();
  const dataStatus = { loading, error: '' };

  const canManagePatientStatus = currentUser?.appRole === 'admin' || currentUser?.role === 'admin';

  const triggerPrintRx = (rx: LegacyRecord) => {
    setActivePrintData({
      type: 'rx',
      data: rx,
      patientName: selectedPatient.name,
      patientBirthDate: selectedPatient.birthDate,
      patientGender: selectedPatient.gender,
      patientPhone: selectedPatient.phone
    });
    // Dar um pequeno tempo para o DOM renderizar antes de chamar a janela de impressão
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const triggerPrintOS = (purchase: LegacyRecord, printType = 'cliente') => {
    const latestRx = patientPrescriptions && patientPrescriptions.length > 0
      ? patientPrescriptions[0]
      : null;

    setActivePrintData({
      type: 'os',
      printType,
      data: {
        ...purchase,
        patientId: selectedPatient.id
      },
      patientName: selectedPatient.name,
      patientCpf: selectedPatient.cpf,
      rx: latestRx
    });
    // Dar tempo para o DOM renderizar
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] = useState<PatientStatusFilter>('active');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('timeline'); // timeline, rx, purchases, docs

  // Formulário de novo paciente
  const [newPatient, setNewPatient] = useState({
    name: '',
    cpf: '',
    rg: '',
    birthDate: '',
    gender: 'Masculino',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    isMinor: false,
    guardian: { name: '', cpf: '', phone: '' },
    alerts: [],
    notes: ''
  });
  const [phoneIsWhatsapp, setPhoneIsWhatsapp] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [selectedNewPatientShopId, setSelectedNewPatientShopId] = useState('');

  // Formulário de receita
  const [showRxForm, setShowRxForm] = useState(false);
  const [newRx, setNewRx] = useState({
    doctor: professionals[0]?.name || '',
    longe: {
      od: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' },
      oe: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' }
    },
    perto: {
      od: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' },
      oe: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' }
    },
    adicao: '',
    lensTypes: {
      antireflexo: false,
      multifocal: false,
      fotossensivel: false,
      bluecontrol: false
    },
    lensType: '',
    notes: ''
  });

  // Formulário de Compra/OS
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    osNumber: '',
    item: '',
    value: ''
  });

  // Formulário de Alerta
  const [alertText, setAlertText] = useState('');
  const [alertType, setAlertType] = useState('clinical');

  // Formulário de Anexo (simulado)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isConfidential, setIsConfidential] = useState(false);
  const [uploading, setUploading] = useState(false);

  const currentUserShopId = currentUser?.shopId || '';
  const shouldChoosePatientShop = !currentUserShopId || currentUserShopId === 'all';
  const fixedPatientShopId = shouldChoosePatientShop ? '' : currentUserShopId;

  useEffect(() => {
    if (!shouldChoosePatientShop) {
      setSelectedNewPatientShopId(fixedPatientShopId);
      setAvailableShops([]);
      return undefined;
    }

    let cancelled = false;

    shopService.getAll()
      .then((shops) => {
        if (cancelled) return;
        const activeShops = shops.filter((shop) => shop.isActive);
        setAvailableShops(activeShops);
        setSelectedNewPatientShopId((currentShopId) => (
          activeShops.some((shop) => shop.id === currentShopId)
            ? currentShopId
            : activeShops[0]?.id || ''
        ));
      })
      .catch((error) => {
        console.error('Erro ao carregar unidades para cadastro de paciente', error);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldChoosePatientShop, fixedPatientShopId]);

  // Filtrar pacientes
  const activePatientCount = patients.filter((patient) => patient.isActive !== false).length;
  const inactivePatientCount = patients.length - activePatientCount;

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    const numericTerm = onlyDigits(term);
    const matchesSearch = (
      (p.name || '').toLowerCase().includes(term) ||
      (p.cpf || '').toLowerCase().includes(term) ||
      (numericTerm.length > 0 && onlyDigits(p.cpf).includes(numericTerm)) ||
      (p.rg || '').toLowerCase().includes(term)
    );
    const isActive = p.isActive !== false;
    const matchesStatus = patientStatusFilter === 'all'
      || (patientStatusFilter === 'active' && isActive)
      || (patientStatusFilter === 'inactive' && !isActive);

    return matchesSearch && matchesStatus;
  });

  const selectedPatientFromAll = patients.find((p) => p.id === selectedPatientId) || null;
  const selectedPatient =
    filteredPatients.find((p) => p.id === selectedPatientId) ||
    filteredPatients[0] ||
    selectedPatientFromAll ||
    null as PatientWithLegacyData | null;
  
  const [patientTimeline, setPatientTimeline] = useState<LegacyRecord[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<LegacyRecord[]>([]);
  const [patientSales, setPatientSales] = useState<LegacyRecord[]>([]);
  const [patientAttachments, setPatientAttachments] = useState<PatientAttachment[]>([]);

  const loadPatientData = useCallback(async (id: string) => {
    try {
      const timeline = await patientService.getTimelineEvents(id);
      const rx = await prescriptionService.getByPatient(id);
      const sales = await saleService.getByPatient(id);
      const atts = await attachmentService.getPatientAttachments(id);
      setPatientTimeline(timeline);
      setPatientPrescriptions(rx);
      setPatientSales(sales);
      setPatientAttachments(atts);
    } catch(e) {
      console.error(e);
    }
  }, []);

  const selectedPatientIdForData = selectedPatient?.id;

  useEffect(() => {
    if (selectedPatientIdForData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPatientData(selectedPatientIdForData);
    } else {
      setPatientTimeline([]);
      setPatientPrescriptions([]);
      setPatientSales([]);
      setPatientAttachments([]);
    }
  }, [selectedPatientIdForData, loadPatientData]);

  const selectedPatientAge = getPatientAge(selectedPatient?.birthDate);
  const selectedLastEvent = getLastPatientEvent(selectedPatient);

  const handleNewPatientPhoneChange = (value: string) => {
    const formattedPhone = formatBrazilPhone(value);
    setNewPatient((current) => ({
      ...current,
      phone: formattedPhone,
      whatsapp: phoneIsWhatsapp ? formattedPhone : current.whatsapp
    }));
  };

  const handlePhoneIsWhatsappChange = (checked: boolean) => {
    setPhoneIsWhatsapp(checked);
    setNewPatient((current) => ({
      ...current,
      whatsapp: checked ? current.phone : current.whatsapp
    }));
  };

  const handleCreatePatient = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cpfDigits = onlyDigits(newPatient.cpf);
    const targetShopId = shouldChoosePatientShop ? selectedNewPatientShopId : fixedPatientShopId;

    if (!newPatient.name.trim() || !newPatient.birthDate) {
      alert('Nome e data de nascimento são obrigatórios.');
      return;
    }

    if (cpfDigits.length !== 11) {
      alert('Informe o CPF com 11 números no formato 000.000.000-00.');
      return;
    }

    if (!targetShopId) {
      alert('Selecione a unidade responsável pelo cadastro do paciente.');
      return;
    }

    if (newPatient.isMinor && !newPatient.guardian.name.trim()) {
      alert('Informe o nome do responsável legal.');
      return;
    }

    const patientPayload = {
      ...newPatient,
      name: newPatient.name.trim(),
      cpf: formatCpf(newPatient.cpf),
      phone: formatBrazilPhone(newPatient.phone),
      whatsapp: phoneIsWhatsapp
        ? formatBrazilPhone(newPatient.phone)
        : formatBrazilPhone(newPatient.whatsapp),
      guardian: {
        ...newPatient.guardian,
        name: newPatient.guardian.name.trim(),
        cpf: formatCpf(newPatient.guardian.cpf),
        phone: formatBrazilPhone(newPatient.guardian.phone)
      },
      shop_id: targetShopId
    };

    try {
      setSavingPatient(true);
      const created = await addPatient(patientPayload);
      setSelectedPatientId(created.id);
      setShowAddForm(false);
      // Reset form
      setNewPatient({
        name: '',
        cpf: '',
        rg: '',
        birthDate: '',
        gender: 'Masculino',
        phone: '',
        whatsapp: '',
        email: '',
        address: '',
        isMinor: false,
        guardian: { name: '', cpf: '', phone: '' },
        alerts: [],
        notes: ''
      });
      setPhoneIsWhatsapp(false);
    } catch (error) {
      alert(`Não foi possível salvar o paciente: ${getErrorMessage(error)}`);
    } finally {
      setSavingPatient(false);
    }
  };

  const handleAddAlert = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!alertText.trim() || !selectedPatient) return;

    const newAlertObj = {
      id: `a-${uuidv4()}`,
      type: alertType,
      text: alertText,
      color: alertType === 'clinical' ? '#ef4444' : '#f59e0b'
    };

    const updated = {
      ...selectedPatient,
      alerts: [...(selectedPatient.alerts || []), newAlertObj],
      timeline: [
        {
          id: `t-${uuidv4()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'system',
          title: `Alerta Adicionado (${alertType === 'clinical' ? 'Clínico' : 'Adm'})`,
          desc: alertText
        },
        ...patientTimeline
      ]
    };

    updatePatient(updated);
    setAlertText('');
  };

  const handleRemoveAlert = (alertId: string) => {
    if (!selectedPatient) return;
    const updated = {
      ...selectedPatient,
      alerts: (selectedPatient.alerts || []).filter((a) => a.id !== alertId)
    };
    updatePatient(updated);
  };

  const handleAddRx = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await prescriptionService.create({
        patientId: selectedPatient.id,
        professionalId: professionals.find(p => p.name === newRx.doctor)?.id || null,
        date: new Date().toISOString().split('T')[0],
        notes: newRx.notes,
        shop_id: selectedPatient.shop_id
      });
      await patientService.addTimelineEvent({
        patientId: selectedPatient.id,
        type: 'prescription',
        title: 'Receita Oftalmológica Emitida',
        description: `Emitida por Dr(a). ${newRx.doctor}.`,
        shop_id: selectedPatient.shop_id,
        date: new Date().toISOString().split('T')[0]
      });
      loadPatientData(selectedPatient.id);
      
      setShowRxForm(false);
      setNewRx({
        doctor: professionals[0]?.name || '',
        longe: {
          od: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' },
          oe: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' }
        },
        perto: {
          od: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' },
          oe: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' }
        },
        adicao: '',
        lensTypes: {
          antireflexo: false,
          multifocal: false,
          fotossensivel: false,
          bluecontrol: false
        },
        lensType: '',
        notes: ''
      });
    } catch(e) { console.error(e); }
  };

  const handleAddPurchase = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient || !newPurchase.item || !newPurchase.value) return;
    
    try {
      const sale = await saleService.createSaleWithItems({
        patientId: selectedPatient.id,
        professionalId: currentUser?.id,
        date: new Date().toISOString().split('T')[0],
        totalAmount: parseFloat(newPurchase.value),
        shop_id: selectedPatient.shop_id
      }, [{
        type: 'service',
        description: newPurchase.item,
        quantity: 1,
        unitPrice: parseFloat(newPurchase.value),
        totalPrice: parseFloat(newPurchase.value),
        shop_id: selectedPatient.shop_id
      }]);
      
      await saleService.createOpticalOrder({
        saleId: sale.id,
        patientId: selectedPatient.id,
        status: 'producao',
        notes: newPurchase.osNumber || `OS-${uuidv4().substring(0, 8)}`,
        shop_id: selectedPatient.shop_id
      });
      
      await patientService.addTimelineEvent({
        patientId: selectedPatient.id,
        type: 'purchase',
        title: `Nova Venda/OS criada`,
        description: `Item: ${newPurchase.item} - Valor: R$ ${parseFloat(newPurchase.value).toFixed(2)}.`,
        shop_id: selectedPatient.shop_id,
        date: new Date().toISOString().split('T')[0]
      });
      loadPatientData(selectedPatient.id);
      
      setShowPurchaseForm(false);
      setNewPurchase({ osNumber: '', item: '', value: '' });
    } catch(e) { console.error(e); }
  };

  const handleAddAttachment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uploadFile || !selectedPatient) return;
    const attachmentShopId = selectedPatient.shop_id || currentUser?.shopId;
    if (!attachmentShopId) {
      alert('Não foi possível identificar a filial para anexar o arquivo.');
      return;
    }

    try {
      setUploading(true);
      await attachmentService.uploadAttachment(
        selectedPatient.id,
        attachmentShopId,
        uploadFile,
        isConfidential
      );
      
      // Reload attachments
      const atts = await attachmentService.getPatientAttachments(selectedPatient.id);
      setPatientAttachments(atts);
      
      setUploadFile(null);
      setIsConfidential(false);
      
      // Opcional: adicionar timeline event
      // ...
    } catch (error) {
      console.error('Error in handleAddAttachment:', error);
      alert('Erro ao fazer upload. Você tem permissão para isso?');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = async (doc: PatientAttachment) => {
    try {
      const url = await attachmentService.getSignedUrl(doc.storage_path);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Acesso Negado ou arquivo não encontrado.');
    }
  };

  const handleDeleteAttachment = async (doc: PatientAttachment) => {
    if (!confirm('Deseja excluir este anexo?')) return;
    if (!selectedPatient) return;

    try {
      await attachmentService.deleteAttachment(doc.id, doc.storage_path);
      const atts = await attachmentService.getPatientAttachments(selectedPatient.id);
      setPatientAttachments(atts);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Erro ao excluir anexo. Sem permissão?');
    }
  };

  const handlePatientStatusChange = async (patient: Patient, nextIsActive: boolean) => {
    if (!canManagePatientStatus) {
      alert('Apenas administradores podem inativar ou reativar pacientes.');
      return;
    }

    const action = nextIsActive ? 'reativar' : 'inativar';
    const message = nextIsActive
      ? `Deseja reativar ${patient.name}? O cadastro voltará a aceitar novos atendimentos.`
      : `Deseja inativar ${patient.name}? O histórico será preservado e poderá ser reativado depois.`;

    if (confirm(message)) {
      const result = await setPatientActiveStatus(patient.id, nextIsActive);

      if (result?.success) {
        setSelectedPatientId(null);
      } else {
        alert(result?.error || `Não foi possível ${action} o paciente.`);
      }
    }
  };

  const handleStatusFilterChange = (status: PatientStatusFilter) => {
    setPatientStatusFilter(status);
    setSelectedPatientId(null);
    setShowAddForm(false);
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Clínica"
        title="Pacientes"
        description="Consulte prontuários, acompanhe históricos e gerencie pacientes ativos e inativos."
        meta={`${activePatientCount} ativos · ${inactivePatientCount} inativos`}
        actions={(
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <UserPlus size={17} /> Novo paciente
          </button>
        )}
      />

      <div className="patient-workspace">
      {/* Coluna Esquerda: Lista de Pacientes e Busca */}
      <aside className="patient-list-pane">
        <div className="card patient-list-card">
          <div className="patient-list-toolbar">
            <div>
              <span className="patient-eyebrow">Pacientes</span>
              <h2>Prontuários</h2>
            </div>
          </div>

          <div className="patient-search-box">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar nome, CPF ou RG"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={17} />
          </div>

          <div className="patient-status-tabs" aria-label="Filtrar pacientes por status">
            <button
              type="button"
              className={patientStatusFilter === 'active' ? 'active' : ''}
              onClick={() => handleStatusFilterChange('active')}
              aria-pressed={patientStatusFilter === 'active'}
            >
              Ativos <span>{activePatientCount}</span>
            </button>
            <button
              type="button"
              className={patientStatusFilter === 'inactive' ? 'active' : ''}
              onClick={() => handleStatusFilterChange('inactive')}
              aria-pressed={patientStatusFilter === 'inactive'}
            >
              Inativos <span>{inactivePatientCount}</span>
            </button>
            <button
              type="button"
              className={patientStatusFilter === 'all' ? 'active' : ''}
              onClick={() => handleStatusFilterChange('all')}
              aria-pressed={patientStatusFilter === 'all'}
            >
              Todos <span>{patients.length}</span>
            </button>
          </div>

          <div className="patient-list-summary">
            <span>
              {dataStatus?.loading
                ? 'Sincronizando dados…'
                : `${filteredPatients.length} ${filteredPatients.length === 1 ? 'resultado' : 'resultados'}`}
            </span>
            {searchTerm && <button type="button" onClick={() => setSearchTerm('')}>Limpar busca</button>}
          </div>

          <div className="patient-list-scroll">
            {dataStatus?.error && (
              <StatePanel
                type="error"
                title="Falha na sincronização"
                description={dataStatus.error}
                compact
              />
            )}
            {dataStatus?.loading ? (
              <StatePanel
                type="loading"
                title="Carregando pacientes"
                description="Sincronizando os cadastros desta filial."
                compact
              />
            ) : filteredPatients.length === 0 ? (
              <StatePanel
                type={searchTerm ? 'search' : 'empty'}
                title={searchTerm
                  ? 'Nenhum paciente corresponde à busca'
                  : patientStatusFilter === 'inactive'
                    ? 'Nenhum paciente inativo'
                    : 'Nenhum paciente cadastrado'}
                description={searchTerm
                  ? 'Confira o nome, CPF ou RG informado.'
                  : 'Use o botão “Novo paciente” para iniciar um cadastro.'}
                action={searchTerm ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearchTerm('')}>
                    Limpar busca
                  </button>
                ) : null}
                compact
              />
            ) : (
              filteredPatients.map((patient) => {
                const age = getPatientAge(patient.birthDate);
                const lastEvent = getLastPatientEvent(patient);
                const isSelected = selectedPatient?.id === patient.id && !showAddForm;

                return (
                  <button
                    type="button"
                    key={patient.id}
                    className={`patient-list-item ${isSelected ? 'active' : ''} ${patient.isActive === false ? 'inactive' : ''}`}
                    onClick={() => {
                      setSelectedPatientId(patient.id);
                      setShowAddForm(false);
                    }}
                  >
                    <span className="patient-list-copy">
                      <span className="patient-list-name-row">
                        <strong>{patient.name}</strong>
                        {patient.isMinor && <span className="patient-minor-badge">Menor</span>}
                        {patient.isActive === false && <span className="patient-inactive-badge">Inativo</span>}
                      </span>
                      <span className="patient-list-meta">
                        {age !== null ? `${age} anos` : 'Idade não informada'}
                        <span aria-hidden="true">•</span>
                        {patient.phone || 'Sem telefone'}
                      </span>
                      <span className="patient-list-last-event">
                        <Clock size={12} />
                        {lastEvent
                          ? `${lastEvent.title} · ${formatPatientDate(lastEvent.date)}`
                          : 'Sem atendimentos registrados'}
                      </span>
                    </span>
                    {patient.alerts && patient.alerts.length > 0 && (
                      <span className="patient-list-alert" title={`${patient.alerts.length} alerta(s) ativo(s)`}>
                        <AlertTriangle size={13} /> {patient.alerts.length}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Coluna Direita: Detalhes ou Formulário de Cadastro */}
      <section className="patient-detail-pane">
        {showAddForm ? (
          /* Formulário de Novo Paciente */
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <UserPlus size={20} color="var(--primary)" /> Novo Cadastro
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>
                Cancelar
              </button>
            </div>

            <form onSubmit={handleCreatePatient}>
              {shouldChoosePatientShop ? (
                <div className="form-group">
                  <label htmlFor="patient-shop">Unidade responsável*</label>
                  <select
                    id="patient-shop"
                    className="form-control"
                    required
                    value={selectedNewPatientShopId}
                    onChange={(e) => setSelectedNewPatientShopId(e.target.value)}
                  >
                    {availableShops.length === 0 ? (
                      <option value="">Nenhuma unidade ativa encontrada</option>
                    ) : (
                      availableShops.map((shop) => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))
                    )}
                  </select>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    Como administrador, você está na visão consolidada. Por isso o paciente precisa ser vinculado a uma unidade real.
                  </small>
                </div>
              ) : (
                <div className="form-group">
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Unidade do cadastro
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    value={getShopDisplayName(currentUser?.shopId, currentUser?.shopName)}
                    disabled
                    style={{ backgroundColor: 'var(--bg-primary)', cursor: 'not-allowed' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Nome Completo*</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Data de Nascimento*</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={newPatient.birthDate}
                    onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Sexo</label>
                  <select
                    className="form-control"
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  >
                    <option>Masculino</option>
                    <option>Feminino</option>
                    <option>Outro</option>
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="patient-cpf">CPF*</label>
                  <input
                    id="patient-cpf"
                    type="text"
                    className="form-control"
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                    required
                    aria-describedby="patient-cpf-help"
                    value={newPatient.cpf}
                    onChange={(e) => setNewPatient({ ...newPatient, cpf: formatCpf(e.target.value) })}
                  />
                  <small id="patient-cpf-help" style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    O sistema aceita 11 números e formata automaticamente.
                  </small>
                </div>
                <div className="form-group">
                  <label>RG</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newPatient.rg}
                    onChange={(e) => setNewPatient({ ...newPatient, rg: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="(xx) xxxxx-xxxx"
                    inputMode="tel"
                    maxLength={15}
                    value={newPatient.phone}
                    onChange={(e) => handleNewPatientPhoneChange(e.target.value)}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontWeight: 500, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={phoneIsWhatsapp}
                      onChange={(e) => handlePhoneIsWhatsappChange(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Este número também é WhatsApp
                  </label>
                </div>
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="(xx) xxxxx-xxxx"
                    inputMode="tel"
                    maxLength={15}
                    value={newPatient.whatsapp}
                    onChange={(e) => setNewPatient({ ...newPatient, whatsapp: formatBrazilPhone(e.target.value) })}
                    disabled={phoneIsWhatsapp}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="email"
                  className="form-control"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Endereço</label>
                <input
                  type="text"
                  className="form-control"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0' }}>
                <input
                  type="checkbox"
                  id="chkMinor"
                  checked={newPatient.isMinor}
                  onChange={(e) => setNewPatient({ ...newPatient, isMinor: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="chkMinor" style={{ margin: 0, cursor: 'pointer' }}>
                  Este paciente é menor de idade (requer responsável)
                </label>
              </div>

              {newPatient.isMinor && (
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Dados do Responsável Legal</h4>
                  <div className="form-group">
                    <label>Nome do Responsável*</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newPatient.guardian.name}
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          guardian: { ...newPatient.guardian, name: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>CPF do Responsável</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                        maxLength={14}
                        value={newPatient.guardian.cpf}
                        onChange={(e) =>
                          setNewPatient({
                            ...newPatient,
                            guardian: { ...newPatient.guardian, cpf: formatCpf(e.target.value) }
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Telefone do Responsável</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="(xx) xxxxx-xxxx"
                        inputMode="tel"
                        maxLength={15}
                        value={newPatient.guardian.phone}
                        onChange={(e) =>
                          setNewPatient({
                            ...newPatient,
                            guardian: { ...newPatient.guardian, phone: formatBrazilPhone(e.target.value) }
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Observações Clínicas / Internas</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={newPatient.notes}
                  onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={savingPatient || (shouldChoosePatientShop && !selectedNewPatientShopId)}
              >
                {savingPatient ? 'Salvando cadastro...' : 'Salvar Cadastro'}
              </button>
            </form>
          </div>
        ) : selectedPatient ? (
          /* Visualização de Detalhes do Paciente */
          <div>
            <div className="card patient-detail-card">
              <div className="patient-detail-header">
                <div className="patient-detail-identity">
                  <span className="patient-eyebrow">Prontuário do paciente</span>
                  <h2>{selectedPatient.name}</h2>
                  <div className="patient-detail-tags">
                    {selectedPatientAge !== null && <span>{selectedPatientAge} anos</span>}
                    {selectedPatient.gender && <span>{selectedPatient.gender}</span>}
                    {selectedPatient.isMinor && <StatusBadge status="encaixe" label="Menor de idade" />}
                    {selectedPatient.isActive === false && <StatusBadge status="inativo" label="Paciente inativo" />}
                  </div>
                  <p>
                    {selectedLastEvent
                      ? `Último registro: ${selectedLastEvent.title} em ${formatPatientDate(selectedLastEvent.date)}`
                      : 'Ainda não há atendimentos registrados neste prontuário.'}
                  </p>
                </div>
                {canManagePatientStatus && (
                  <button
                    onClick={() => handlePatientStatusChange(selectedPatient, selectedPatient.isActive === false)}
                    className={`patient-status-button ${selectedPatient.isActive === false ? 'reactivate' : 'deactivate'}`}
                    title={selectedPatient.isActive === false ? 'Reativar Paciente' : 'Inativar Paciente'}
                    aria-label={`${selectedPatient.isActive === false ? 'Reativar' : 'Inativar'} ${selectedPatient.name}`}
                    data-testid="patient-status-button"
                  >
                    {selectedPatient.isActive === false ? <RotateCcw size={15} /> : <UserX size={15} />}
                    <span>{selectedPatient.isActive === false ? 'Reativar' : 'Inativar'}</span>
                  </button>
                )}
              </div>

              {/* Grid de Informações Cadastrais */}
              <div className="patient-info-grid">
                <div className="patient-info-item">
                  <span><Calendar size={13} /> Nascimento</span>
                  <strong>{formatPatientDate(selectedPatient.birthDate)}</strong>
                </div>
                <div className="patient-info-item">
                  <span>CPF</span>
                  <strong>{selectedPatient.cpf || 'Não informado'}</strong>
                </div>
                <div className="patient-info-item">
                  <span>RG</span>
                  <strong>{selectedPatient.rg || 'Não informado'}</strong>
                </div>
                <div className="patient-info-item">
                  <span><Phone size={13} /> Telefone</span>
                  <strong>{selectedPatient.phone || 'Não informado'}</strong>
                </div>
                <div className="patient-info-item">
                  <span>WhatsApp</span>
                  <strong>{selectedPatient.whatsapp || 'Não informado'}</strong>
                </div>
                <div className="patient-info-item">
                  <span>E-mail</span>
                  <strong>{selectedPatient.email || 'Não informado'}</strong>
                </div>
                <div className="patient-info-item patient-info-wide">
                  <span>Endereço</span>
                  <strong>{selectedPatient.address || 'Não informado'}</strong>
                </div>
              </div>

              {/* Informações do Responsável (se houver) */}
              {selectedPatient.isMinor && (
                <div
                  style={{
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    marginBottom: '20px'
                  }}
                >
                  <strong style={{ color: '#0369a1' }}>Responsável Legal:</strong> {selectedPatient.guardian?.name} <br />
                  <span>CPF: {selectedPatient.guardian?.cpf} | Telefone: {selectedPatient.guardian?.phone}</span>
                </div>
              )}

              {/* Gerenciamento de Alertas */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Alertas Clínicos & Administrativos</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {selectedPatient.alerts && selectedPatient.alerts.length > 0 ? (
                    selectedPatient.alerts.map((a) => (
                      <span
                        key={a.id}
                        style={{
                          backgroundColor: a.type === 'clinical' ? 'var(--status-cancelado)' : 'var(--status-falta)',
                          color: a.type === 'clinical' ? 'var(--status-cancelado-text)' : 'var(--status-falta-text)',
                          border: `1px solid var(--border-color)`,
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <AlertTriangle size={12} />
                        {a.text}
                        <button
                          type="button"
                          onClick={() => handleRemoveAlert(a.id)}
                          aria-label={`Remover alerta: ${a.text}`}
                          style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <StatePanel
                      type="empty"
                      title="Nenhum alerta neste prontuário"
                      description="Alertas clínicos ou administrativos aparecerão aqui."
                      compact
                    />
                  )}
                </div>

                <form onSubmit={handleAddAlert} style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-control"
                    style={{ width: '120px', padding: '6px' }}
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value)}
                    aria-label="Tipo de alerta"
                  >
                    <option value="clinical">Clínico</option>
                    <option value="administrative">Adm</option>
                  </select>
                  <input
                    type="text"
                    className="form-control"
                    style={{ padding: '6px' }}
                    placeholder="Adicionar aviso rápido..."
                    value={alertText}
                    onChange={(e) => setAlertText(e.target.value)}
                    aria-label="Texto do novo alerta"
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '8px 12px' }} aria-label="Adicionar alerta ao prontuário">
                    <Plus size={16} />
                  </button>
                </form>
              </div>

              {/* Sub-Navegação interna (Abas do Prontuário) */}
              <div className="tab-container" style={{ marginBottom: '16px' }} role="group" aria-label="Seções do prontuário">
                <button type="button" aria-pressed={activeSubTab === 'timeline'} className={`tab-btn ${activeSubTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveSubTab('timeline')}>
                  Linha do Tempo
                </button>
                <button type="button" aria-pressed={activeSubTab === 'rx'} className={`tab-btn ${activeSubTab === 'rx' ? 'active' : ''}`} onClick={() => setActiveSubTab('rx')}>
                  Receitas ({patientPrescriptions?.length || 0})
                </button>
                <button type="button" aria-pressed={activeSubTab === 'purchases'} className={`tab-btn ${activeSubTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveSubTab('purchases')}>
                  Compras / OS ({patientSales?.length || 0})
                </button>
                <button type="button" aria-pressed={activeSubTab === 'clinical'} className={`tab-btn ${activeSubTab === 'clinical' ? 'active' : ''}`} onClick={() => setActiveSubTab('clinical')}>
                  Prontuário Clínico
                </button>
                <button type="button" aria-pressed={activeSubTab === 'docs'} className={`tab-btn ${activeSubTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveSubTab('docs')}>
                  Documentos ({selectedPatient.attachments?.length || 0})
                </button>
              </div>

              {/* Conteúdo das Abas */}
              {activeSubTab === 'clinical' && (
                <ClinicalRecordTab patientId={selectedPatient.id} />
              )}
              {activeSubTab === 'timeline' && (
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Linha do Tempo do Paciente</h4>
                  <div className="timeline-list">
                    {patientTimeline && patientTimeline.length > 0 ? (
                      patientTimeline.map((node) => (
                        <div key={node.id} className="timeline-node">
                          <div className={`timeline-dot ${node.type}`}></div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-title">{node.title}</span>
                              <span className="timeline-date">{formatPatientDate(node.date)}</span>
                            </div>
                            <p className="timeline-desc">{node.desc}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sem eventos registrados na linha do tempo.</p>
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'rx' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '15px', margin: 0 }}>Histórico de Receitas</h4>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowRxForm(!showRxForm)}>
                      {showRxForm ? 'Fechar' : 'Emitir Receita'}
                    </button>
                  </div>

                  {showRxForm && (
                    <form onSubmit={handleAddRx} style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', backgroundColor: 'var(--bg-primary)' }}>
                      <div className="form-group">
                        <label>Profissional Emissor*</label>
                        <select
                          className="form-control"
                          value={newRx.doctor}
                          onChange={(e) => setNewRx({ ...newRx, doctor: e.target.value })}
                        >
                          {professionals.map((prof) => (
                            <option key={prof.id} value={prof.name}>{prof.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Grau Longe */}
                      <h5 style={{ fontSize: '13px', margin: '14px 0 6px', color: 'var(--primary)', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>Grau para Longe</h5>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0', overflowX: 'auto' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', width: '30px', flexShrink: 0 }}>OD</span>
                        <input type="text" placeholder="Esférico" className="form-control" style={{ padding: '6px' }} value={newRx.longe.od.esferico} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, od: { ...newRx.longe.od, esferico: e.target.value } } })} />
                        <input type="text" placeholder="Cilíndrico" className="form-control" style={{ padding: '6px' }} value={newRx.longe.od.cilindrico} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, od: { ...newRx.longe.od, cilindrico: e.target.value } } })} />
                        <input type="text" placeholder="Eixo (°)" className="form-control" style={{ padding: '6px' }} value={newRx.longe.od.eixo} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, od: { ...newRx.longe.od, eixo: e.target.value } } })} />
                        <input type="text" placeholder="DNP" className="form-control" style={{ padding: '6px' }} value={newRx.longe.od.dnp} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, od: { ...newRx.longe.od, dnp: e.target.value } } })} />
                        <input type="text" placeholder="AV" className="form-control" style={{ padding: '6px' }} value={newRx.longe.od.av} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, od: { ...newRx.longe.od, av: e.target.value } } })} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0 16px', overflowX: 'auto' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', width: '30px', flexShrink: 0 }}>OE</span>
                        <input type="text" placeholder="Esférico" className="form-control" style={{ padding: '6px' }} value={newRx.longe.oe.esferico} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, oe: { ...newRx.longe.oe, esferico: e.target.value } } })} />
                        <input type="text" placeholder="Cilíndrico" className="form-control" style={{ padding: '6px' }} value={newRx.longe.oe.cilindrico} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, oe: { ...newRx.longe.oe, cilindrico: e.target.value } } })} />
                        <input type="text" placeholder="Eixo (°)" className="form-control" style={{ padding: '6px' }} value={newRx.longe.oe.eixo} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, oe: { ...newRx.longe.oe, eixo: e.target.value } } })} />
                        <input type="text" placeholder="DNP" className="form-control" style={{ padding: '6px' }} value={newRx.longe.oe.dnp} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, oe: { ...newRx.longe.oe, dnp: e.target.value } } })} />
                        <input type="text" placeholder="AV" className="form-control" style={{ padding: '6px' }} value={newRx.longe.oe.av} onChange={(e) => setNewRx({ ...newRx, longe: { ...newRx.longe, oe: { ...newRx.longe.oe, av: e.target.value } } })} />
                      </div>

                      {/* Grau Perto */}
                      <h5 style={{ fontSize: '13px', margin: '14px 0 6px', color: 'var(--primary)', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>Grau para Perto</h5>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0', overflowX: 'auto' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', width: '30px', flexShrink: 0 }}>OD</span>
                        <input type="text" placeholder="Esférico" className="form-control" style={{ padding: '6px' }} value={newRx.perto.od.esferico} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, od: { ...newRx.perto.od, esferico: e.target.value } } })} />
                        <input type="text" placeholder="Cilíndrico" className="form-control" style={{ padding: '6px' }} value={newRx.perto.od.cilindrico} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, od: { ...newRx.perto.od, cilindrico: e.target.value } } })} />
                        <input type="text" placeholder="Eixo (°)" className="form-control" style={{ padding: '6px' }} value={newRx.perto.od.eixo} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, od: { ...newRx.perto.od, eixo: e.target.value } } })} />
                        <input type="text" placeholder="DNP" className="form-control" style={{ padding: '6px' }} value={newRx.perto.od.dnp} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, od: { ...newRx.perto.od, dnp: e.target.value } } })} />
                        <input type="text" placeholder="AV" className="form-control" style={{ padding: '6px' }} value={newRx.perto.od.av} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, od: { ...newRx.perto.od, av: e.target.value } } })} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0 16px', overflowX: 'auto' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', width: '30px', flexShrink: 0 }}>OE</span>
                        <input type="text" placeholder="Esférico" className="form-control" style={{ padding: '6px' }} value={newRx.perto.oe.esferico} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, oe: { ...newRx.perto.oe, esferico: e.target.value } } })} />
                        <input type="text" placeholder="Cilíndrico" className="form-control" style={{ padding: '6px' }} value={newRx.perto.oe.cilindrico} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, oe: { ...newRx.perto.oe, cilindrico: e.target.value } } })} />
                        <input type="text" placeholder="Eixo (°)" className="form-control" style={{ padding: '6px' }} value={newRx.perto.oe.eixo} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, oe: { ...newRx.perto.oe, eixo: e.target.value } } })} />
                        <input type="text" placeholder="DNP" className="form-control" style={{ padding: '6px' }} value={newRx.perto.oe.dnp} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, oe: { ...newRx.perto.oe, dnp: e.target.value } } })} />
                        <input type="text" placeholder="AV" className="form-control" style={{ padding: '6px' }} value={newRx.perto.oe.av} onChange={(e) => setNewRx({ ...newRx, perto: { ...newRx.perto, oe: { ...newRx.perto.oe, av: e.target.value } } })} />
                      </div>

                      {/* Adição */}
                      <div className="form-group">
                        <label>Adição</label>
                        <input type="text" placeholder="Ex: +1.50" className="form-control" value={newRx.adicao} onChange={(e) => setNewRx({ ...newRx, adicao: e.target.value })} />
                      </div>

                      {/* Tipo de Lente Checkboxes */}
                      <div className="form-group">
                        <label>Opções de Filtros / Lente</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', padding: '6px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'normal', cursor: 'pointer', margin: 0 }}>
                            <input type="checkbox" checked={newRx.lensTypes.antireflexo} onChange={(e) => setNewRx({ ...newRx, lensTypes: { ...newRx.lensTypes, antireflexo: e.target.checked } })} />
                            Antirreflexo
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'normal', cursor: 'pointer', margin: 0 }}>
                            <input type="checkbox" checked={newRx.lensTypes.multifocal} onChange={(e) => setNewRx({ ...newRx, lensTypes: { ...newRx.lensTypes, multifocal: e.target.checked } })} />
                            Multifocal
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'normal', cursor: 'pointer', margin: 0 }}>
                            <input type="checkbox" checked={newRx.lensTypes.fotossensivel} onChange={(e) => setNewRx({ ...newRx, lensTypes: { ...newRx.lensTypes, fotossensivel: e.target.checked } })} />
                            Fotossensível
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'normal', cursor: 'pointer', margin: 0 }}>
                            <input type="checkbox" checked={newRx.lensTypes.bluecontrol} onChange={(e) => setNewRx({ ...newRx, lensTypes: { ...newRx.lensTypes, bluecontrol: e.target.checked } })} />
                            Bluecontrol
                          </label>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Sugestão de Lente / Outros</label>
                        <input type="text" placeholder="Ex: Crizal Sapphire" className="form-control" value={newRx.lensType} onChange={(e) => setNewRx({ ...newRx, lensType: e.target.value })} />
                      </div>

                      <div className="form-group">
                        <label>Notas / Observações</label>
                        <input type="text" placeholder="Ex: Uso constante para leitura" className="form-control" value={newRx.notes} onChange={(e) => setNewRx({ ...newRx, notes: e.target.value })} />
                      </div>

                      <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                        Gravar e Emitir Receita
                      </button>
                    </form>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {patientPrescriptions && patientPrescriptions.length > 0 ? (
                      patientPrescriptions.map((rx) => (
                        <div key={rx.id} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', alignItems: 'center' }}>
                            <strong>Dr(a). {rx.doctor}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{formatPatientDate(rx.date)}</span>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                                onClick={() => triggerPrintRx(rx)}
                              >
                                Imprimir
                              </button>
                            </div>
                          </div>
                          
                          {/* Longe Table */}
                          <div style={{ fontSize: '11px', fontWeight: 'bold', margin: '4px 0 2px', color: 'var(--primary)' }}>LONGE</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8px', textAlign: 'center' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                                <th style={{ padding: '4px' }}>Olho</th>
                                <th style={{ padding: '4px' }}>Esférico</th>
                                <th style={{ padding: '4px' }}>Cilíndrico</th>
                                <th style={{ padding: '4px' }}>Eixo</th>
                                <th style={{ padding: '4px' }}>DNP</th>
                                <th style={{ padding: '4px' }}>AV</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '4px' }}><strong>OD</strong></td>
                                <td>{((rx.longe?.od || rx.od)?.esferico) || 'Plano'}</td>
                                <td>{((rx.longe?.od || rx.od)?.cilindrico) || '-'}</td>
                                <td>{((rx.longe?.od || rx.od)?.eixo) ? `${(rx.longe?.od || rx.od).eixo}°` : '-'}</td>
                                <td>{((rx.longe?.od || rx.od)?.dnp) ? `${(rx.longe?.od || rx.od).dnp} mm` : '-'}</td>
                                <td>{((rx.longe?.od || rx.od)?.av) || '-'}</td>
                              </tr>
                              <tr>
                                <td style={{ padding: '4px' }}><strong>OE</strong></td>
                                <td>{((rx.longe?.oe || rx.oe)?.esferico) || 'Plano'}</td>
                                <td>{((rx.longe?.oe || rx.oe)?.cilindrico) || '-'}</td>
                                <td>{((rx.longe?.oe || rx.oe)?.eixo) ? `${(rx.longe?.oe || rx.oe).eixo}°` : '-'}</td>
                                <td>{((rx.longe?.oe || rx.oe)?.dnp) ? `${(rx.longe?.oe || rx.oe).dnp} mm` : '-'}</td>
                                <td>{((rx.longe?.oe || rx.oe)?.av) || '-'}</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Perto Table */}
                          {rx.perto && (rx.perto.od?.esferico || rx.perto.oe?.esferico) && (
                            <>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', margin: '4px 0 2px', color: 'var(--primary)' }}>PERTO</div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8px', textAlign: 'center' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                                    <th style={{ padding: '4px' }}>Olho</th>
                                    <th style={{ padding: '4px' }}>Esférico</th>
                                    <th style={{ padding: '4px' }}>Cilíndrico</th>
                                    <th style={{ padding: '4px' }}>Eixo</th>
                                    <th style={{ padding: '4px' }}>DNP</th>
                                    <th style={{ padding: '4px' }}>AV</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '4px' }}><strong>OD</strong></td>
                                    <td>{rx.perto.od.esferico || 'Plano'}</td>
                                    <td>{rx.perto.od.cilindrico || '-'}</td>
                                    <td>{rx.perto.od.eixo ? `${rx.perto.od.eixo}°` : '-'}</td>
                                    <td>{rx.perto.od.dnp ? `${rx.perto.od.dnp} mm` : '-'}</td>
                                    <td>{rx.perto.od.av || '-'}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '4px' }}><strong>OE</strong></td>
                                    <td>{rx.perto.oe.esferico || 'Plano'}</td>
                                    <td>{rx.perto.oe.cilindrico || '-'}</td>
                                    <td>{rx.perto.oe.eixo ? `${rx.perto.oe.eixo}°` : '-'}</td>
                                    <td>{rx.perto.oe.dnp ? `${rx.perto.oe.dnp} mm` : '-'}</td>
                                    <td>{rx.perto.oe.av || '-'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </>
                          )}

                          {/* Adição e Tipo Lente */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', margin: '8px 0', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                            {(rx.adicao || rx.od?.adicao || rx.oe?.adicao) && (
                              <span><strong>Adição:</strong> {rx.adicao || rx.od?.adicao || rx.oe?.adicao}</span>
                            )}
                            {(() => {
                              const types = [];
                              if (rx.lensTypes?.antireflexo) types.push('Antirreflexo');
                              if (rx.lensTypes?.multifocal) types.push('Multifocal');
                              if (rx.lensTypes?.fotossensivel) types.push('Fotossensível');
                              if (rx.lensTypes?.bluecontrol) types.push('Bluecontrol');
                              return types.length > 0 ? (
                                <span><strong>Filtros/Tipo:</strong> {types.join(', ')}</span>
                              ) : null;
                            })()}
                          </div>
                          {rx.lensType && <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Sugestão de Lente:</strong> {rx.lensType}</p>}
                          {rx.notes && <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)', margin: '4px 0' }}>"{rx.notes}"</p>}
                        </div>
                      ))
                    ) : (
                      <StatePanel
                        type="empty"
                        title="Nenhuma receita emitida"
                        description="As prescrições do paciente aparecerão aqui."
                        compact
                      />
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'purchases' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '15px', margin: 0 }}>Ordens de Serviço e Compras</h4>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowPurchaseForm(!showPurchaseForm)}>
                      {showPurchaseForm ? 'Fechar' : 'Nova Compra / OS'}
                    </button>
                  </div>

                  {showPurchaseForm && (
                    <form onSubmit={handleAddPurchase} style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', backgroundColor: 'var(--bg-primary)' }}>
                      <div className="form-group">
                        <label>Nº da Ordem de Serviço (Deixe em branco para autogerar)</label>
                        <input type="text" placeholder="Ex: OS-1045" className="form-control" value={newPurchase.osNumber} onChange={(e) => setNewPurchase({ ...newPurchase, osNumber: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Descrição dos Itens*</label>
                        <input type="text" placeholder="Ex: Armação Mormaii + Lente Multifocal" className="form-control" required value={newPurchase.item} onChange={(e) => setNewPurchase({ ...newPurchase, item: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Valor Total (R$)*</label>
                        <input type="number" step="0.01" className="form-control" required value={newPurchase.value} onChange={(e) => setNewPurchase({ ...newPurchase, value: e.target.value })} />
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                        Lançar Compra / Abrir OS
                      </button>
                    </form>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {patientSales && patientSales.length > 0 ? (
                      patientSales.map((pur) => (
                        <div key={pur.id} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '14px' }}>{pur.osNumber}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatPatientDate(pur.date)}</span>
                            </div>
                            <p style={{ fontSize: '13px', margin: '4px 0' }}>{pur.item}</p>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-title)' }}>R$ {parseFloat(pur.value).toFixed(2)}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                            <StatusBadge status={pur.status} />
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <select
                                value={pur.status}
                                onChange={async (e) => {
                                  try {
                                    await saleService.updateSaleStatus(pur.id, e.target.value);
                                    loadPatientData(selectedPatient.id);
                                  } catch(e) { console.error(e); }
                                }}
                                className="form-control"
                                style={{ width: '130px', fontSize: '11px', padding: '4px' }}
                                aria-label={`Alterar status da OS ${pur.osNumber}`}
                              >
                                <option>Aguardando Laboratório</option>
                                <option>Em Produção</option>
                                <option>Pronto para Retirada</option>
                                <option>Entregue</option>
                                <option>Aguardando Pagamento</option>
                                <option>Cancelado</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => triggerPrintOS(pur, 'cliente')}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 6px', height: 'auto' }}
                                title="Via do Cliente"
                                aria-label={`Imprimir via do cliente da OS ${pur.osNumber}`}
                              >
                                <Printer size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerPrintOS(pur, 'laboratorio')}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 6px', height: 'auto' }}
                                title="Via do Laboratório"
                                aria-label={`Imprimir via do laboratório da OS ${pur.osNumber}`}
                              >
                                <FlaskConical size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <StatePanel
                        type="empty"
                        title="Nenhuma compra registrada"
                        description="Ordens de serviço e vendas aparecerão aqui."
                        compact
                      />
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'docs' && (
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Anexos e Documentos</h4>
                  <form onSubmit={handleAddAttachment} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                    <input
                      type="file"
                      className="form-control"
                      required
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setUploadFile(e.target.files?.[0] || null)}
                      style={{ flex: 1, minWidth: '200px' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={isConfidential} 
                        onChange={(e) => setIsConfidential(e.target.checked)} 
                      />
                      <Lock size={14} color="var(--danger)" /> Sigiloso
                    </label>
                    <button type="submit" disabled={uploading} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Paperclip size={14} /> {uploading ? 'Enviando...' : 'Anexar'}
                    </button>
                  </form>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {patientAttachments && patientAttachments.length > 0 ? (
                      patientAttachments.map((doc) => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', fontSize: '13px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {doc.is_confidential ? (
                              <span title="Sigiloso" aria-label="Documento sigiloso">
                                <Lock size={16} color="var(--danger)" />
                              </span>
                            ) : (
                              <FileText size={16} color="var(--primary)" aria-hidden="true" />
                            )}
                            <strong>{doc.name}</strong>
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '4px' }} 
                              onClick={() => handleDownloadAttachment(doc)}
                              title="Baixar Arquivo"
                            >
                              <Download size={14} />
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              style={{ padding: '4px', background: 'transparent', color: 'var(--danger)', border: 'none' }} 
                              onClick={() => handleDeleteAttachment(doc)}
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <StatePanel
                        type="empty"
                        title="Nenhum documento anexado"
                        description="Laudos e exames adicionados aparecerão aqui."
                        compact
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Estado Inicial - Nenhum Paciente Selecionado */
          <div className="card" style={{ marginBottom: 0 }}>
            <StatePanel
              type="empty"
              title="Selecione um paciente"
              description="Escolha um cadastro na lista ou crie um novo paciente."
            />
          </div>
        )}
      </section>
      </div>
    </div>
  );
};

export default PatientManager;
