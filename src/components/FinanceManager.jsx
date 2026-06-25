import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { saleService } from '../services/saleService';
import { useAppointments } from '../context/AppointmentContext';
import { useApp } from '../context/AppContext';
import { DollarSign, AlertCircle, CheckSquare } from 'lucide-react';
import { calculateCommission } from '../utils/helpers';
import PageHeader from './PageHeader';
import { StatusBadge } from './StatusBadge';
import { StatePanel } from './StatePanel';

const FinanceManager = () => {
  const { currentUser } = useAuth();
  const [sales, setSales] = useState([]);
  useEffect(() => {
    saleService.getAll().then(setSales).catch(console.error);
  }, []);

  const updatePurchaseStatus = async (patientId, purchaseId, status) => {
    try {
      await saleService.updateSaleStatus(purchaseId, status);
      const newSales = await saleService.getAll();
      setSales(newSales);
    } catch(e) { console.error(e); }
  };
  const { appointments } = useAppointments();
  const { setActiveTab, setSelectedPatientId, professionals } = useApp();

  const formatValue = (val) => {
    const num = Number(val);
    return (isNaN(num) ? 0 : num).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const [activeSubTab, setActiveSubTab] = useState('receivables'); // receivables, commissions, stats
  const [selectedProfId, setSelectedProfId] = useState(professionals[0]?.id || '1');
  const [selectedShopFilter, setSelectedShopFilter] = useState(() => {
    return currentUser?.shopId || 'all';
  });

  // Preço padrão para consultas particulares (para fins de simulação financeira)
  const PRIVATE_CONSULTATION_PRICE = 350.00;
  const INSURANCE_CONSULTATION_FEE = 120.00;

  const allPurchases = sales.map(s => ({
    ...s,
    value: s.totalAmount,
    item: s.notes || 'Produto',
    osNumber: s.notes || '-',
    patientName: 'Paciente'
  }));

  // Filtrar dados pela loja selecionada
  const filteredPurchases = allPurchases.filter((pur) => {
    if (selectedShopFilter === 'all') return true;
    return pur.shop_id === selectedShopFilter;
  });

  const filteredAppointments = appointments.filter((app) => {
    if (selectedShopFilter === 'all') return true;
    return app.shop_id === selectedShopFilter;
  });

  // Calcular métricas com base nos filtros
  const totalOpticalSales = filteredPurchases
    .filter((pur) => pur.status !== 'Cancelado')
    .reduce((acc, pur) => acc + parseFloat(pur.value || 0), 0);

  // Consultas particulares faturadas (apenas atendidas)
  const atendidoParticularApps = filteredAppointments.filter(
    (app) => app.paymentType === 'particular' && app.status === 'atendido'
  );
  const totalClinicalPrivateSales = atendidoParticularApps.length * PRIVATE_CONSULTATION_PRICE;

  // Consultas por convênio faturadas (apenas atendidas)
  const atendidoInsuranceApps = filteredAppointments.filter(
    (app) => app.paymentType === 'convenio' && app.status === 'atendido'
  );
  const totalClinicalInsuranceSales = atendidoInsuranceApps.length * INSURANCE_CONSULTATION_FEE;

  const totalClinicalSales = totalClinicalPrivateSales + totalClinicalInsuranceSales;
  const totalRevenue = totalOpticalSales + totalClinicalSales;

  // Contas a receber (OS pendentes de pagamento)
  const unpaidPurchases = filteredPurchases.filter((pur) => pur.status === 'Aguardando Pagamento');
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

  // Calcular comissões para o profissional selecionado com base nos atendimentos filtrados
  const selectedProf = professionals.find((p) => p.id === selectedProfId);
  const profApps = filteredAppointments.filter(
    (app) => app.professionalId === selectedProfId && app.status === 'atendido'
  );

  // Regra de comissão: 40% de consultas particulares, R$ 40 fixo por consulta de convênio
  const profPrivateApps = profApps.filter((app) => app.paymentType === 'particular');
  const profInsuranceApps = profApps.filter((app) => app.paymentType === 'convenio');

  const { total: totalCommission } = calculateCommission(
    profPrivateApps.length,
    profInsuranceApps.length,
    PRIVATE_CONSULTATION_PRICE
  );





  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Gestão"
        title="Financeiro"
        description="Acompanhe receitas, contas a receber e comissões da clínica e da óptica."
        meta={`R$ ${formatValue(totalReceivables)} a receber`}
        actions={currentUser?.shopId === 'all' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Filial:</label>
            <select
              className="form-control"
              style={{ width: '220px', padding: '8px' }}
              value={selectedShopFilter}
              onChange={(e) => setSelectedShopFilter(e.target.value)}
            >
              <option value="all">Todas as Filiais (Consolidado)</option>
              <option value="loja-1">Filial 1 - Centro</option>
              <option value="loja-2">Filial 2 - Shopping</option>
            </select>
          </div>
        ) : null}
      />

      {/* Grid de Métricas Financeiras */}
      <div className="dashboard-grid finance-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">R$ {formatValue(totalRevenue)}</div>
            <div className="stat-label">Faturamento Total</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon primary">
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">R$ {formatValue(totalOpticalSales)}</div>
            <div className="stat-label">Receita da Ótica</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon accent">
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">R$ {formatValue(totalClinicalSales)}</div>
            <div className="stat-label">Receita Médica</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <AlertCircle size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">R$ {formatValue(totalReceivables)}</div>
            <div className="stat-label">Contas a Receber</div>
          </div>
        </div>
      </div>

      {/* Grid de Conteúdo */}
      <div className="section-grid">
        {/* Lado Esquerdo: Painel de Controle e Abas */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="tab-container" style={{ marginBottom: '20px' }} role="group" aria-label="Seções financeiras">
            <button
              type="button"
              aria-pressed={activeSubTab === 'receivables'}
              className={`tab-btn ${activeSubTab === 'receivables' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('receivables')}
            >
              Contas a Receber ({unpaidPurchases.length})
            </button>
            <button
              type="button"
              aria-pressed={activeSubTab === 'commissions'}
              className={`tab-btn ${activeSubTab === 'commissions' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('commissions')}
            >
              Comissões de Especialistas
            </button>
            <button
              type="button"
              aria-pressed={activeSubTab === 'stats'}
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
                <StatePanel
                  type="empty"
                  title="Nenhuma pendência financeira"
                  description="Todas as ordens desta filial estão sem pagamentos em aberto."
                />
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nº OS</th>
                        <th>Paciente</th>
                        <th>Item Adquirido</th>
                        <th>Data do Pedido</th>
                        <th>Valor do Débito</th>
                        <th style={{ textAlign: 'right' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidPurchases.map((pur) => (
                        <tr key={pur.id}>
                          <td style={{ fontWeight: 700 }}>{pur.osNumber}</td>
                          <td>
                            <button
                              onClick={() => handlePatientClick(pur.patientId)}
                              className="table-link"
                            >
                              {pur.patientName}
                            </button>
                          </td>
                          <td>{pur.item}</td>
                          <td>{new Date(pur.date).toLocaleDateString('pt-BR')}</td>
                          <td style={{ fontWeight: 700, color: 'var(--status-cancelado-text)' }}>
                            R$ {formatValue(pur.value)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-primary btn-sm"
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
              <div className="finance-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
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

              <div className="commission-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', height: 'fit-content' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
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
                      <span style={{ color: 'var(--accent)' }}>R$ {formatValue(totalCommission)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 style={{ fontSize: '14px', marginBottom: '12px' }}>Atendimentos Faturados</h5>
                  {profApps.length === 0 ? (
                    <StatePanel
                      type="empty"
                      title="Nenhum atendimento faturado"
                      description="Não há atendimentos finalizados para este especialista na filial selecionada."
                      compact
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                      {profApps.map((app) => {
                        const commValue = calculateCommission(
                          app.paymentType === 'particular' ? 1 : 0,
                          app.paymentType === 'convenio' ? 1 : 0,
                          PRIVATE_CONSULTATION_PRICE
                        ).total;
                        return (
                          <div key={app.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', justifyContent: 'space-between', fontSize: '13px' }}>
                            <div>
                              <strong style={{ color: 'var(--text-title)' }}>{app.patientName}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Data: {new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR')} | Procedimento: {app.serviceName || app.serviceId}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <StatusBadge status={app.paymentType} />
                               <div style={{ fontWeight: 700, marginTop: '4px', color: 'var(--text-title)' }}>Comissão: R$ {formatValue(commValue)}</div>
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
                  Divisão visual das origens do faturamento entre serviços médicos e vendas da ótica na filial selecionada.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
                <div>
                  <h5 style={{ fontSize: '14px', marginBottom: '16px' }}>Origem do Faturamento</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Ótica & Acessórios</span>
                        <strong>R$ {formatValue(totalOpticalSales)} ({totalRevenue > 0 ? ((totalOpticalSales / totalRevenue) * 100).toFixed(0) : 0}%)</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${totalRevenue > 0 ? (totalOpticalSales / totalRevenue) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '4px' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Consultas & Procedimentos</span>
                        <strong>R$ {formatValue(totalClinicalSales)} ({totalRevenue > 0 ? ((totalClinicalSales / totalRevenue) * 100).toFixed(0) : 0}%)</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${totalRevenue > 0 ? (totalClinicalSales / totalRevenue) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 style={{ fontSize: '14px', marginBottom: '16px' }}>Detalhamento Clínico (Convênios)</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Consultas Particulares</span>
                        <strong>R$ {formatValue(totalClinicalPrivateSales)} ({totalClinicalSales > 0 ? ((totalClinicalPrivateSales / totalClinicalSales) * 100).toFixed(0) : 0}%)</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${totalClinicalSales > 0 ? (totalClinicalPrivateSales / totalClinicalSales) * 100 : 0}%`, height: '100%', backgroundColor: '#059669', borderRadius: '4px' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Repasses de Convênio (Unimed)</span>
                        <strong>R$ {formatValue(totalClinicalInsuranceSales)} ({totalClinicalSales > 0 ? ((totalClinicalInsuranceSales / totalClinicalSales) * 100).toFixed(0) : 0}%)</strong>
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
