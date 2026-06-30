import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePatients } from '../context/PatientContext';
import { useAppointments } from '../context/AppointmentContext';
import { useWaitlist } from '../context/WaitlistContext';
import { useApp } from '../context/AppContext';
import { saleService } from '../services/saleService';
import { getInventoryItems } from '../services/inventoryService';
import { Users, Calendar, ShoppingBag, ListPlus, AlertTriangle, CheckCircle, XCircle, Clock, Glasses, ArrowRight, DollarSign, Package } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { StatePanel } from './StatePanel';
import { canManageAppointments, canViewOperationalDashboard, isDoctorUser } from '../utils/roles';
import type { Appointment, InventoryItem, Sale } from '../types';

type QuickAction = {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
  tab: string;
};

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { patients } = usePatients();
  const { appointments, updateAppointmentStatus } = useAppointments();
  const { waitlist, removeWaitlist, addWaitlist } = useWaitlist();
  const { setActiveTab, setSelectedPatientId } = useApp();

  // New States for Phase 4 Metrics
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Filters & States
  const [filterKey, setFilterKey] = useState('todos');
  const [showAddWait, setShowAddWait] = useState(false);
  const [newWaitName, setNewWaitName] = useState('');
  const [newWaitPhone, setNewWaitPhone] = useState('');
  // Removed unused newWaitDoctor and newWaitService to satisfy lint
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('Paciente desistiu / não pôde comparecer');
  const [customReason, setCustomReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const userShopId = currentUser?.shopId;
  const currentUserIsDoctor = isDoctorUser(currentUser);
  const userCanManageAppointments = canManageAppointments(currentUser);
  const userCanViewOperationalDashboard = canViewOperationalDashboard(currentUser);

  // Load Sales and Inventory
  useEffect(() => {
    if (!userCanViewOperationalDashboard) {
      setSales([]);
      setInventory([]);
      return;
    }

    saleService.getAll().then(data => {
      if (userShopId && userShopId !== 'all') {
        setSales(data.filter(s => s.shop_id === userShopId));
      } else {
        setSales(data);
      }
    }).catch(console.error);

    if (userShopId) {
      const fetchShop = userShopId === 'all' ? undefined : userShopId;
      getInventoryItems(fetchShop).then(setInventory).catch(console.error);
    }
  }, [userShopId, userCanViewOperationalDashboard]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddWaitSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newWaitName.trim() || !newWaitPhone.trim()) return;
    addWaitlist({
      patientName: newWaitName,
      phone: newWaitPhone,
      preferredDoctor: 'Qualquer profissional',
      service: 'Consulta Geral'
    });
    setNewWaitName('');
    setNewWaitPhone('');
    setShowAddWait(false);
    triggerToast('Paciente adicionado à fila de espera!');
  };

  const operationalQuickActions: QuickAction[] = [
    { id: 'encaixe', label: 'Novo agendamento', icon: <Calendar size={20} />, color: 'var(--primary)', bgColor: 'var(--primary-light)', tab: 'agenda' },
    { id: 'waitlist', label: 'Fila de espera', icon: <ListPlus size={20} />, color: 'var(--accent)', bgColor: 'var(--accent-light)', tab: 'agenda' },
    { id: 'optical', label: 'Nova OS', icon: <Glasses size={20} />, color: '#8b5cf6', bgColor: '#f5f3ff', tab: 'optical' },
    { id: 'patients', label: 'Novo paciente', icon: <Users size={20} />, color: '#ec4899', bgColor: '#fdf2f8', tab: 'patients' }
  ];
  const doctorQuickActions: QuickAction[] = [
    { id: 'agenda', label: 'Minha agenda', icon: <Calendar size={20} />, color: 'var(--primary)', bgColor: 'var(--primary-light)', tab: 'agenda' },
    { id: 'patients', label: 'Meus pacientes', icon: <Users size={20} />, color: 'var(--accent)', bgColor: 'var(--accent-light)', tab: 'patients' }
  ];
  const quickActions = currentUserIsDoctor ? doctorQuickActions : operationalQuickActions;

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = currentUser?.name?.split(' ')[0] || 'equipe';
  const activePatients = patients.filter((patient) => patient.isActive !== false);

  const shopApps = appointments.filter(app => {
    if (currentUserIsDoctor && app.professionalId !== currentUser?.id) return false;
    return !userShopId || userShopId === 'all' || app.shop_id === userShopId || !app.shop_id;
  });
  const shopWaitlist = waitlist.filter(item => !userShopId || userShopId === 'all' || item.shop_id === userShopId || !item.shop_id);

  const todayApps = shopApps.filter(app => app.date === todayStr).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const waitlistCount = shopWaitlist.length;
  const completedToday = todayApps.filter(app => app.status === 'atendido').length;
  const confirmedToday = todayApps.filter(app => app.status === 'confirmado').length;
  const inCareToday = todayApps.filter(app => app.status === 'em_atendimento').length;
  const statusFilters = currentUserIsDoctor
    ? ['todos', 'confirmado', 'em_atendimento', 'atendido']
    : ['todos', 'confirmado', 'atendido', 'falta', 'cancelado'];

  useEffect(() => {
    const allowedFilters = currentUserIsDoctor
      ? ['todos', 'confirmado', 'em_atendimento', 'atendido']
      : ['todos', 'confirmado', 'atendido', 'falta', 'cancelado'];

    if (!allowedFilters.includes(filterKey)) {
      setFilterKey('todos');
    }
  }, [filterKey, currentUserIsDoctor]);

  // Real Metrics from DB
  const activeOSCount = sales.filter(s => s.status !== 'Entregue' && s.status !== 'Cancelado').length;
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const monthRevenue = sales
    .filter(s => s.date.startsWith(currentMonthStr) && s.status !== 'Cancelado')
    .reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

  // Alerts
  const clinicalAlerts = userCanViewOperationalDashboard
    ? activePatients.flatMap(p => (p.alerts || []).map(alert => ({ ...alert, patientName: p.name, patientId: p.id })))
    : [];
  const lowStockAlerts = inventory.filter(item => item.quantity <= item.minQuantity).map(item => ({
    id: item.id,
    type: 'inventory',
    color: '#f59e0b',
    text: `Estoque baixo: ${item.name} (${item.quantity} restantes)`,
    item: item
  }));
  const allAlerts = [...clinicalAlerts, ...lowStockAlerts];

  const handlePatientClick = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveTab('patients');
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.id === 'waitlist' && userCanManageAppointments) {
      setShowAddWait(prev => !prev);
      return;
    }
    setActiveTab(action.tab);
  };

  const filteredTodayApps = todayApps.filter(app => filterKey === 'todos' ? true : app.status === filterKey);

  return (
    <div className="db-container">
      {toastMessage && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', backgroundColor: 'var(--primary)', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 1100, fontSize: '14px', fontWeight: 600, animation: 'fadeIn 0.3s ease' }}>
          {toastMessage}
        </div>
      )}

      <header className="db-hero">
        <div className="db-hero-copy">
          <span className="patient-eyebrow">
            {currentUserIsDoctor ? 'Visão clínica' : 'Visão operacional e financeira'}
          </span>
          <h2>Olá, {firstName}</h2>
          <p>
            <span>{formattedToday}</span>
            <span aria-hidden="true">•</span>
            <span>
              {currentUserIsDoctor
                ? `${todayApps.length} atendimento(s) na sua agenda`
                : `${activePatients.length} pacientes ativos`}
            </span>
          </p>
        </div>
        <div className="db-header-actions">
          {quickActions.map((action) => (
            <button type="button" key={action.id} className="db-header-action" onClick={() => handleQuickAction(action)}>
              <span style={{ color: action.color, backgroundColor: action.bgColor }}>{action.icon}</span>
              <strong>{action.label}</strong>
            </button>
          ))}
        </div>
      </header>

      <div className="db-grid" style={!userCanViewOperationalDashboard ? { gridTemplateColumns: '1fr' } : undefined}>
        <div className="db-left">
          <div className="db-stat-grid">
            <button type="button" className="db-stat-card" onClick={() => setActiveTab('agenda')}>
              <div className="stat-icon primary"><Calendar size={24} /></div>
              <div>
                <strong>{todayApps.length}</strong>
                <span>Atendimentos hoje</span>
                <small>{completedToday} concluído(s)</small>
              </div>
              <ArrowRight size={16} />
            </button>

            {currentUserIsDoctor ? (
              <>
                <button type="button" className="db-stat-card" onClick={() => setActiveTab('agenda')}>
                  <div className="stat-icon primary"><Clock size={24} /></div>
                  <div>
                    <strong>{confirmedToday}</strong>
                    <span>Aguardando atendimento</span>
                    <small>Confirmados para hoje</small>
                  </div>
                  <ArrowRight size={16} />
                </button>

                <button type="button" className="db-stat-card" onClick={() => setActiveTab('agenda')}>
                  <div className="stat-icon warning"><Clock size={24} /></div>
                  <div>
                    <strong>{inCareToday}</strong>
                    <span>Em atendimento</span>
                    <small>Atendimentos iniciados</small>
                  </div>
                  <ArrowRight size={16} />
                </button>

                <button type="button" className="db-stat-card" onClick={() => setActiveTab('agenda')}>
                  <div className="stat-icon accent"><CheckCircle size={24} /></div>
                  <div>
                    <strong>{completedToday}</strong>
                    <span>Finalizados hoje</span>
                    <small>Atendimentos concluídos</small>
                  </div>
                  <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <button type="button" className="db-stat-card" onClick={() => setActiveTab('optical')}>
                  <div className="stat-icon warning"><ShoppingBag size={24} /></div>
                  <div>
                    <strong>{activeOSCount}</strong>
                    <span>OS em aberto</span>
                    <small>Produção e pagamento</small>
                  </div>
                  <ArrowRight size={16} />
                </button>

                <button type="button" className="db-stat-card" onClick={() => setActiveTab('finance')}>
                  <div className="stat-icon" style={{ backgroundColor: '#dcfce7', color: '#166534' }}><DollarSign size={24} /></div>
                  <div>
                    <strong>R$ {monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    <span>Faturamento do Mês</span>
                    <small>Óptica + Clínica</small>
                  </div>
                  <ArrowRight size={16} />
                </button>

                <button type="button" className="db-stat-card" onClick={() => setActiveTab('inventory')}>
                  <div className="stat-icon danger"><Package size={24} /></div>
                  <div>
                    <strong>{lowStockAlerts.length}</strong>
                    <span>Alertas de Estoque</span>
                    <small>Itens abaixo do mínimo</small>
                  </div>
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>

          <div className="card db-agenda-card">
            <div className="card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ fontSize: '18px' }}><Calendar size={20} color="var(--primary)" /> Agenda de Hoje</h3>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>{filteredTodayApps.length} de {todayApps.length} agendamento(s)</span>
            </div>

            <div className="filter-tabs" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {statusFilters.map((status) => (
                <button key={status} type="button" onClick={() => setFilterKey(status)} className={`filter-tab ${filterKey === status ? 'active' : ''}`}>
                  {status === 'em_atendimento' ? 'em atendimento' : status}
                </button>
              ))}
            </div>

            <div className="smart-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: '550px', paddingRight: '4px' }}>
              {filteredTodayApps.length === 0 ? (
                <StatePanel type={todayApps.length === 0 ? 'empty' : 'search'} title={todayApps.length === 0 ? 'Agenda livre hoje' : 'Nenhum agendamento neste status'} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredTodayApps.map((app) => (
                    <div key={app.id} className="app-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-title)' }}>{app.time}</span>
                          <button onClick={() => handlePatientClick(app.patientId)} className="table-link">{app.patientName}</button>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Serviço: <strong style={{ color: 'var(--text-main)' }}>{app.serviceId}</strong> | Convênio: <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{app.paymentType}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <StatusBadge status={app.status} />
                        {currentUserIsDoctor ? (
                          <div className="app-actions-hover">
                            {app.status === 'confirmado' && (
                              <button onClick={() => updateAppointmentStatus(app.id, 'em_atendimento')} className="icon-button" title="Iniciar atendimento"><Clock size={15} /></button>
                            )}
                            {app.status === 'em_atendimento' && (
                              <button onClick={() => updateAppointmentStatus(app.id, 'atendido')} className="icon-button" title="Finalizar atendimento"><CheckCircle size={15} /></button>
                            )}
                          </div>
                        ) : app.status === 'confirmado' && (
                          <div className="app-actions-hover">
                            <button onClick={() => updateAppointmentStatus(app.id, 'atendido')} className="icon-button" title="Finalizar Atendimento"><CheckCircle size={15} /></button>
                            <button onClick={() => setCancelTarget(app)} className="icon-button" title="Cancelar Agendamento"><XCircle size={15} /></button>
                            <button onClick={() => updateAppointmentStatus(app.id, 'falta')} className="icon-button" title="Registrar Falta"><Clock size={15} /></button>
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

        {userCanViewOperationalDashboard && (
        <div className="db-right">
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListPlus size={18} color="var(--accent)" /> Fila de Espera ({waitlistCount})
              </h3>
              <button onClick={() => setShowAddWait(prev => !prev)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }}>
                {showAddWait ? 'Fechar' : 'Incluir'}
              </button>
            </div>

            {showAddWait && (
              <form onSubmit={handleAddWaitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <input required type="text" className="form-control" placeholder="Nome do Paciente..." value={newWaitName} onChange={e => setNewWaitName(e.target.value)} />
                <input required type="text" className="form-control" placeholder="Telefone..." value={newWaitPhone} onChange={e => setNewWaitPhone(e.target.value)} />
                <button type="submit" className="btn btn-primary btn-sm">Adicionar na Espera</button>
              </form>
            )}

            <div className="smart-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
              {shopWaitlist.length === 0 ? (
                <StatePanel type="empty" title="Fila de espera vazia" compact />
              ) : (
                shopWaitlist.map((item) => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-title)', fontSize: '13px' }}>{item.patientName}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => removeWaitlist(item.id)} style={{ border: 'none', background: 'none', color: 'var(--status-cancelado-text)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Remover</button>
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Tel: {item.phone}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ marginBottom: '12px', borderBottom: 'none', padding: 0 }}>
              <h3 className="card-title" style={{ fontSize: '16px' }}><AlertTriangle size={18} color="#ef4444" /> Painel de Alertas</h3>
            </div>
            <div className="smart-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
              {allAlerts.length === 0 ? (
                <StatePanel type="empty" title="Nenhum alerta ativo" compact />
              ) : (
                allAlerts.map((alert, idx) => (
                  <div key={idx} style={{ borderLeft: `4px solid ${alert.color || '#ef4444'}`, backgroundColor: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '0 var(--radius-md) var(--radius-md) 0', border: '1px solid var(--border-color)', borderLeftWidth: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      {alert.type === 'inventory' ? (
                        <button onClick={() => setActiveTab('inventory')} className="table-link" style={{ fontSize: '12px' }}>Acessar Estoque</button>
                      ) : (
                        <button onClick={() => handlePatientClick(alert.patientId)} className="table-link" style={{ fontSize: '12px' }}>{alert.patientName}</button>
                      )}
                      <StatusBadge status={alert.type === 'clinical' ? 'clinico' : (alert.type === 'inventory' ? 'falta' : 'administrativo')} label={alert.type === 'clinical' ? 'Clínico' : (alert.type === 'inventory' ? 'Estoque' : 'Admin')} />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '4px', fontWeight: 500 }}>{alert.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {cancelTarget && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '450px', padding: '28px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Confirmar Cancelamento</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {['Paciente desistiu / não pôde comparecer', 'Outro motivo'].map((reason) => (
                <label key={reason} style={{ display: 'flex', gap: '10px', fontSize: '14px' }}>
                  <input type="radio" value={reason} checked={cancelReason === reason} onChange={(e) => setCancelReason(e.target.value)} /> {reason}
                </label>
              ))}
            </div>
            {cancelReason === 'Outro motivo' && (
              <textarea className="form-control" style={{ marginBottom: '20px' }} value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setCancelTarget(null)}>Voltar</button>
              <button className="btn btn-danger" onClick={() => { updateAppointmentStatus(cancelTarget.id, 'cancelado', cancelReason); setCancelTarget(null); }}>Cancelar Agendamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
