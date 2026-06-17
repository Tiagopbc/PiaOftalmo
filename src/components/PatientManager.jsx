import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import {
  Search,
  UserPlus,
  User,
  Phone,
  FileText,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Paperclip,
  Check,
  Eye,
  Calendar
} from 'lucide-react';

const PatientManager = () => {
  const {
    patients,
    selectedPatientId,
    setSelectedPatientId,
    addPatient,
    updatePatient,
    deletePatient,
    addPrescription,
    addPurchase,
    updatePurchaseStatus,
    professionals
  } = useContext(AppContext);

  const [searchTerm, setSearchTerm] = useState('');
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

  // Formulário de receita
  const [showRxForm, setShowRxForm] = useState(false);
  const [newRx, setNewRx] = useState({
    doctor: professionals[0]?.name || '',
    od: { esferico: '', cilindrico: '', eixo: '', adicao: '', dnp: '' },
    oe: { esferico: '', cilindrico: '', eixo: '', adicao: '', dnp: '' },
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
  const [attachmentName, setAttachmentName] = useState('');

  // Filtrar pacientes
  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.cpf.includes(term) ||
      p.rg.includes(term)
    );
  });

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;

  const handleCreatePatient = (e) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.birthDate) {
      alert('Nome e Data de Nascimento são obrigatórios!');
      return;
    }
    const created = addPatient(newPatient);
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
  };

  const handleAddAlert = (e) => {
    e.preventDefault();
    if (!alertText.trim() || !selectedPatient) return;

    const newAlertObj = {
      id: `a-${Date.now()}`,
      type: alertType,
      text: alertText,
      color: alertType === 'clinical' ? '#ef4444' : '#f59e0b'
    };

    const updated = {
      ...selectedPatient,
      alerts: [...(selectedPatient.alerts || []), newAlertObj],
      timeline: [
        {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'system',
          title: `Alerta Adicionado (${alertType === 'clinical' ? 'Clínico' : 'Adm'})`,
          desc: alertText
        },
        ...selectedPatient.timeline
      ]
    };

    updatePatient(updated);
    setAlertText('');
  };

  const handleRemoveAlert = (alertId) => {
    if (!selectedPatient) return;
    const updated = {
      ...selectedPatient,
      alerts: selectedPatient.alerts.filter((a) => a.id !== alertId)
    };
    updatePatient(updated);
  };

  const handleAddRx = (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    addPrescription(selectedPatient.id, newRx);
    setShowRxForm(false);
    setNewRx({
      doctor: professionals[0]?.name || '',
      od: { esferico: '', cilindrico: '', eixo: '', adicao: '', dnp: '' },
      oe: { esferico: '', cilindrico: '', eixo: '', adicao: '', dnp: '' },
      lensType: '',
      notes: ''
    });
  };

  const handleAddPurchase = (e) => {
    e.preventDefault();
    if (!selectedPatient || !newPurchase.item || !newPurchase.value) return;
    const osNum = newPurchase.osNumber || `OS-${Math.floor(1000 + Math.random() * 9000)}`;
    addPurchase(selectedPatient.id, {
      ...newPurchase,
      osNumber: osNum
    });
    setShowPurchaseForm(false);
    setNewPurchase({ osNumber: '', item: '', value: '' });
  };

  const handleAddAttachment = (e) => {
    e.preventDefault();
    if (!attachmentName.trim() || !selectedPatient) return;

    const newAtt = {
      id: `att-${Date.now()}`,
      name: attachmentName,
      date: new Date().toISOString().split('T')[0],
      size: 'Simulado (KB)'
    };

    const updated = {
      ...selectedPatient,
      attachments: [...(selectedPatient.attachments || []), newAtt],
      timeline: [
        {
          id: `t-${Date.now()}`,
          date: newAtt.date,
          type: 'system',
          title: 'Arquivo Anexado',
          desc: `Documento "${attachmentName}" anexado com sucesso.`
        },
        ...selectedPatient.timeline
      ]
    };
    updatePatient(updated);
    setAttachmentName('');
  };

  const handleDeletePatientClick = (id) => {
    if (confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
      deletePatient(id);
      setSelectedPatientId(null);
    }
  };

  return (
    <div className="section-grid">
      {/* Coluna Esquerda: Lista de Pacientes e Busca */}
      <div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Cadastro de Pacientes</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
              <UserPlus size={16} /> Novo Paciente
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por Nome, CPF ou RG..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '450px', overflowY: 'auto' }}>
            {filteredPatients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                Nenhum paciente encontrado.
              </div>
            ) : (
              filteredPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setShowAddForm(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: selectedPatientId === p.id ? 'var(--primary-light)' : '#fff',
                    borderColor: selectedPatientId === p.id ? 'var(--primary)' : 'var(--border-color)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '15px', color: selectedPatientId === p.id ? 'var(--primary)' : 'var(--bg-dark)' }}>
                      {p.name} {p.isMinor && <span style={{ fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>MENOR</span>}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      CPF: {p.cpf || 'Não cadastrado'} | Fone: {p.phone}
                    </span>
                  </div>
                  {p.alerts && p.alerts.length > 0 && (
                    <span className="badge-alert" title="Alertas Ativos">
                      <AlertTriangle size={12} /> {p.alerts.length}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Coluna Direita: Detalhes ou Formulário de Cadastro */}
      <div>
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
                  <label>CPF</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="xxx.xxx.xxx-xx"
                    value={newPatient.cpf}
                    onChange={(e) => setNewPatient({ ...newPatient, cpf: e.target.value })}
                  />
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
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="(xx) xxxxx-xxxx"
                    value={newPatient.whatsapp}
                    onChange={(e) => setNewPatient({ ...newPatient, whatsapp: e.target.value })}
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
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
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
                        value={newPatient.guardian.cpf}
                        onChange={(e) =>
                          setNewPatient({
                            ...newPatient,
                            guardian: { ...newPatient.guardian, cpf: e.target.value }
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Telefone do Responsável</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newPatient.guardian.phone}
                        onChange={(e) =>
                          setNewPatient({
                            ...newPatient,
                            guardian: { ...newPatient.guardian, phone: e.target.value }
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
                  rows="3"
                  value={newPatient.notes}
                  onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Salvar Cadastro
              </button>
            </form>
          </div>
        ) : selectedPatient ? (
          /* Visualização de Detalhes do Paciente */
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={24} color="var(--primary)" />
                    {selectedPatient.name}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                    ID do Paciente: {selectedPatient.id} | Sexo: {selectedPatient.gender}
                  </p>
                </div>
                <button
                  onClick={() => handleDeletePatientClick(selectedPatient.id)}
                  className="btn btn-danger btn-sm"
                  style={{ padding: '6px' }}
                  title="Excluir Ficha"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Grid de Informações Cadastrais */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  fontSize: '13px',
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div><strong>Nascimento:</strong> {new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR')}</div>
                <div><strong>CPF:</strong> {selectedPatient.cpf || '-'}</div>
                <div><strong>RG:</strong> {selectedPatient.rg || '-'}</div>
                <div><strong>Telefone:</strong> {selectedPatient.phone || '-'}</div>
                <div><strong>WhatsApp:</strong> {selectedPatient.whatsapp || '-'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>E-mail:</strong> {selectedPatient.email || '-'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Endereço:</strong> {selectedPatient.address || '-'}</div>
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
                          backgroundColor: a.type === 'clinical' ? '#fee2e2' : '#fef3c7',
                          color: a.type === 'clinical' ? '#ef4444' : '#d97706',
                          border: `1px solid ${a.type === 'clinical' ? '#fecaca' : '#fde68a'}`,
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
                          onClick={() => handleRemoveAlert(a.id)}
                          style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nenhum alerta para este paciente.</span>
                  )}
                </div>

                <form onSubmit={handleAddAlert} style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-control"
                    style={{ width: '120px', padding: '6px' }}
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value)}
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
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '8px 12px' }}>
                    <Plus size={16} />
                  </button>
                </form>
              </div>

              {/* Sub-Navegação interna (Abas do Prontuário) */}
              <div className="tab-container" style={{ marginBottom: '16px' }}>
                <button className={`tab-btn ${activeSubTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveSubTab('timeline')}>
                  Linha do Tempo
                </button>
                <button className={`tab-btn ${activeSubTab === 'rx' ? 'active' : ''}`} onClick={() => setActiveSubTab('rx')}>
                  Receitas ({selectedPatient.prescriptions?.length || 0})
                </button>
                <button className={`tab-btn ${activeSubTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveSubTab('purchases')}>
                  Compras / OS ({selectedPatient.purchases?.length || 0})
                </button>
                <button className={`tab-btn ${activeSubTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveSubTab('docs')}>
                  Documentos ({selectedPatient.attachments?.length || 0})
                </button>
              </div>

              {/* Conteúdo das Abas */}
              {activeSubTab === 'timeline' && (
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Linha do Tempo do Paciente</h4>
                  <div className="timeline-list">
                    {selectedPatient.timeline && selectedPatient.timeline.length > 0 ? (
                      selectedPatient.timeline.map((node) => (
                        <div key={node.id} className="timeline-node">
                          <div className={`timeline-dot ${node.type}`}></div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-title">{node.title}</span>
                              <span className="timeline-date">{new Date(node.date).toLocaleDateString('pt-BR')}</span>
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
                    <form onSubmit={handleAddRx} style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', backgroundColor: '#f8fafc' }}>
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

                      {/* Olho Direito */}
                      <h5 style={{ fontSize: '13px', margin: '12px 0 6px' }}>Olho Direito (OD)</h5>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Esférico</label>
                          <input type="text" placeholder="Ex: -2.25" className="form-control" value={newRx.od.esferico} onChange={(e) => setNewRx({ ...newRx, od: { ...newRx.od, esferico: e.target.value } })} />
                        </div>
                        <div className="form-group">
                          <label>Cilíndrico</label>
                          <input type="text" placeholder="Ex: -0.50" className="form-control" value={newRx.od.cilindrico} onChange={(e) => setNewRx({ ...newRx, od: { ...newRx.od, cilindrico: e.target.value } })} />
                        </div>
                        <div className="form-group">
                          <label>Eixo (°)</label>
                          <input type="text" placeholder="Ex: 90" className="form-control" value={newRx.od.eixo} onChange={(e) => setNewRx({ ...newRx, od: { ...newRx.od, eixo: e.target.value } })} />
                        </div>
                        <div className="form-group">
                          <label>Adição</label>
                          <input type="text" placeholder="Ex: +1.50" className="form-control" value={newRx.od.adicao} onChange={(e) => setNewRx({ ...newRx, od: { ...newRx.od, adicao: e.target.value } })} />
                        </div>
                        <div className="form-group">
                          <label>DNP (mm)</label>
                          <input type="text" placeholder="Ex: 31.5" className="form-control" value={newRx.od.dnp} onChange={(e) => setNewRx({ ...newRx, od: { ...newRx.od, dnp: e.target.value } })} />
                        </div>
                      </div>

                      {/* Olho Esquerdo */}
                      <h5 style={{ fontSize: '13px', margin: '12px 0 6px' }}>Olho Esquerdo (OE)</h5>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Esférico</label>
                          <input type="text" placeholder="Ex: -2.00" className="form-control" value={newRx.oe.esferico} onChange={(e) => setNewRx({ ...newRx, oe: { ...newRx.oe, esferico: e.target.value } })} />
                        </div>
                        <div className="form-group">
                          <label>Cilíndrico</label>
                          <input type="text" placeholder="Ex: -0.75" className="form-control" value={newRx.oe.cilindrico} onChange={(e) => setNewRx({ ...newRx, oe: { ...newRx.oe, cilindrico: e.target.value } })} />
                        </div>
                        <div className="form-group">
                          <label>Eixo (°)</label>
                          <input type="text" placeholder="Ex: 85" className="form-control" value={newRx.oe.eixo} onChange={(e) => setNewRx({ ...newRx, oe: { ...newRx.oe, eixo: e.target.value } })} />
                        </div>
                        <div className="form-group">
                          <label>Adição</label>
                          <input type="text" placeholder="Ex: +1.50" className="form-control" value={newRx.oe.adicao} onChange={(e) => setNewRx({ ...newRx, oe: { ...newRx.oe, adicao: e.target.value } })} />
                        </div>
                        <div className="form-group">
                          <label>DNP (mm)</label>
                          <input type="text" placeholder="Ex: 32.0" className="form-control" value={newRx.oe.dnp} onChange={(e) => setNewRx({ ...newRx, oe: { ...newRx.oe, dnp: e.target.value } })} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Tipo de Lente Recomendado</label>
                        <input type="text" placeholder="Ex: Multifocal Antirreflexo" className="form-control" value={newRx.lensType} onChange={(e) => setNewRx({ ...newRx, lensType: e.target.value })} />
                      </div>

                      <div className="form-group">
                        <label>Notas adicionais de Receita</label>
                        <input type="text" className="form-control" value={newRx.notes} onChange={(e) => setNewRx({ ...newRx, notes: e.target.value })} />
                      </div>

                      <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                        Gravar e Emitir Receita
                      </button>
                    </form>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedPatient.prescriptions && selectedPatient.prescriptions.length > 0 ? (
                      selectedPatient.prescriptions.map((rx) => (
                        <div key={rx.id} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                            <strong>Dr(a). {rx.doctor}</strong>
                            <span style={{ color: 'var(--text-muted)' }}>{new Date(rx.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th>Olho</th>
                                <th>Esférico</th>
                                <th>Cilíndrico</th>
                                <th>Eixo</th>
                                <th>Adição</th>
                                <th>DNP</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td><strong>OD</strong></td>
                                <td>{rx.od.esferico || 'Plano'}</td>
                                <td>{rx.od.cilindrico || '-'}</td>
                                <td>{rx.od.eixo || '-'}°</td>
                                <td>{rx.od.adicao || '-'}</td>
                                <td>{rx.od.dnp || '-'} mm</td>
                              </tr>
                              <tr>
                                <td><strong>OE</strong></td>
                                <td>{rx.oe.esferico || 'Plano'}</td>
                                <td>{rx.oe.cilindrico || '-'}</td>
                                <td>{rx.oe.eixo || '-'}°</td>
                                <td>{rx.oe.adicao || '-'}</td>
                                <td>{rx.oe.dnp || '-'} mm</td>
                              </tr>
                            </tbody>
                          </table>
                          {rx.lensType && <p style={{ fontSize: '12px' }}><strong>Lente Sugerida:</strong> {rx.lensType}</p>}
                          {rx.notes && <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>"{rx.notes}"</p>}
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhuma receita emitida anteriormente.</p>
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
                    <form onSubmit={handleAddPurchase} style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', backgroundColor: '#f8fafc' }}>
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
                    {selectedPatient.purchases && selectedPatient.purchases.length > 0 ? (
                      selectedPatient.purchases.map((pur) => (
                        <div key={pur.id} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '14px' }}>{pur.osNumber}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(pur.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <p style={{ fontSize: '13px', margin: '4px 0' }}>{pur.item}</p>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--bg-dark)' }}>R$ {parseFloat(pur.value).toFixed(2)}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#475569' }}>
                              {pur.status}
                            </span>
                            <select
                              value={pur.status}
                              onChange={(e) => updatePurchaseStatus(selectedPatient.id, pur.id, e.target.value)}
                              className="form-control"
                              style={{ width: '150px', fontSize: '11px', padding: '4px' }}
                            >
                              <option>Aguardando Laboratório</option>
                              <option>Em Produção</option>
                              <option>Pronto para Retirada</option>
                              <option>Entregue</option>
                              <option>Aguardando Pagamento</option>
                              <option>Cancelado</option>
                            </select>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhuma compra registrada.</p>
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'docs' && (
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Anexos e Documentos</h4>
                  <form onSubmit={handleAddAttachment} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nome do laudo/documento..."
                      required
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Paperclip size={14} /> Anexar
                    </button>
                  </form>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedPatient.attachments && selectedPatient.attachments.length > 0 ? (
                      selectedPatient.attachments.map((doc) => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', fontSize: '13px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} color="var(--primary)" />
                            <strong>{doc.name}</strong>
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {doc.date}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum laudo ou exame anexado.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Estado Inicial - Nenhum Paciente Selecionado */
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
            <User size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>Selecione um paciente na lista ou crie um novo cadastro.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientManager;
