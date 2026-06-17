import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { SERVICE_TYPES, PAYMENT_TYPES } from '../utils/mockData';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  UserCheck,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  MessageSquareCode
} from 'lucide-react';

const AgendaManager = () => {
  const {
    currentUser,
    patients,
    appointments,
    waitlist,
    professionals,
    rooms,
    addAppointment,
    updateAppointmentStatus,
    addWaitlist,
    removeWaitlist
  } = useContext(AppContext);

  const userShopId = currentUser?.shopId;

  // Filtros da Agenda
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterProfessional, setFilterProfessional] = useState('all');
  const [filterRoom, setFilterRoom] = useState('all');

  // Modais e formulários
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApp, setNewApp] = useState({
    patientId: '',
    professionalId: professionals[0]?.id || '',
    roomId: rooms[0]?.id || '',
    serviceId: 'consulta',
    paymentType: 'particular',
    date: selectedDate,
    time: '08:00',
    notes: '',
    isEncaixe: false
  });

  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [newWaitItem, setNewWaitItem] = useState({
    patientName: '',
    phone: '',
    preferredDoctor: 'Dr. Roberto Mendes',
    service: 'Consulta Geral'
  });

  const [blockedSlots, setBlockedSlots] = useState([
    { id: 'b1', date: selectedDate, time: '12:00', reason: 'Intervalo de Almoço' }
  ]);
  const [blockTime, setBlockTime] = useState('12:00');
  const [blockReason, setBlockReason] = useState('');

  // Horários de atendimento na clínica (08:00 às 18:00)
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30'
  ];

  // Adicionar bloqueio de horário
  const handleAddBlock = (e) => {
    e.preventDefault();
    if (!blockReason.trim()) return;
    setBlockedSlots((prev) => [
      ...prev,
      { id: `b-${Date.now()}`, date: selectedDate, time: blockTime, reason: blockReason }
    ]);
    setBlockReason('');
  };

  const handleRemoveBlock = (id) => {
    setBlockedSlots((prev) => prev.filter((b) => b.id !== id));
  };

  // Enviar agendamento
  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (!newApp.patientId) {
      alert('Por favor, selecione um paciente!');
      return;
    }

    const patient = patients.find((p) => p.id === newApp.patientId);
    const service = SERVICE_TYPES.find((s) => s.id === newApp.serviceId);

    // Verificar colisão de horário (se não for encaixe)
    const timeCollide = appointments.some(
      (app) =>
        app.date === newApp.date &&
        app.time === newApp.time &&
        app.roomId === newApp.roomId &&
        app.status !== 'cancelado'
    );

    if (timeCollide && !newApp.isEncaixe) {
      alert(
        'Atenção: Já existe um atendimento agendado nesta Sala e Horário. Marque a opção "É Encaixe" se desejar realizar o agendamento duplo.'
      );
      return;
    }

    // Criar agendamento
    addAppointment({
      ...newApp,
      patientName: patient ? patient.name : 'Paciente',
      serviceName: service ? service.name : 'Consulta'
    });

    setShowAddModal(false);
  };

  // Fila de espera
  const handleAddWaitlist = (e) => {
    e.preventDefault();
    if (!newWaitItem.patientName || !newWaitItem.phone) return;
    addWaitlist(newWaitItem);
    setShowWaitlistForm(false);
    setNewWaitItem({
      patientName: '',
      phone: '',
      preferredDoctor: 'Dr. Roberto Mendes',
      service: 'Consulta Geral'
    });
  };

  // Filtragem dos agendamentos do dia de acordo com as seleções e filial
  const dailyAppointments = appointments.filter((app) => {
    if (app.date !== selectedDate) return false;
    if (filterProfessional !== 'all' && app.professionalId !== filterProfessional) return false;
    if (filterRoom !== 'all' && app.roomId !== filterRoom) return false;

    // Filtro por Loja/Filial
    if (userShopId && userShopId !== 'all') {
      if (app.shop_id && app.shop_id !== userShopId) return false;
    }
    return true;
  });

  const filteredWaitlist = waitlist.filter(
    (item) => !userShopId || userShopId === 'all' || item.shop_id === userShopId || !item.shop_id
  );

  return (
    <div className="section-grid">
      {/* Coluna Esquerda: Controles, Fila de Espera e Bloqueio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Filtros da Agenda */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>
            <Calendar size={18} color="var(--primary)" /> Filtros de Visualização
          </h3>

          <div className="form-group">
            <label>Data</label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Filtrar Profissional</label>
            <select
              className="form-control"
              value={filterProfessional}
              onChange={(e) => setFilterProfessional(e.target.value)}
            >
              <option value="all">Todos os Profissionais</option>
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name} ({prof.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Filtrar Sala</label>
            <select
              className="form-control"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
            >
              <option value="all">Todas as Salas</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            onClick={() => {
              setNewApp((prev) => ({ ...prev, date: selectedDate }));
              setShowAddModal(true);
            }}
          >
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>

        {/* Bloqueio de Horários */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>
            <Clock size={18} color="var(--text-muted)" /> Bloqueios de Horário
          </h3>

          <form onSubmit={handleAddBlock} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-control"
                style={{ width: '100px' }}
                value={blockTime}
                onChange={(e) => setBlockTime(e.target.value)}
              >
                {timeSlots.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Motivo (ex: Reunião, Almoço)..."
                required
                className="form-control"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              Bloquear Horário
            </button>
          </form>

          {/* Listagem de bloqueios para o dia selecionado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {blockedSlots.filter((b) => b.date === selectedDate).length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nenhum horário bloqueado hoje.</span>
            ) : (
              blockedSlots
                .filter((b) => b.date === selectedDate)
                .map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: '12px'
                    }}
                  >
                    <strong>{b.time} - {b.reason}</strong>
                    <button
                      onClick={() => handleRemoveBlock(b.id)}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Desbloquear
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Fila de Espera */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 className="card-title">
              <User size={18} color="var(--accent)" /> Fila de Espera
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowWaitlistForm(!showWaitlistForm)}>
              {showWaitlistForm ? 'Fechar' : 'Incluir'}
            </button>
          </div>

          {showWaitlistForm && (
            <form onSubmit={handleAddWaitlist} style={{ backgroundColor: '#f8fafc', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" className="form-control" placeholder="Nome do Paciente..." required value={newWaitItem.patientName} onChange={(e) => setNewWaitItem({ ...newWaitItem, patientName: e.target.value })} />
              <input type="text" className="form-control" placeholder="Telefone..." required value={newWaitItem.phone} onChange={(e) => setNewWaitItem({ ...newWaitItem, phone: e.target.value })} />
              <select className="form-control" value={newWaitItem.preferredDoctor} onChange={(e) => setNewWaitItem({ ...newWaitItem, preferredDoctor: e.target.value })}>
                <option value="Qualquer profissional">Qualquer Profissional</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <select className="form-control" value={newWaitItem.service} onChange={(e) => setNewWaitItem({ ...newWaitItem, service: e.target.value })}>
                {SERVICE_TYPES.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary btn-sm">Salvar na Espera</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {filteredWaitlist.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fila de espera vazia.</span>
            ) : (
              filteredWaitlist.map((item) => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>{item.patientName}</span>
                    <button
                      onClick={() => removeWaitlist(item.id)}
                      style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}
                    >
                      Remover
                    </button>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>Tel: {item.phone}</span>
                  <span style={{ fontSize: '11px', marginTop: '4px' }}>
                    Doc: <strong style={{ color: 'var(--text-main)' }}>{item.preferredDoctor}</strong> | Serv: <strong style={{ color: 'var(--text-main)' }}>{item.service}</strong>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Coluna Direita: Grade Horária */}
      <div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={20} color="var(--primary)" /> Grade de Horários
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {timeSlots.map((time) => {
              // Checa se o horário está bloqueado
              const isBlocked = blockedSlots.some((b) => b.date === selectedDate && b.time === time);
              const blockInfo = blockedSlots.find((b) => b.date === selectedDate && b.time === time);

              // Filtra agendamentos específicos deste slot de tempo
              const slotAppointments = dailyAppointments.filter((app) => app.time === time);

              return (
                <div
                  key={time}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    borderBottom: '1px solid var(--border-color)',
                    minHeight: '48px',
                    backgroundColor: isBlocked ? '#f1f5f9' : '#fff'
                  }}
                >
                  {/* Horário */}
                  <div
                    style={{
                      width: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--text-muted)',
                      borderRight: '1px solid var(--border-color)',
                      backgroundColor: '#f8fafc'
                    }}
                  >
                    {time}
                  </div>

                  {/* Detalhes do horário (Agendamentos ou Bloqueio) */}
                  <div style={{ flexGrow: 1, padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                    {isBlocked ? (
                      <span style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={14} /> Horário Reservado / Bloqueado: <strong>{blockInfo?.reason}</strong>
                      </span>
                    ) : slotAppointments.length === 0 ? (
                      <button
                        onClick={() => {
                          setNewApp((prev) => ({ ...prev, time, date: selectedDate }));
                          setShowAddModal(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: '12px',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: '100%',
                          height: '100%',
                          padding: '4px 0'
                        }}
                      >
                        + Clique para agendar um paciente
                      </button>
                    ) : (
                      slotAppointments.map((app) => {
                        const doc = professionals.find((p) => p.id === app.professionalId);
                        const room = rooms.find((r) => r.id === app.roomId);

                        return (
                          <div
                            key={app.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: `var(--status-${app.status})`,
                              borderLeft: `4px solid ${doc?.color || 'var(--primary)'}`,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '14px', color: 'var(--bg-dark)' }}>{app.patientName}</strong>
                                {app.isEncaixe && (
                                  <span style={{ fontSize: '9px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#d97706', padding: '1px 5px', borderRadius: '3px' }}>
                                    ENCAIXE
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <User size={10} /> {doc?.name}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <MapPin size={10} /> {room?.name}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <FileText size={10} /> {app.serviceName || app.serviceId}
                                </span>
                              </div>
                            </div>

                            {/* Controles de Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: `var(--status-${app.status}-text)` }}>
                                {app.status}
                              </span>

                              {app.status === 'confirmado' && (
                                <div style={{ display: 'flex', gap: '2px' }}>
                                  <button
                                    onClick={() => updateAppointmentStatus(app.id, 'atendido')}
                                    style={{ border: 'none', background: '#dcfce7', color: '#166534', cursor: 'pointer', padding: '4px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}
                                    title="Marcar Atendido"
                                  >
                                    Atender
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Motivo do cancelamento:');
                                      if (reason !== null) {
                                        updateAppointmentStatus(app.id, 'cancelado', reason);
                                      }
                                    }}
                                    style={{ border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', padding: '4px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}
                                    title="Cancelar"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => updateAppointmentStatus(app.id, 'falta')}
                                    style={{ border: 'none', background: '#fef3c7', color: '#92400e', cursor: 'pointer', padding: '4px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}
                                    title="Marcar Falta"
                                  >
                                    Falta
                                  </button>
                                </div>
                              )}

                              {/* Simulador de confirmação via SMS/Whatsapp */}
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  fontSize: '10px',
                                  color: '#0d9488',
                                  backgroundColor: '#ccfbf1',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600
                                }}
                                title="Confirmado automaticamente via bot do WhatsApp"
                              >
                                <MessageSquareCode size={11} /> PWA-Bot OK
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal para agendar compromisso */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '16px' }}>Agendar Novo Atendimento</h3>
            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label>Paciente*</label>
                <select
                  className="form-control"
                  required
                  value={newApp.patientId}
                  onChange={(e) => setNewApp({ ...newApp, patientId: e.target.value })}
                >
                  <option value="">Selecione o paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (CPF: {p.cpf || 'S/N'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Data*</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={newApp.date}
                    onChange={(e) => setNewApp({ ...newApp, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Horário*</label>
                  <select
                    className="form-control"
                    value={newApp.time}
                    onChange={(e) => setNewApp({ ...newApp, time: e.target.value })}
                  >
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Médico / Especialista</label>
                  <select
                    className="form-control"
                    value={newApp.professionalId}
                    onChange={(e) => setNewApp({ ...newApp, professionalId: e.target.value })}
                  >
                    {professionals.map((prof) => (
                      <option key={prof.id} value={prof.id}>{prof.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Consultório / Sala</label>
                  <select
                    className="form-control"
                    value={newApp.roomId}
                    onChange={(e) => setNewApp({ ...newApp, roomId: e.target.value })}
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Procedimento / Serviço</label>
                  <select
                    className="form-control"
                    value={newApp.serviceId}
                    onChange={(e) => setNewApp({ ...newApp, serviceId: e.target.value })}
                  >
                    {SERVICE_TYPES.map((service) => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Modalidade de Cobrança</label>
                  <select
                    className="form-control"
                    value={newApp.paymentType}
                    onChange={(e) => setNewApp({ ...newApp, paymentType: e.target.value })}
                  >
                    {PAYMENT_TYPES.map((pay) => (
                      <option key={pay.id} value={pay.id}>{pay.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0' }}>
                <input
                  type="checkbox"
                  id="chkEncaixe"
                  checked={newApp.isEncaixe}
                  onChange={(e) => setNewApp({ ...newApp, isEncaixe: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="chkEncaixe" style={{ margin: 0 }}>
                  <strong>Agendamento Especial (Encaixe)</strong> - Permite colisão de horário na mesma sala.
                </label>
              </div>

              <div className="form-group">
                <label>Notas adicionais</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={newApp.notes}
                  onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                  Confirmar Agendamento
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaManager;
