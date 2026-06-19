import { createContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { getAuthUserProfile } from '../utils/authUser';
import {
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_WAITLIST,
  INITIAL_PROFESSIONALS,
  INITIAL_ROOMS
} from '../utils/mockData';

// Mapping helpers to translate between Supabase database (snake_case) and frontend (camelCase)
const mapPatientToCamel = (pat) => {
  if (!pat) return null;
  return {
    ...pat,
    birthDate: pat.birth_date ?? pat.birthDate,
    isMinor: pat.is_minor ?? pat.isMinor,
    isActive: pat.is_active ?? pat.isActive ?? true,
  };
};

const mapPatientToSnake = (pat) => {
  if (!pat) return null;
  const copy = { ...pat };
  copy.birth_date = pat.birthDate;
  copy.is_minor = pat.isMinor;
  copy.is_active = pat.isActive ?? true;
  delete copy.birthDate;
  delete copy.isMinor;
  delete copy.isActive;
  return copy;
};

const mapAppToCamel = (app) => {
  if (!app) return null;
  return {
    ...app,
    patientId: app.patient_id,
    patientName: app.patient_name,
    professionalId: app.professional_id,
    roomId: app.room_id,
    serviceId: app.service_id,
    paymentType: app.payment_type,
    isEncaixe: app.is_encaixe
  };
};

const mapAppToSnake = (app) => {
  if (!app) return null;
  return {
    id: app.id,
    patient_id: app.patientId,
    patient_name: app.patientName,
    professional_id: app.professionalId,
    room_id: app.roomId,
    service_id: app.serviceId,
    payment_type: app.paymentType,
    date: app.date,
    time: app.time,
    duration: app.duration,
    status: app.status,
    notes: app.notes,
    is_encaixe: app.isEncaixe,
    shop_id: app.shop_id
  };
};

const mapWaitToCamel = (wait) => {
  if (!wait) return null;
  return {
    ...wait,
    patientName: wait.patient_name,
    preferredDoctor: wait.preferred_doctor,
    dateAdded: wait.date_added
  };
};

const mapWaitToSnake = (wait) => {
  if (!wait) return null;
  return {
    id: wait.id,
    patient_name: wait.patientName,
    phone: wait.phone,
    preferred_doctor: wait.preferredDoctor,
    service: wait.service,
    date_added: wait.dateAdded,
    shop_id: wait.shop_id
  };
};

export const AppContext = createContext();

const readLocalData = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn(`Dados locais inválidos em ${key}; usando dados de teste.`, error);
    return fallback;
  }
};

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pia_theme') || 'light';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pia_theme', next);
      return next;
    });
  };

  // Sync theme with DOM attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);


  const [patients, setPatients] = useState(() => readLocalData('pia_demo_patients_v2', INITIAL_PATIENTS));
  const [appointments, setAppointments] = useState(() => readLocalData('pia_demo_appointments_v2', INITIAL_APPOINTMENTS));
  const [waitlist, setWaitlist] = useState(() => readLocalData('pia_demo_waitlist_v2', INITIAL_WAITLIST));
  const [dataStatus, setDataStatus] = useState({ loading: false, error: '', source: 'local' });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activePrintData, setActivePrintData] = useState(null);
  const isRemoteSession = isSupabaseConfigured && Boolean(currentUser) && !currentUser?.isDemo;

  // 1. Ouvir Sessão do Supabase (se configurado)
  useEffect(() => {
    if (isSupabaseConfigured) {
      const ensureUserMetadata = async (user) => {
        const name = user.user_metadata?.name || user.email.split('@')[0];

        if (!user.user_metadata?.name) {
          try {
            await supabase.auth.updateUser({
              data: { ...user.user_metadata, name }
            });
          } catch (err) {
            console.error('Erro ao inicializar o nome do usuário:', err);
          }
        }
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const user = session.user;
          ensureUserMetadata(user);
          setCurrentUser(getAuthUserProfile(user));
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          const user = session.user;
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            ensureUserMetadata(user);
          }
          setCurrentUser(getAuthUserProfile(user));
        } else {
          setCurrentUser(null);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // 2. Carregar dados do Supabase apenas em sessões reais.
  // No modo local, os dados de teste ficam isolados no navegador.
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      if (currentUser.isDemo || !isSupabaseConfigured) {
        setDataStatus({ loading: false, error: '', source: 'local' });
        return;
      }

      setDataStatus({ loading: true, error: '', source: 'supabase' });

      try {
        const [patientsResult, appointmentsResult, waitlistResult] = await Promise.all([
          supabase.from('patients').select('*').order('name', { ascending: true }),
          supabase.from('appointments').select('*'),
          supabase.from('waitlist').select('*')
        ]);

        const errors = [patientsResult.error, appointmentsResult.error, waitlistResult.error].filter(Boolean);

        if (!patientsResult.error) setPatients((patientsResult.data || []).map(mapPatientToCamel));
        if (!appointmentsResult.error) setAppointments((appointmentsResult.data || []).map(mapAppToCamel));
        if (!waitlistResult.error) setWaitlist((waitlistResult.data || []).map(mapWaitToCamel));

        if (errors.length > 0) {
          errors.forEach((error) => console.error('Erro ao carregar dados do Supabase:', error));
          setDataStatus({
            loading: false,
            error: 'Não foi possível ler todos os dados do Supabase. Verifique as políticas de acesso (RLS).',
            source: 'supabase'
          });
        } else {
          setDataStatus({ loading: false, error: '', source: 'supabase' });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do Supabase:', error);
        setDataStatus({
          loading: false,
          error: 'Falha de conexão com o Supabase. Você ainda pode testar pelo acesso local.',
          source: 'supabase'
        });
      }
    };
    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.isDemo || !isSupabaseConfigured) {
      localStorage.setItem('pia_demo_patients_v2', JSON.stringify(patients));
    }
  }, [patients, currentUser]);

  useEffect(() => {
    if (currentUser?.isDemo || !isSupabaseConfigured) {
      localStorage.setItem('pia_demo_appointments_v2', JSON.stringify(appointments));
    }
  }, [appointments, currentUser]);

  useEffect(() => {
    if (currentUser?.isDemo || !isSupabaseConfigured) {
      localStorage.setItem('pia_demo_waitlist_v2', JSON.stringify(waitlist));
    }
  }, [waitlist, currentUser]);



  // Auxiliares de Pacientes
  const addPatient = async (patient) => {
    const newId = `pat-${Date.now()}`;
    const newPatient = {
      ...patient,
      id: newId,
      timeline: [
        {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'system',
          title: 'Cadastro Criado',
          desc: 'Ficha cadastral do paciente inicializada no sistema.'
        }
      ],
      prescriptions: [],
      purchases: [],
      exams: [],
      attachments: [],
      isActive: true,
      shop_id: !currentUser?.shopId || currentUser?.shopId === 'all' ? 'loja-1' : currentUser.shopId
    };

    setPatients((prev) => [newPatient, ...prev]);

    if (isRemoteSession) {
      const { error } = await supabase.from('patients').insert(mapPatientToSnake(newPatient));
      if (error) console.error('Erro ao salvar paciente no Supabase:', error);
    }

    return newPatient;
  };

  const updatePatient = async (updatedPatient) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
    );

    if (isRemoteSession) {
      const { error } = await supabase
        .from('patients')
        .update(mapPatientToSnake(updatedPatient))
        .eq('id', updatedPatient.id);
      if (error) console.error('Erro ao atualizar paciente no Supabase:', error);
    }
  };

  const setPatientActiveStatus = async (id, isActive) => {
    const canManagePatientStatus = currentUser?.isDemo
      ? currentUser.role === 'admin'
      : currentUser?.appRole === 'admin';

    if (!canManagePatientStatus) {
      console.warn('Alteração de status bloqueada: apenas administradores podem inativar ou reativar pacientes.');
      return {
        success: false,
        error: 'Apenas administradores podem inativar ou reativar pacientes.'
      };
    }

    const patient = patients.find((item) => item.id === id);
    if (!patient) {
      return { success: false, error: 'Paciente não encontrado.' };
    }

    const statusEvent = {
      id: `t-status-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'system',
      title: isActive ? 'Paciente Reativado' : 'Paciente Inativado',
      desc: isActive
        ? 'O cadastro voltou a ficar disponível para novos atendimentos.'
        : 'O cadastro foi preservado, mas ficou indisponível para novos atendimentos.'
    };

    const updatedPatient = {
      ...patient,
      isActive,
      timeline: [statusEvent, ...(patient.timeline || [])]
    };

    if (isRemoteSession) {
      const { error } = await supabase
        .from('patients')
        .update({ is_active: isActive, timeline: updatedPatient.timeline })
        .eq('id', id);

      if (error) {
        console.error('Erro ao alterar status do paciente no Supabase:', error);
        return {
          success: false,
          error: 'O Supabase recusou a alteração. Execute a migração do campo is_active e verifique as permissões.'
        };
      }
    }

    setPatients((prev) => prev.map((item) => item.id === id ? updatedPatient : item));
    return { success: true, patient: updatedPatient };
  };

  // Auxiliares de Agenda
  const addAppointment = async (app) => {
    const patient = patients.find((item) => item.id === app.patientId);
    if (patient?.isActive === false) {
      console.warn('Agendamento bloqueado: o paciente está inativo.');
      return { success: false, error: 'Reative o paciente antes de criar um novo agendamento.' };
    }

    const newId = `app-${Date.now()}`;
    const newApp = {
      ...app,
      id: newId,
      status: 'confirmado',
      shop_id: !currentUser?.shopId || currentUser?.shopId === 'all' ? 'loja-1' : currentUser.shopId
    };
    
    setAppointments((prev) => [...prev, newApp]);

    // Timeline do paciente
    if (patient) {
      const serviceName = app.serviceName || 'Consulta / Exame';
      const updatedPatient = {
        ...patient,
        timeline: [
          {
            id: `t-${Date.now()}`,
            date: app.date,
            type: 'appointment',
            title: 'Agendamento Criado',
            desc: `${serviceName} agendado para o dia ${app.date} às ${app.time}hs.`
          },
          ...patient.timeline
        ]
      };
      updatePatient(updatedPatient);
    }

    if (isRemoteSession) {
      const { error } = await supabase.from('appointments').insert(mapAppToSnake(newApp));
      if (error) console.error('Erro ao salvar agendamento no Supabase:', error);
    }

    return newApp;
  };

  const updateAppointmentStatus = async (id, status, cancelReason = '') => {
    let appInfo = null;
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          appInfo = app;
          return { ...app, status, cancelReason };
        }
        return app;
      })
    );

    if (isRemoteSession) {
      await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);
    }

    if (appInfo) {
      const patient = patients.find((p) => p.id === appInfo.patientId);
      if (patient) {
        let title = 'Agendamento Atualizado';
        let desc = `Consulta de ${appInfo.time} foi marcada como ${status}.`;
        if (status === 'cancelado') {
          title = 'Agendamento Cancelado';
          desc = `Cancelado por motivo: ${cancelReason || 'Não informado'}.`;
        } else if (status === 'atendido') {
          title = 'Atendimento Realizado';
          desc = `Paciente atendido e finalizado pelo profissional.`;
        } else if (status === 'falta') {
          title = 'Falta Registrada';
          desc = `Paciente não compareceu ao horário agendado.`;
        }

        const updatedPatient = {
          ...patient,
          timeline: [
            {
              id: `t-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: 'appointment',
              title,
              desc
            },
            ...patient.timeline
          ]
        };
        updatePatient(updatedPatient);
      }
    }
  };

  // Auxiliares de Fila de Espera
  const addWaitlist = async (item) => {
    const newItem = {
      ...item,
      id: `w-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
      shop_id: !currentUser?.shopId || currentUser?.shopId === 'all' ? 'loja-1' : currentUser.shopId
    };
    
    setWaitlist((prev) => [...prev, newItem]);

    if (isRemoteSession) {
      await supabase.from('waitlist').insert(mapWaitToSnake(newItem));
    }
  };

  const removeWaitlist = async (id) => {
    setWaitlist((prev) => prev.filter((item) => item.id !== id));

    if (isRemoteSession) {
      await supabase.from('waitlist').delete().eq('id', id);
    }
  };

  // Auxiliares de Receitas e Óptica (OS)
  const addPrescription = (patientId, rx) => {
    const newRx = {
      ...rx,
      id: `rx-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };

    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      const updatedPatient = {
        ...patient,
        prescriptions: [newRx, ...patient.prescriptions],
        timeline: [
          {
            id: `t-${Date.now()}`,
            date: newRx.date,
            type: 'prescription',
            title: 'Receita Oftalmológica Emitida',
            desc: `OD Esf: ${(rx.longe?.od || rx.od)?.esferico || ''} Cil: ${(rx.longe?.od || rx.od)?.cilindrico || ''} | OE Esf: ${(rx.longe?.oe || rx.oe)?.esferico || ''} Cil: ${(rx.longe?.oe || rx.oe)?.cilindrico || ''}. Dr(a). ${rx.doctor}.`
          },
          ...patient.timeline
        ]
      };
      updatePatient(updatedPatient);
    }
  };

  const addPurchase = (patientId, purchase) => {
    const newPurchase = {
      ...purchase,
      id: `pur-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'Aguardando Laboratório',
      shop_id: !currentUser?.shopId || currentUser?.shopId === 'all' ? 'loja-1' : currentUser.shopId
    };

    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      const updatedPatient = {
        ...patient,
        purchases: [newPurchase, ...patient.purchases],
        timeline: [
          {
            id: `t-${Date.now()}`,
            date: newPurchase.date,
            type: 'purchase',
            title: `Nova Ordem de Serviço criada (${newPurchase.osNumber})`,
            desc: `Item: ${purchase.item} - Valor: R$ ${parseFloat(purchase.value).toFixed(2)}. Status: ${newPurchase.status}`
          },
          ...patient.timeline
        ]
      };
      updatePatient(updatedPatient);
    }
  };

  const updatePurchaseStatus = (patientId, purchaseId, status) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      const updatedPurchases = patient.purchases.map((pur) => {
        if (pur.id === purchaseId) {
          return { ...pur, status };
        }
        return pur;
      });

      const targetPurchase = patient.purchases.find((pur) => pur.id === purchaseId);
      const osName = targetPurchase ? targetPurchase.osNumber : 'OS';

      const hasUnpaid = updatedPurchases.some((pur) => pur.status === 'Aguardando Pagamento');
      let updatedAlerts = patient.alerts || [];
      if (!hasUnpaid && status !== 'Aguardando Pagamento') {
        updatedAlerts = updatedAlerts.filter(
          (a) =>
            !(
              a.type === 'administrative' &&
              (a.text.toLowerCase().includes('inadimplente') || a.text.toLowerCase().includes('pagamento'))
            )
        );
      }

      const updatedPatient = {
        ...patient,
        alerts: updatedAlerts,
        purchases: updatedPurchases,
        timeline: [
          {
            id: `t-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'purchase',
            title: `Ordem de Serviço Atualizada (${osName})`,
            desc: `Status alterado para: ${status}`
          },
          ...patient.timeline
        ]
      };
      updatePatient(updatedPatient);
    }
  };

  const [clinicSettings, setClinicSettings] = useState(() => {
    const local = localStorage.getItem('pia_clinic_settings');
    return local ? JSON.parse(local) : {
      name: 'Centro Visual Optometria',
      address: 'Av. Quatro, Nº 01, Sl. 02 - Cohab Anil IV - São Luís/MA',
      cep: '65050-700',
      phone: '(98) 98815-4507'
    };
  });

  const updateClinicSettings = (newSettings) => {
    setClinicSettings(newSettings);
    localStorage.setItem('pia_clinic_settings', JSON.stringify(newSettings));
  };

  const logout = async () => {
    if (isRemoteSession) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        logout,
        patients,
        appointments,
        waitlist,
        dataStatus,
        professionals: INITIAL_PROFESSIONALS,
        rooms: INITIAL_ROOMS,
        activeTab,
        setActiveTab,
        selectedPatientId,
        setSelectedPatientId,
        addPatient,
        updatePatient,
        setPatientActiveStatus,
        addAppointment,
        updateAppointmentStatus,
        addWaitlist,
        removeWaitlist,
        addPrescription,
        addPurchase,
        updatePurchaseStatus,
        activePrintData,
        setActivePrintData,
        clinicSettings,
        updateClinicSettings,
        theme,
        toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
