import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePatients } from '../context/PatientContext';
import { useAppointments } from '../context/AppointmentContext';
import { useWaitlist } from '../context/WaitlistContext';
import { useApp } from '../context/AppContext';
import { Users, Calendar, ShoppingBag, ListPlus, AlertTriangle, CheckCircle, XCircle, Clock, Glasses, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { StatePanel } from './StatePanel';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { patients } = usePatients();
  const { appointments, updateAppointmentStatus } = useAppointments();
  const { waitlist, removeWaitlist, addWaitlist } = useWaitlist();
  const { setActiveTab, setSelectedPatientId, professionals } = useApp();

  // States
  const [filterKey, setFilterKey] = useState('todos');
  const [showAddWait, setShowAddWait] = useState(false);
  const [newWaitName, setNewWaitName] = useState('');
  const [newWaitPhone, setNewWaitPhone] = useState('');
  const [newWaitDoctor, setNewWaitDoctor] = useState('Qualquer profissional');
  const [newWaitService, setNewWaitService] = useState('Consulta Geral');

  // Cancel Modal states
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('Paciente desistiu / não pôde comparecer');
  const [customReason, setCustomReason] = useState('');

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddWaitSubmit = (e) => {
    e.preventDefault();
    if (!newWaitName.trim() || !newWaitPhone.trim()) return;

    addWaitlist({
      patientName: newWaitName,
      phone: newWaitPhone,
      preferredDoctor: newWaitDoctor,
      service: newWaitService
    });

    setNewWaitName('');
    setNewWaitPhone('');
    setShowAddWait(false);
    triggerToast('Paciente adicionado à fila de espera!');
  };

  const quickActions = [
    {
      id: 'encaixe',
      label: 'Novo agendamento',
      icon: <Calendar size={20} />,
      color: 'var(--primary)',
      bgColor: 'var(--primary-light)',
      tab: 'agenda'
    },
    {
      id: 'waitlist',
      label: 'Fila de espera',
      icon: <ListPlus size={20} />,
      color: 'var(--accent)',
      bgColor: 'var(--accent-light)',
      tab: 'agenda' // will be toggled locally if clicked
    },
    {
      id: 'optical',
      label: 'Nova OS',
      icon: <Glasses size={20} />,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
      tab: 'optical'
    },
    {
      id: 'patients',
      label: 'Novo paciente',
      icon: <Users size={20} />,
      color: '#ec4899',
      bgColor: '#fdf2f8',
      tab: 'patients'
    }
  ];

  // Data atual
  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const userShopId = currentUser?.shopId;
  const firstName = currentUser?.name?.split(' ')[0] || 'equipe';
  const activePatients = patients.filter((patient) => patient.isActive !== false);

  // Filtrar dados por Loja/Filial (se aplicável)
  const shopApps = appointments.filter(
    (app) => !userShopId || userShopId === 'all' || app.shop_id === userShopId || !app.shop_id
  );
  const shopWaitlist = waitlist.filter(
    (item) => !userShopId || userShopId === 'all' || item.shop_id === userShopId || !item.shop_id
  );

  // Estatísticas filtradas
  const todayApps = shopApps
    .filter((app) => app.date === todayStr)
    .sort((first, second) => String(first.time).localeCompare(String(second.time)));
  const activeOS = activePatients.reduce((acc, p) => {
    const pending = p.purchases.filter(
      (pur) =>
        pur.status !== 'Entregue' &&
        pur.status !== 'Cancelado' &&
        (!userShopId || userShopId === 'all' || pur.shop_id === userShopId || !pur.shop_id)
    ).length;
    return acc + pending;
  }, 0);
  const waitlistCount = shopWaitlist.length;
  const confirmedToday = todayApps.filter((app) => app.status === 'confirmado').length;
  const completedToday = todayApps.filter((app) => app.status === 'atendido').length;

  // Filtrar alertas importantes dos pacientes cadastrados
  const allAlerts = activePatients.flatMap((p) =>
    (p.alerts || []).map((alert) => ({ ...alert, patientName: p.name, patientId: p.id }))
  );

  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    setActiveTab('patients');
  };

  const handleQuickAction = (action) => {
    if (action.id === 'waitlist') {
      setShowAddWait((prev) => !prev);
      return;
    }

    setActiveTab(action.tab);
  };

  // Filtragem da agenda do dia com base nas abas de status
  const filteredTodayApps = todayApps.filter((app) => {
    if (filterKey === 'todos') return true;
    return app.status === filterKey;
  });

  return (
    <div className="db-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1100,
            fontSize: '14px',
            fontWeight: 600,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Cabeçalho operacional */}
      <header className="db-hero">
        <div className="db-hero-copy">
          <span className="patient-eyebrow">Visão operacional</span>
          <h2>Olá, {firstName}</h2>
          <p>
            <span>{formattedToday}</span>
            <span aria-hidden="true">•</span>
            <span>{activePatients.length} pacientes ativos</span>
          </p>
        </div>

        <div className="db-header-actions" aria-label="Ações rápidas">
          {quickActions.map((action) => (
            <button
              type="button"
              key={action.id}
              className="db-header-action"
              onClick={() => handleQuickAction(action)}
            >
              <span style={{ color: action.color, backgroundColor: action.bgColor }}>{action.icon}</span>
              <strong>{action.label}</strong>
            </button>
          ))}
        </div>
      </header>

      {/* Grid Principal Layout (2/3 Esquerdo, 1/3 Direito) */}
      <div className="db-grid">

        {/* Coluna Esquerda: Estatísticas e Agenda */}
        <div className="db-left">

          {/* Indicadores do dia */}
          <div className="db-stat-grid">
            <button type="button" className="db-stat-card" onClick={() => setActiveTab('agenda')}>
              <div className="stat-icon accent">
                <Calendar size={24} />
              </div>
              <div>
                <strong>{todayApps.length}</strong>
                <span>Atendimentos hoje</span>
                <small>{completedToday} concluído(s)</small>
              </div>
              <ArrowRight size={16} />
            </button>

            <button type="button" className="db-stat-card" onClick={() => setActiveTab('agenda')}>
              <div className="stat-icon primary">
                <Clock size={24} />
              </div>
              <div>
                <strong>{confirmedToday}</strong>
                <span>Aguardando atendimento</span>
                <small>Agenda confirmada</small>
              </div>
              <ArrowRight size={16} />
            </button>

            <button type="button" className="db-stat-card" onClick={() => setActiveTab('optical')}>
              <div className="stat-icon warning">
                <ShoppingBag size={24} />
              </div>
              <div>
                <strong>{activeOS}</strong>
                <span>OS em aberto</span>
                <small>Produção e pagamento</small>
              </div>
              <ArrowRight size={16} />
            </button>

            <button type="button" className="db-stat-card" onClick={() => setShowAddWait((prev) => !prev)}>
              <div className="stat-icon danger">
                <ListPlus size={24} />
              </div>
              <div>
                <strong>{waitlistCount}</strong>
                <span>Fila de espera</span>
                <small>{allAlerts.length} alerta(s) ativo(s)</small>
              </div>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Agenda de Hoje */}
          <div className="card db-agenda-card">
            <div className="card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ fontSize: '18px' }}>
                <Calendar size={20} color="var(--primary)" /> Agenda de Hoje
              </h3>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {filteredTodayApps.length} de {todayApps.length} agendamento(s)
              </span>
            </div>

            {/* Abas de Filtros de Estado */}
            <div className="filter-tabs" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['todos', 'confirmado', 'atendido', 'falta', 'cancelado'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterKey(status)}
                  className={`filter-tab ${filterKey === status ? 'active' : ''}`}
                  aria-pressed={filterKey === status}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Timeline scrollável inteligente */}
            <div className="smart-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: '550px', paddingRight: '4px' }}>
              {filteredTodayApps.length === 0 ? (
                <StatePanel
                  type={todayApps.length === 0 ? 'empty' : 'search'}
                  title={todayApps.length === 0 ? 'Agenda livre hoje' : 'Nenhum agendamento neste status'}
                  description={todayApps.length === 0
                    ? 'Novos agendamentos aparecerão aqui ao serem incluídos.'
                    : 'Escolha outro status para visualizar os demais atendimentos.'}
                  action={todayApps.length > 0 && filterKey !== 'todos' ? (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilterKey('todos')}>
                      Mostrar todos
                    </button>
                  ) : null}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredTodayApps.map((app) => (
                    <div
                      key={app.id}
                      className="app-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-title)' }}>{app.time}</span>
                          <button
                            onClick={() => handlePatientClick(app.patientId)}
                            className="table-link"
                          >
                            {app.patientName}
                          </button>
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <StatusBadge status={app.status} />

                        {app.status === 'confirmado' && (
                          <div className="app-actions-hover">
                            <button
                              onClick={() => {
                                updateAppointmentStatus(app.id, 'atendido');
                                triggerToast(`Atendimento de ${app.patientName} finalizado!`);
                              }}
                              className="icon-button"
                              title="Finalizar Atendimento"
                              aria-label={`Finalizar atendimento de ${app.patientName}`}
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => setCancelTarget(app)}
                              className="icon-button"
                              title="Cancelar Agendamento"
                              aria-label={`Cancelar agendamento de ${app.patientName}`}
                            >
                              <XCircle size={15} />
                            </button>
                            <button
                              onClick={() => {
                                updateAppointmentStatus(app.id, 'falta');
                                triggerToast(`Falta registrada para ${app.patientName}.`);
                              }}
                              className="icon-button"
                              title="Registrar Falta"
                              aria-label={`Registrar falta de ${app.patientName}`}
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
          </div>
        </div>

        {/* Coluna Direita: Ações, Fila de Espera e Alertas */}
        <div className="db-right">

          {/* Fila de Espera Sempre Visível */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListPlus size={18} color="var(--accent)" /> Fila de Espera
              </h3>
              <button
                onClick={() => setShowAddWait((prev) => !prev)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
              >
                {showAddWait ? 'Fechar' : 'Incluir'}
              </button>
            </div>

            {showAddWait && (
              <form onSubmit={handleAddWaitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nome do Paciente..."
                  required
                  value={newWaitName}
                  onChange={(e) => setNewWaitName(e.target.value)}
                  style={{ fontSize: '13px', padding: '8px' }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Telefone..."
                  required
                  value={newWaitPhone}
                  onChange={(e) => setNewWaitPhone(e.target.value)}
                  style={{ fontSize: '13px', padding: '8px' }}
                />
                <select
                  className="form-control"
                  value={newWaitDoctor}
                  onChange={(e) => setNewWaitDoctor(e.target.value)}
                  style={{ fontSize: '13px', padding: '8px' }}
                >
                  <option value="Qualquer profissional">Qualquer Profissional</option>
                  {professionals && professionals.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <select
                  className="form-control"
                  value={newWaitService}
                  onChange={(e) => setNewWaitService(e.target.value)}
                  style={{ fontSize: '13px', padding: '8px' }}
                >
                  <option value="Consulta Geral">Consulta Geral</option>
                  <option value="Exame de Campo Visual">Exame de Campo Visual</option>
                  <option value="Adaptação de Lentes">Adaptação de Lentes</option>
                  <option value="Retorno">Retorno</option>
                </select>
                <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '8px', cursor: 'pointer' }}>
                  Adicionar na Espera
                </button>
              </form>
            )}

            <div className="smart-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxH: '250px', overflowY: 'auto' }}>
              {shopWaitlist.length === 0 ? (
                <StatePanel
                  type="empty"
                  title="Fila de espera vazia"
                  description="Inclua pacientes que aguardam uma oportunidade de encaixe."
                  compact
                />
              ) : (
                shopWaitlist.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-primary)',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-title)' }}>{item.patientName}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerToast(`Chamando ${item.patientName} para atendimento!`);
                            alert(`Chamando ${item.patientName} para o consultório.`);
                          }}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--primary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          aria-label={`Chamar ${item.patientName} da fila de espera`}
                        >
                          Chamar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeWaitlist(item.id);
                            triggerToast('Paciente removido da fila.');
                          }}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--status-cancelado-text)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          aria-label={`Remover ${item.patientName} da fila de espera`}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>Tel: {item.phone}</span>
                    <span style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                      Doc: <strong style={{ color: 'var(--text-main)' }}>{item.preferredDoctor}</strong> | Serv: <strong style={{ color: 'var(--text-main)' }}>{item.service}</strong>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Alertas Ativos */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ marginBottom: '12px', borderBottom: 'none', padding: 0 }}>
              <h3 className="card-title" style={{ fontSize: '16px' }}>
                <AlertTriangle size={18} color="#ef4444" /> Alertas da Clínica
              </h3>
            </div>

            <div className="smart-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
              {allAlerts.length === 0 ? (
                <StatePanel
                  type="empty"
                  title="Nenhum alerta ativo"
                  description="A clínica está sem pendências clínicas ou administrativas."
                  compact
                />
              ) : (
                allAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      borderLeft: `4px solid ${alert.color || '#ef4444'}`,
                      backgroundColor: 'var(--bg-primary)',
                      padding: '10px 12px',
                      borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                      borderTop: '1px solid var(--border-color)',
                      borderRight: '1px solid var(--border-color)',
                      borderBottom: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <button
                        type="button"
                        onClick={() => handlePatientClick(alert.patientId)}
                        className="table-link"
                        style={{ fontSize: '12px' }}
                      >
                        {alert.patientName}
                      </button>
                      <StatusBadge
                        status={alert.type === 'clinical' ? 'clinico' : 'administrativo'}
                        label={alert.type === 'clinical' ? 'Clínico' : 'Administrativo'}
                      />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '4px', fontWeight: 500 }}>
                      {alert.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Cancelamento */}
      {cancelTarget && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            aria-describedby="cancel-dialog-description"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '450px',
              padding: '28px',
              boxShadow: 'var(--shadow-xl)'
            }}
          >
            <h3 id="cancel-dialog-title" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-title)' }}>
              Confirmar Cancelamento
            </h3>
            <p id="cancel-dialog-description" style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Deseja cancelar o agendamento de <strong>{cancelTarget.patientName}</strong> às <strong>{cancelTarget.time}</strong>?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[
                'Paciente desistiu / não pôde comparecer',
                'Profissional indisponível no horário',
                'Erro de agendamento duplicado',
                'Outro motivo'
              ].map((reason) => (
                <label
                  key={reason}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    color: 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  {reason}
                </label>
              ))}
            </div>

            {cancelReason === 'Outro motivo' && (
              <textarea
                className="form-control"
                placeholder="Especifique o motivo do cancelamento..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  fontSize: '13px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  marginBottom: '20px',
                  resize: 'none'
                }}
                required
              />
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason('Paciente desistiu / não pôde comparecer');
                  setCustomReason('');
                }}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer' }}
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  const finalReason = cancelReason === 'Outro motivo' ? customReason : cancelReason;
                  if (cancelReason === 'Outro motivo' && !customReason.trim()) {
                    alert('Por favor, especifique o motivo!');
                    return;
                  }
                  updateAppointmentStatus(cancelTarget.id, 'cancelado', finalReason);
                  triggerToast(`Agendamento de ${cancelTarget.patientName} cancelado.`);
                  setCancelTarget(null);
                  setCancelReason('Paciente desistiu / não pôde comparecer');
                  setCustomReason('');
                }}
                className="btn btn-danger"
              >
                Cancelar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
