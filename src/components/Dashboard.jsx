import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Users, Calendar, ShoppingBag, ListPlus, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const {
    patients,
    appointments,
    waitlist,
    setActiveTab,
    setSelectedPatientId,
    updateAppointmentStatus
  } = useContext(AppContext);

  // Data atual
  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  // Estatísticas
  const totalPatients = patients.length;
  const todayApps = appointments.filter((app) => app.date === todayStr);
  const activeOS = patients.reduce((acc, p) => {
    const pending = p.purchases.filter(
      (pur) => pur.status !== 'Entregue' && pur.status !== 'Cancelado'
    ).length;
    return acc + pending;
  }, 0);
  const waitlistCount = waitlist.length;

  // Filtrar alertas importantes dos pacientes cadastrados
  const allAlerts = patients.flatMap((p) =>
    (p.alerts || []).map((alert) => ({ ...alert, patientName: p.name, patientId: p.id }))
  );

  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    setActiveTab('patients');
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700 }}>Olá, Doutor(a)</h2>
        <p style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{formattedToday}</p>
      </div>

      {/* Grid de Estatísticas */}
      <div className="dashboard-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('patients')}>
          <div className="stat-icon primary">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">{totalPatients}</div>
            <div className="stat-label">Pacientes</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('agenda')}>
          <div className="stat-icon accent">
            <Calendar size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">{todayApps.length}</div>
            <div className="stat-label">Agenda de Hoje</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('optical')}>
          <div className="stat-icon warning">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">{activeOS}</div>
            <div className="stat-label">OS em Aberto</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('agenda')}>
          <div className="stat-icon danger">
            <ListPlus size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">{waitlistCount}</div>
            <div className="stat-label">Fila de Espera</div>
          </div>
        </div>
      </div>

      {/* Grid de Seções */}
      <div className="section-grid">
        {/* Agenda do Dia */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Calendar size={20} color="var(--primary)" />
              Compromissos de Hoje
            </h3>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              {todayApps.length} agendamento(s)
            </span>
          </div>

          {todayApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Nenhum agendamento para o dia de hoje.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todayApps.map((app) => (
                <div
                  key={app.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#fff'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px' }}>{app.time}</span>
                      <a
                        onClick={() => handlePatientClick(app.patientId)}
                        style={{
                          fontWeight: 600,
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {app.patientName}
                      </a>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Serviço: <strong style={{ color: 'var(--text-main)' }}>{app.serviceId === 'consulta' ? 'Consulta Geral' : app.serviceId === 'exame' ? 'Exame de Campo Visual' : app.serviceId === 'adaptacao' ? 'Adaptação de Lentes' : app.serviceId === 'retorno' ? 'Retorno' : app.serviceId}</strong> | Convênio: <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{app.paymentType}</strong>
                    </div>
                    {app.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                        "{app.notes}"
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        textTransform: 'uppercase',
                        backgroundColor: `var(--status-${app.status})`,
                        color: `var(--status-${app.status}-text)`
                      }}
                    >
                      {app.status}
                    </span>

                    {app.status === 'confirmado' && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'atendido')}
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--status-atendido)', color: 'var(--status-atendido-text)', padding: '6px' }}
                          title="Finalizar Atendimento"
                        >
                          <CheckCircle size={15} />
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Motivo do cancelamento:');
                            if (reason !== null) {
                              updateAppointmentStatus(app.id, 'cancelado', reason);
                            }
                          }}
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--status-cancelado)', color: 'var(--status-cancelado-text)', padding: '6px' }}
                          title="Cancelar Agendamento"
                        >
                          <XCircle size={15} />
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'falta')}
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--status-falta)', color: 'var(--status-falta-text)', padding: '6px' }}
                          title="Registrar Falta"
                        >
                          <Clock size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas Ativos */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={20} color="#ef4444" />
              Alertas da Clínica
            </h3>
          </div>

          {allAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Nenhum alerta ativo no momento.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    borderLeft: `4px solid ${alert.color || '#ef4444'}`,
                    backgroundColor: '#fff',
                    padding: '12px 16px',
                    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                    borderTop: '1px solid var(--border-color)',
                    borderRight: '1px solid var(--border-color)',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span
                      onClick={() => handlePatientClick(alert.patientId)}
                      style={{ fontWeight: 600, fontSize: '13px', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {alert.patientName}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 'bold',
                        backgroundColor: alert.type === 'clinical' ? '#fee2e2' : '#fef3c7',
                        color: alert.type === 'clinical' ? '#ef4444' : '#d97706'
                      }}
                    >
                      {alert.type === 'clinical' ? 'CLÍNICO' : 'ADM'}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px', fontWeight: 500 }}>
                    {alert.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
