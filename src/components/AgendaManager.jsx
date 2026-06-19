import { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { SERVICE_TYPES, PAYMENT_TYPES } from '../utils/mockData';
import { timeToMinutes, isTimeInSlot, getTimeOptions } from '../utils/helpers';
import PageHeader from './PageHeader';
import { StatusBadge } from './StatusBadge';
import { StatePanel } from './StatePanel';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  Plus,
  AlertCircle,
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
  const activePatients = patients.filter((patient) => patient.isActive !== false);

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
    const newAppMin = timeToMinutes(newApp.time);

    // Verificar colisão de horário (intervalo menor que 15 minutos) na mesma sala
    const roomConflict = appointments.find(
      (app) =>
        app.date === newApp.date &&
        app.roomId === newApp.roomId &&
        app.status !== 'cancelado' &&
        Math.abs(timeToMinutes(app.time) - newAppMin) < 15
    );

    // Verificar colisão de horário (intervalo menor que 15 minutos) para o mesmo profissional
    const professionalConflict = appointments.find(
      (app) =>
        app.date === newApp.date &&
        app.professionalId === newApp.professionalId &&
        app.status !== 'cancelado' &&
        Math.abs(timeToMinutes(app.time) - newAppMin) < 15
    );

    if (roomConflict) {
      if (roomConflict.time === newApp.time) {
        alert(
          `Erro: Já existe um atendimento agendado exatamente neste mesmo horário nesta sala (Paciente: ${roomConflict.patientName}).`
        );
      } else {
        alert(
          `Erro: O intervalo entre agendamentos nesta sala deve ser de pelo menos 15 minutos. Conflito com ${roomConflict.patientName} às ${roomConflict.time}.`
        );
      }
      return;
    }

    if (professionalConflict) {
      if (professionalConflict.time === newApp.time) {
        alert(
          `Erro: Já existe um atendimento agendado exatamente neste mesmo horário para este profissional (Paciente: ${professionalConflict.patientName}).`
        );
      } else {
        alert(
          `Erro: O intervalo entre agendamentos para este profissional deve ser de pelo menos 15 minutos. Conflito com ${professionalConflict.patientName} às ${professionalConflict.time}.`
        );
      }
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

  const openNewAppointment = () => {
    setNewApp((prev) => ({
      ...prev,
      date: selectedDate,
      isEncaixe: false,
      time: '08:00'
    }));
    setShowAddModal(true);
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Atendimento"
        title="Agenda & Consultas"
        description="Organize a rotina clínica, bloqueios de horário e a fila de espera."
        meta={`${dailyAppointments.length} ${dailyAppointments.length === 1 ? 'agendamento' : 'agendamentos'} na data selecionada`}
        actions={(
          <button className="btn btn-primary" onClick={openNewAppointment}>
            <Plus size={17} /> Novo agendamento
          </button>
        )}
      />

      <div className="section-grid agenda-layout">
      {/* Coluna Esquerda: Controles, Fila de Espera e Bloqueio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Filtros da Agenda */}
        <div className="card card-compact">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>
            <Calendar size={18} color="var(--primary)" /> Filtros de Visualização
          </h3>

          <div className="form-group">
            <label htmlFor="agenda-filter-date">Data</label>
            <input
              id="agenda-filter-date"
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="agenda-filter-professional">Filtrar Profissional</label>
            <select
              id="agenda-filter-professional"
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
            <label htmlFor="agenda-filter-room">Filtrar Sala</label>
            <select
              id="agenda-filter-room"
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
                aria-label="Horário do bloqueio"
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
                aria-label="Motivo do bloqueio"
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              Bloquear Horário
            </button>
          </form>

          {/* Listagem de bloqueios para o dia selecionado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {blockedSlots.filter((b) => b.date === selectedDate).length === 0 ? (
              <StatePanel
                type="empty"
                title="Nenhum bloqueio nesta data"
                description="Os horários estão disponíveis para agendamento."
                compact
              />
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
                      backgroundColor: 'var(--status-cancelado)',
                      color: 'var(--status-cancelado-text)',
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
            <form onSubmit={handleAddWaitlist} style={{ backgroundColor: 'var(--bg-primary)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" className="form-control" placeholder="Nome do Paciente..." aria-label="Nome do paciente na fila de espera" required value={newWaitItem.patientName} onChange={(e) => setNewWaitItem({ ...newWaitItem, patientName: e.target.value })} />
              <input type="text" className="form-control" placeholder="Telefone..." aria-label="Telefone do paciente na fila de espera" required value={newWaitItem.phone} onChange={(e) => setNewWaitItem({ ...newWaitItem, phone: e.target.value })} />
              <select className="form-control" aria-label="Profissional preferido" value={newWaitItem.preferredDoctor} onChange={(e) => setNewWaitItem({ ...newWaitItem, preferredDoctor: e.target.value })}>
                <option value="Qualquer profissional">Qualquer Profissional</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <select className="form-control" aria-label="Serviço desejado" value={newWaitItem.service} onChange={(e) => setNewWaitItem({ ...newWaitItem, service: e.target.value })}>
                {SERVICE_TYPES.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary btn-sm">Salvar na Espera</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {filteredWaitlist.length === 0 ? (
              <StatePanel
                type="empty"
                title="Fila de espera vazia"
                description="Inclua pacientes que aguardam um horário."
                compact
              />
            ) : (
              filteredWaitlist.map((item) => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>{item.patientName}</span>
                    <button
                      type="button"
                      onClick={() => removeWaitlist(item.id)}
                      aria-label={`Remover ${item.patientName} da fila de espera`}
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

              // Filtra agendamentos específicos deste slot de tempo e ordena cronologicamente
              const slotAppointments = dailyAppointments
                .filter((app) => isTimeInSlot(app.time, time))
                .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

              return (
                <div
                  key={time}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    borderBottom: '1px solid var(--border-color)',
                    minHeight: '48px',
                    backgroundColor: isBlocked ? 'var(--bg-primary)' : 'var(--bg-secondary)'
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
                      backgroundColor: 'var(--bg-primary)'
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
                          setNewApp((prev) => ({
                            ...prev,
                            time,
                            date: selectedDate,
                            isEncaixe: false
                          }));
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
                            className="agenda-appointment-card"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: 'var(--bg-primary)',
                              borderLeft: `4px solid ${doc?.color || 'var(--primary)'}`,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <div className="agenda-appointment-copy">
                              <div className="agenda-appointment-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '14px', color: 'var(--text-title)' }}>
                                  {app.time} - {app.patientName}
                                </strong>
                                {app.isEncaixe && (
                                  <StatusBadge status="encaixe" />
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
                            <div className="agenda-appointment-controls">
                              <StatusBadge status={app.status} />

                              {app.status === 'confirmado' && (
                                <div className="agenda-appointment-actions">
                                  <button
                                    onClick={() => updateAppointmentStatus(app.id, 'atendido')}
                                    className="btn btn-success btn-sm"
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
                                    className="btn btn-danger btn-sm"
                                    title="Cancelar"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => updateAppointmentStatus(app.id, 'falta')}
                                    className="btn btn-secondary btn-sm"
                                    title="Marcar Falta"
                                  >
                                    Falta
                                  </button>
                                </div>
                              )}

                              {/* Simulador de confirmação via SMS/Whatsapp */}
                              <span
                                className="agenda-bot-badge"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  fontSize: '11px',
                                  color: 'var(--accent)',
                                  backgroundColor: 'var(--accent-light)',
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
      </div>

      {/* Modal para agendar compromisso */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="appointment-dialog-title">
            <h3 id="appointment-dialog-title" style={{ marginBottom: '16px' }}>Agendar Novo Atendimento</h3>
            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label htmlFor="appointment-patient">Paciente*</label>
                <select
                  id="appointment-patient"
                  className="form-control"
                  required
                  value={newApp.patientId}
                  onChange={(e) => setNewApp({ ...newApp, patientId: e.target.value })}
                >
                  <option value="">Selecione o paciente...</option>
                  {activePatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (CPF: {p.cpf || 'S/N'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="appointment-date">Data*</label>
                  <input
                    id="appointment-date"
                    type="date"
                    className="form-control"
                    required
                    value={newApp.date}
                    onChange={(e) => setNewApp({ ...newApp, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="appointment-time">Horário*</label>
                  <select
                    id="appointment-time"
                    className="form-control"
                    value={newApp.time}
                    onChange={(e) => setNewApp({ ...newApp, time: e.target.value })}
                  >
                    {getTimeOptions(newApp.isEncaixe).map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="appointment-professional">Médico / Especialista</label>
                  <select
                    id="appointment-professional"
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
                  <label htmlFor="appointment-room">Consultório / Sala</label>
                  <select
                    id="appointment-room"
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
                  <label htmlFor="appointment-service">Procedimento / Serviço</label>
                  <select
                    id="appointment-service"
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
                  <label htmlFor="appointment-payment">Modalidade de Cobrança</label>
                  <select
                    id="appointment-payment"
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
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setNewApp((prev) => {
                      let updatedTime = prev.time;
                      if (!checked) {
                        // Se desmarcar encaixe, ajusta o horário para frações de 30 minutos (arredonda :15 para :00 e :45 para :30)
                        const [h, m] = prev.time.split(':').map(Number);
                        if (m === 15) {
                          updatedTime = `${h.toString().padStart(2, '0')}:00`;
                        } else if (m === 45) {
                          updatedTime = `${h.toString().padStart(2, '0')}:30`;
                        }
                      }
                      return { ...prev, isEncaixe: checked, time: updatedTime };
                    });
                  }}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="chkEncaixe" style={{ margin: 0 }}>
                  <strong>Agendamento Especial (Encaixe)</strong> - Permite colisão de horário na mesma sala.
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="appointment-notes">Notas adicionais</label>
                <textarea
                  id="appointment-notes"
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
