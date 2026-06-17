import React, { createContext, useState, useEffect } from 'react';
import {
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_WAITLIST,
  INITIAL_PROFESSIONALS,
  INITIAL_ROOMS
} from '../utils/mockData';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
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

  // Sincronização com o localStorage
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
  const addPatient = (patient) => {
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
      attachments: []
    };
    setPatients((prev) => [newPatient, ...prev]);
    return newPatient;
  };

  const updatePatient = (updatedPatient) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
    );
  };

  const deletePatient = (id) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setAppointments((prev) => prev.filter((app) => app.patientId !== id));
  };

  // Auxiliares de Agenda
  const addAppointment = (app) => {
    const newId = `app-${Date.now()}`;
    const newApp = {
      ...app,
      id: newId,
      status: 'confirmado'
    };
    setAppointments((prev) => [...prev, newApp]);

    // Adiciona na timeline do paciente
    setPatients((prevPatients) =>
      prevPatients.map((p) => {
        if (p.id === app.patientId) {
          const serviceName = app.serviceName || 'Consulta / Exame';
          return {
            ...p,
            timeline: [
              {
                id: `t-${Date.now()}`,
                date: app.date,
                type: 'appointment',
                title: 'Agendamento Criado',
                desc: `${serviceName} agendado para o dia ${app.date} às ${app.time}hs.`
              },
              ...p.timeline
            ]
          };
        }
        return p;
      })
    );
    return newApp;
  };

  const updateAppointmentStatus = (id, status, cancelReason = '') => {
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

    if (appInfo) {
      setPatients((prevPatients) =>
        prevPatients.map((p) => {
          if (p.id === appInfo.patientId) {
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

            return {
              ...p,
              timeline: [
                {
                  id: `t-${Date.now()}`,
                  date: new Date().toISOString().split('T')[0],
                  type: 'appointment',
                  title,
                  desc
                },
                ...p.timeline
              ]
            };
          }
          return p;
        })
      );
    }
  };

  // Auxiliares de Fila de Espera
  const addWaitlist = (item) => {
    const newItem = {
      ...item,
      id: `w-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0]
    };
    setWaitlist((prev) => [...prev, newItem]);
  };

  const removeWaitlist = (id) => {
    setWaitlist((prev) => prev.filter((item) => item.id !== id));
  };

  // Auxiliares de Receitas e Óptica (OS)
  const addPrescription = (patientId, rx) => {
    const newRx = {
      ...rx,
      id: `rx-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId) {
          return {
            ...p,
            prescriptions: [newRx, ...p.prescriptions],
            timeline: [
              {
                id: `t-${Date.now()}`,
                date: newRx.date,
                type: 'prescription',
                title: 'Receita Oftalmológica Emitida',
                desc: `OD Esf: ${rx.od.esferico} Cil: ${rx.od.cilindrico} | OE Esf: ${rx.oe.esferico} Cil: ${rx.oe.cilindrico}. Dr(a). ${rx.doctor}.`
              },
              ...p.timeline
            ]
          };
        }
        return p;
      })
    );
  };

  const addPurchase = (patientId, purchase) => {
    const newPurchase = {
      ...purchase,
      id: `pur-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'Aguardando Laboratório' // Aguardando Laboratório, Em Produção, Pronto para Retirada, Entregue, Aguardando Pagamento
    };

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId) {
          return {
            ...p,
            purchases: [newPurchase, ...p.purchases],
            timeline: [
              {
                id: `t-${Date.now()}`,
                date: newPurchase.date,
                type: 'purchase',
                title: `Nova Ordem de Serviço criada (${newPurchase.osNumber})`,
                desc: `Item: ${purchase.item} - Valor: R$ ${parseFloat(purchase.value).toFixed(2)}. Status: ${newPurchase.status}`
              },
              ...p.timeline
            ]
          };
        }
        return p;
      })
    );
  };

  const updatePurchaseStatus = (patientId, purchaseId, status) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId) {
          const updatedPurchases = p.purchases.map((pur) => {
            if (pur.id === purchaseId) {
              return { ...pur, status };
            }
            return pur;
          });

          const targetPurchase = p.purchases.find((pur) => pur.id === purchaseId);
          const osName = targetPurchase ? targetPurchase.osNumber : 'OS';

          return {
            ...p,
            purchases: updatedPurchases,
            timeline: [
              {
                id: `t-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'purchase',
                title: `Ordem de Serviço Atualizada (${osName})`,
                desc: `Status alterado para: ${status}`
              },
              ...p.timeline
            ]
          };
        }
        return p;
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
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
        updatePurchaseStatus
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
