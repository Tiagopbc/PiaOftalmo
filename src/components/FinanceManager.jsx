import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { DollarSign, Percent, AlertCircle, CheckSquare, Search, Eye, Users } from 'lucide-react';

const FinanceManager = () => {
  const {
    patients,
    appointments,
    updatePurchaseStatus,
    setActiveTab,
    setSelectedPatientId,
    professionals
  } = useContext(AppContext);

  const [activeSubTab, setActiveSubTab] = useState('receivables'); // receivables, commissions, stats
  const [selectedProfId, setSelectedProfId] = useState(professionals[0]?.id || '1');

  // Preço padrão para consultas particulares (para fins de simulação financeira)
  const PRIVATE_CONSULTATION_PRICE = 350.00;
  const INSURANCE_CONSULTATION_FEE = 120.00;

  // Obter todas as compras/OS de todos os pacientes
  const allPurchases = patients.flatMap((p) =>
    (p.purchases || []).map((pur) => ({
      ...pur,
      patientName: p.name,
      patientId: p.id
    }))
  );

  // Calcular métricas
  const totalOpticalSales = allPurchases
    .filter((pur) => pur.status !== 'Cancelado')
    .reduce((acc, pur) => acc + parseFloat(pur.value || 0), 0);

  // Consultas particulares faturadas (apenas atendidas)
  const atendidoParticularApps = appointments.filter(
    (app) => app.paymentType === 'particular' && app.status === 'atendido'
  );
  const totalClinicalPrivateSales = atendidoParticularApps.length * PRIVATE_CONSULTATION_PRICE;

  // Consultas por convênio faturadas (apenas atendidas)
  const atendidoInsuranceApps = appointments.filter(
    (app) => app.paymentType === 'convenio' && app.status === 'atendido'
  );
  const totalClinicalInsuranceSales = atendidoInsuranceApps.length * INSURANCE_CONSULTATION_FEE;

  const totalClinicalSales = totalClinicalPrivateSales + totalClinicalInsuranceSales;
  const totalRevenue = totalOpticalSales + totalClinicalSales;

  // Contas a receber (OS pendentes de pagamento)
  const unpaidPurchases = allPurchases.filter((pur) => pur.status === 'Aguardando Pagamento');
  const totalReceivables = unpaidPurchases.reduce((acc, pur) => acc + parseFloat(pur.value || 0), 0);

  // Manipular redirecionamento para o paciente
  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    setActiveTab('patients');
  };

  // Liquidar pagamento
  const handleSettlePayment = (patientId, purchaseId) => {
    updatePurchaseStatus(patientId, purchaseId, 'Entregue');
    alert('Pagamento recebido com sucesso! A Ordem de Serviço foi marcada como Entregue e o alerta financeiro foi removido do prontuário.');
  };

  // Calcular comissões para o profissional selecionado
  const selectedProf = professionals.find((p) => p.id === selectedProfId);
  const profApps = appointments.filter(
    (app) => app.professionalId === selectedProfId && app.status === 'atendido'
  );

  // Regra de comissão: 40% de consultas particulares, R$ 40 fixo por consulta de convênio
  const profPrivateApps = profApps.filter((app) => app.paymentType === 'particular');
  const profInsuranceApps = profApps.filter((app) => app.paymentType === 'convenio');

  const privateCommission = profPrivateApps.length * (PRIVATE_CONSULTATION_PRICE * 0.40);
  const insuranceCommission = profInsuranceApps.length * 40.00;
  const totalCommission = privateCommission + insuranceCommission;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700 }}>Gestão Financeira</h2>
        <p style={{ color: 'var(--text-muted)' }}>Demonstrativo financeiro da clínica e da ótica integrada</p>
      </div>

      {/* Grid de Métricas Financeiras */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">R$ {totalRevenue.toFixed(2)}</div>
            <div className="stat-label">Faturamento Total</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon primary">
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">R$ {totalOpticalSales.toFixed(2)}</div>
            <div className="stat-label">Receita da Ótica</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon accent">
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">R$ {totalClinicalSales.toFixed(2)}</div>
            <div className="stat-label">Receita Médica</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <AlertCircle size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">R$ {totalReceivables.toFixed(2)}</div>
            <div className="stat-label">Contas a Receber</div>
          </div>
        </div>
      </div>

      {/* Grid de Conteúdo */}
      <div className="section-grid">
        {/* Lado Esquerdo: Painel de Controle e Abas */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="tab-container" style={{ marginBottom: '20px' }}>
            <button
              className={`tab-btn ${activeSubTab === 'receivables' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('receivables')}
            >
              Contas a Receber ({unpaidPurchases.length})
            </button>
            <button
              className={`tab-btn ${activeSubTab === 'commissions' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('commissions')}
            >
              Comissões de Especialistas
            </button>
            <button
              className={`tab-btn ${activeSubTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('stats')}
            >
              Distribuição de Faturamento
            </button>
          </div>

          {/* Aba: Contas a Receber */}
          {activeSubTab === 'receivables' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', margin: '0 0 4px' }}>Pendências Financeiras Ativas</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  Lista de ordens de serviço pendentes de pagamento. A quitação remove o bloqueio administrativo na ficha do paciente.
                </p>
              </div>

              {unpaidPurchases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Excelente! Nenhuma pendência financeira em aberto no momento.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Nº OS</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Paciente</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Item Adquirido</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Data do Pedido</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Valor do Débito</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidPurchases.map((pur) => (
                        <tr key={pur.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>{pur.osNumber}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() => handlePatientClick(pur.patientId)}
                              style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                            >
                              {pur.patientName}
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px' }}>{pur.item}</td>
                          <td style={{ padding: '12px 16px' }}>{new Date(pur.date).toLocaleDateString('pt-BR')}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>
                            R$ {parseFloat(pur.value).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                              onClick={() => handleSettlePayment(pur.patientId, pur.id)}
                            >
                              <CheckSquare size={14} /> Dar Baixa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Aba: Comissões */}
          {activeSubTab === 'commissions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '16px', margin: '0 0 4px' }}>Cálculo de Comissões de Atendimento</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                    Repasse financeiro calculado com base nos atendimentos realizados e confirmados.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Especialista:</label>
                  <select
                    className="form-control"
                    style={{ width: '220px', padding: '8px' }}
                    value={selectedProfId}
                    onChange={(e) => setSelectedProfId(e.target.value)}
                  >
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Detalhes de repasse do profissional */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyOrigin: 'center', margin: '0 auto 12px', justifyContent: 'center' }}>
                      {selectedProf?.name.split(' ').slice(-1)[0][0]}
                    </div>
                    <h5 style={{ fontSize: '16px', margin: 0 }}>{selectedProf?.name}</h5>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedProf?.specialty}</span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                      <span>Consultas Particulares:</span>
                      <strong>{profPrivateApps.length} (40% comissão)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                      <span>Consultas Convênio:</span>
                      <strong>{profInsuranceApps.length} (R$ 40,00 fixo)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px' }}>
                      <span>Total Comissão:</span>
                      <span style={{ color: 'var(--accent)' }}>R$ {totalCommission.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 style={{ fontSize: '14px', marginBottom: '12px' }}>Atendimentos Faturados</h5>
                  {profApps.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      Nenhum atendimento finalizado registrado para este especialista.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                      {profApps.map((app) => {
                        const appValue = app.paymentType === 'particular' ? PRIVATE_CONSULTATION_PRICE : INSURANCE_CONSULTATION_FEE;
                        const commValue = app.paymentType === 'particular' ? (PRIVATE_CONSULTATION_PRICE * 0.40) : 40.00;
                        return (
                          <div key={app.id} style={{ display: 'flex', justifyOrigin: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', justifyContent: 'space-between', fontSize: '13px' }}>
                            <div>
                              <strong style={{ color: 'var(--bg-dark)' }}>{app.patientName}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Data: {new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR')} | Procedimento: {app.serviceName || app.serviceId}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '11px', backgroundColor: app.paymentType === 'particular' ? '#ecfdf5' : '#f0f9ff', color: app.paymentType === 'particular' ? '#059669' : '#0284c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                {app.paymentType}
                              </span>
                              <div style={{ fontWeight: 700, marginTop: '4px', color: 'var(--bg-dark)' }}>Comissão: R$ {commValue.toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Aba: Estatísticas de Distribuição */}
          {activeSubTab === 'stats' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '16px', margin: '0 0 4px' }}>Composição do Faturamento</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  Divisão visual das origens do faturamento entre serviços médicos e vendas da ótica.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
                {/* Distribuição Ótica vs Médica */}
                <div>
                  <h5 style={{ fontSize: '14px', marginBottom: '16px' }}>Origem do Faturamento</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Linha Ótica */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Ótica & Acessórios</span>
                        <strong>R$ {totalOpticalSales.toFixed(2)} ({totalRevenue > 0 ? ((totalOpticalSales / totalRevenue) * 100).toFixed(0) : 0}%)</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${totalRevenue > 0 ? (totalOpticalSales / totalRevenue) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '4px' }}></div>
                      </div>
                    </div>

                    {/* Linha Clínica */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Consultas & Procedimentos</span>
                        <strong>R$ {totalClinicalSales.toFixed(2)} ({totalRevenue > 0 ? ((totalClinicalSales / totalRevenue) * 100).toFixed(0) : 0}%)</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${totalRevenue > 0 ? (totalClinicalSales / totalRevenue) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distribuição Clínica: Particular vs Convênio */}
                <div>
                  <h5 style={{ fontSize: '14px', marginBottom: '16px' }}>Detalhamento Clínico (Convênios)</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Particular */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Consultas Particulares</span>
                        <strong>R$ {totalClinicalPrivateSales.toFixed(2)} ({totalClinicalSales > 0 ? ((totalClinicalPrivateSales / totalClinicalSales) * 100).toFixed(0) : 0}%)</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${totalClinicalSales > 0 ? (totalClinicalPrivateSales / totalClinicalSales) * 100 : 0}%`, height: '100%', backgroundColor: '#059669', borderRadius: '4px' }}></div>
                      </div>
                    </div>

                    {/* Convênio */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Repasses de Convênio (Unimed)</span>
                        <strong>R$ {totalClinicalInsuranceSales.toFixed(2)} ({totalClinicalSales > 0 ? ((totalClinicalInsuranceSales / totalClinicalSales) * 100).toFixed(0) : 0}%)</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${totalClinicalSales > 0 ? (totalClinicalInsuranceSales / totalClinicalSales) * 100 : 0}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceManager;
