import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ShoppingBag, Search, Eye, RefreshCw, Layers, CheckCircle2, AlertCircle, Printer } from 'lucide-react';

const OpticalOrders = () => {
  const { currentUser, patients, updatePurchaseStatus, setActiveTab, setSelectedPatientId, setActivePrintData } = useContext(AppContext);

  const triggerPrintOS = (order) => {
    const patientObj = patients.find(p => p.id === order.patientId);
    setActivePrintData({
      type: 'os',
      data: order,
      patientName: order.patientName,
      patientCpf: patientObj ? patientObj.cpf : ''
    });
    // Dar tempo para o DOM renderizar
    setTimeout(() => {
      window.print();
    }, 150);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const userShopId = currentUser?.shopId;

  // Obter todas as ordens de serviço de todos os pacientes e filtrar pela loja ativa
  const allOrders = patients.flatMap((p) =>
    (p.purchases || []).map((pur) => ({
      ...pur,
      patientName: p.name,
      patientId: p.id
    }))
  ).filter((order) => {
    if (userShopId && userShopId !== 'all') {
      return !order.shop_id || order.shop_id === userShopId;
    }
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filtrar ordens
  const filteredOrders = allOrders.filter((order) => {
    const matchesSearch =
      order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.osNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.item.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Estatísticas das OS
  const statCount = (status) => allOrders.filter((o) => o.status === status).length;
  const activeCount = allOrders.filter((o) => o.status !== 'Entregue' && o.status !== 'Cancelado').length;

  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    setActiveTab('patients');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aguardando Laboratório': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      case 'Em Produção': return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'Pronto para Retirada': return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
      case 'Entregue': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700 }}>Ordem de Serviço (OS) & Óptica</h2>
        <p style={{ color: 'var(--text-muted)' }}>Controle de confecção e entrega de óculos e lentes</p>
      </div>

      {/* Grid de OS */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon primary">
            <Layers size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Ordens Ativas</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <AlertCircle size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">{statCount('Aguardando Laboratório')}</div>
            <div className="stat-label">No Laboratório</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon accent">
            <RefreshCw size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">{statCount('Pronto para Retirada')}</div>
            <div className="stat-label">Prontas p/ Retirada</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-value">{statCount('Entregue')}</div>
            <div className="stat-label">Entregues</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por OS, Paciente ou Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              className="form-control"
              style={{ width: '220px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="Aguardando Laboratório">Aguardando Laboratório</option>
              <option value="Em Produção">Em Produção</option>
              <option value="Pronto para Retirada">Pronto para Retirada</option>
              <option value="Entregue">Entregue</option>
              <option value="Aguardando Pagamento">Aguardando Pagamento</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Ordens */}
      <div className="card" style={{ padding: '0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Nº da OS</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Paciente</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Data da Compra</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Itens do Pedido</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Valor (R$)</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Status da OS</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Nenhuma ordem de serviço encontrada nos critérios de busca.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const colors = getStatusColor(order.status);
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition-fast)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 700 }}>{order.osNumber}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={() => handlePatientClick(order.patientId)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--primary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '14px',
                            padding: 0
                          }}
                        >
                          {order.patientName}
                        </button>
                      </td>
                      <td style={{ padding: '16px 20px' }}>{new Date(order.date).toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-main)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {order.item}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                        R$ {parseFloat(order.value).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <select
                            value={order.status}
                            onChange={(e) => updatePurchaseStatus(order.patientId, order.id, e.target.value)}
                            className="form-control"
                            style={{ width: '160px', padding: '6px', fontSize: '12px' }}
                          >
                            <option>Aguardando Laboratório</option>
                            <option>Em Produção</option>
                            <option>Pronto para Retirada</option>
                            <option>Entregue</option>
                            <option>Aguardando Pagamento</option>
                            <option>Cancelado</option>
                          </select>

                          <button
                            onClick={() => handlePatientClick(order.patientId)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px' }}
                            title="Ver Prontuário"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => triggerPrintOS(order)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px' }}
                            title="Imprimir Via do Cliente (OS)"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OpticalOrders;
