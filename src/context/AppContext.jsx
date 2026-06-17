import React, { createContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import {
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_WAITLIST,
  INITIAL_PROFESSIONALS,
  INITIAL_ROOMS
} from '../utils/mockData';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  const [patients, setPatients] = useState(() => {
    const local = localStorage.getItem('pia_patients');
    return local ? JSON.parse(local) : INITIAL_PATIENTS;
  });

  const [appointments, setAppointments] = useState(() => {
    const local = localStorage.getItem('pia_appointments');
    return local ? JSON.parse(local) : INITIAL_APPOINTMENTS;
  });

  const [waitlist, setWaitlist] = useState(() => {
    const local = localStorage.getItem('pia_waitlist');
    return local ? JSON.parse(local) : INITIAL_WAITLIST;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activePrintData, setActivePrintData] = useState(null);

  // 1. Ouvir Sessão do Supabase (se configurado)
  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const user = session.user;
          setCurrentUser({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email.split('@')[0],
            role: user.user_metadata?.role || 'admin',
            shopId: user.user_metadata?.shop_id || 'loja-1'
          });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          const user = session.user;
          setCurrentUser({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email.split('@')[0],
            role: user.user_metadata?.role || 'admin',
            shopId: user.user_metadata?.shop_id || 'loja-1'
          });
        } else {
          setCurrentUser(null);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // 2. Carregar dados do Supabase ou persistir localmente
  useEffect(() => {
    const loadData = async () => {
      if (isSupabaseConfigured && currentUser) {
        try {
          // Buscar pacientes
          const { data: pats, error: errPats } = await supabase.from('patients').select('*');
          if (!errPats && pats && pats.length > 0) setPatients(pats);

          // Buscar consultas
          const { data: apps, error: errApps } = await supabase.from('appointments').select('*');
          if (!errApps && apps && apps.length > 0) setAppointments(apps);

          // Buscar fila de espera
          const { data: waits, error: errWaits } = await supabase.from('waitlist').select('*');
          if (!errWaits && waits && waits.length > 0) setWaitlist(waits);
        } catch (e) {
          console.warn('Erro ao conectar tabelas do Supabase, rodando localmente:', e);
        }
      }
    };
    loadData();
  }, [currentUser]);

  // Persistir no LocalStorage caso esteja no modo demo
  useEffect(() => {
    localStorage.setItem('pia_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('pia_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('pia_waitlist', JSON.stringify(waitlist));
  }, [waitlist]);

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
      shop_id: currentUser?.shopId || 'loja-1'
    };

    setPatients((prev) => [newPatient, ...prev]);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('patients').insert(newPatient);
      if (error) console.error('Erro ao salvar paciente no Supabase:', error);
    }

    return newPatient;
  };

  const updatePatient = async (updatedPatient) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
    );

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('patients')
        .update(updatedPatient)
        .eq('id', updatedPatient.id);
      if (error) console.error('Erro ao atualizar paciente no Supabase:', error);
    }
  };

  const deletePatient = async (id) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setAppointments((prev) => prev.filter((app) => app.patientId !== id));

    if (isSupabaseConfigured) {
      await supabase.from('patients').delete().eq('id', id);
      await supabase.from('appointments').delete().eq('patientId', id);
    }
  };

  // Auxiliares de Agenda
  const addAppointment = async (app) => {
    const newId = `app-${Date.now()}`;
    const newApp = {
      ...app,
      id: newId,
      status: 'confirmado',
      shop_id: currentUser?.shopId || 'loja-1'
    };
    
    setAppointments((prev) => [...prev, newApp]);

    // Timeline do paciente
    const patient = patients.find((p) => p.id === app.patientId);
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

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('appointments').insert(newApp);
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

    if (isSupabaseConfigured) {
      await supabase
        .from('appointments')
        .update({ status, cancelReason })
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
      shop_id: currentUser?.shopId || 'loja-1'
    };
    
    setWaitlist((prev) => [...prev, newItem]);

    if (isSupabaseConfigured) {
      await supabase.from('waitlist').insert(newItem);
    }
  };

  const removeWaitlist = async (id) => {
    setWaitlist((prev) => prev.filter((item) => item.id !== id));

    if (isSupabaseConfigured) {
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
      shop_id: currentUser?.shopId || 'loja-1'
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

  const logout = async () => {
    if (isSupabaseConfigured) {
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
        professionals: INITIAL_PROFESSIONALS,
        rooms: INITIAL_ROOMS,
        activeTab,
        setActiveTab,
        selectedPatientId,
        setSelectedPatientId,
        addPatient,
        updatePatient,
        deletePatient,
        addAppointment,
        updateAppointmentStatus,
        addWaitlist,
        removeWaitlist,
        addPrescription,
        addPurchase,
        updatePurchaseStatus,
        activePrintData,
        setActivePrintData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
