import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { saleService } from '../services/saleService';

import { useApp } from '../context/AppContext';
import { Search, Eye, RefreshCw, Layers, CheckCircle2, AlertCircle, Printer, FlaskConical } from 'lucide-react';
import PageHeader from './PageHeader';
import { StatusBadge } from './StatusBadge';
import { StatePanel } from './StatePanel';

const OpticalOrders = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  
  const loadOrders = async () => {
    try {
      const data = await saleService.getOpticalOrders();
      setOrders(data);
    } catch(e) { console.error(e); }
  };
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
  }, []);

  const updatePurchaseStatus = async (patientId, purchaseId, status) => {
    try {
      await saleService.updateOpticalOrderStatus(purchaseId, status);
      loadOrders();
    } catch(e) { console.error(e); }
  };
  const { setActiveTab, setSelectedPatientId, setActivePrintData } = useApp();

  const triggerPrintOS = (order, printType = 'cliente') => {
    setActivePrintData({
      type: 'os',
      printType,
      data: order,
      patientName: order.patientName || 'Paciente',
      patientCpf: order.patientCpf || '',
      rx: null
    });
    // Dar tempo para o DOM renderizar
    setTimeout(() => {
      window.print();
    }, 150);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const userShopId = currentUser?.shopId;

  const allOrders = orders.map(o => ({
    ...o,
    osNumber: o.notes,
    item: 'Óculos',
    value: 0,
    patientName: 'Paciente',
    patientCpf: ''
  })).filter((order) => {
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

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Óptica"
        title="Ordens de serviço"
        description="Acompanhe a confecção, o pagamento e a entrega de óculos e lentes."
        meta={`${activeCount} ${activeCount === 1 ? 'ordem ativa' : 'ordens ativas'}`}
      />

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
      <div className="card toolbar-card">
        <div className="filter-toolbar">
          <div className="filter-toolbar-fields">
          <div className="search-field">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por OS, Paciente ou Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} />
          </div>

            <select
              className="form-control select-compact"
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
      <div className="card data-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº da OS</th>
                <th>Paciente</th>
                <th>Data da Compra</th>
                <th>Itens do Pedido</th>
                <th>Valor (R$)</th>
                <th>Status da OS</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    <StatePanel
                      type={searchTerm || statusFilter !== 'all' ? 'search' : 'empty'}
                      title={searchTerm || statusFilter !== 'all'
                        ? 'Nenhuma ordem corresponde aos filtros'
                        : 'Nenhuma ordem de serviço cadastrada'}
                      description={searchTerm || statusFilter !== 'all'
                        ? 'Limpe a busca ou escolha outro status.'
                        : 'As ordens criadas nos prontuários aparecerão aqui.'}
                      action={searchTerm || statusFilter !== 'all' ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                        >
                          Limpar filtros
                        </button>
                      ) : null}
                    />
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 700 }}>{order.osNumber}</td>
                      <td>
                        <button
                          onClick={() => handlePatientClick(order.patientId)}
                          className="table-link"
                        >
                          {order.patientName}
                        </button>
                      </td>
                      <td>{new Date(order.date).toLocaleDateString('pt-BR')}</td>
                      <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {order.item}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        R$ {parseFloat(order.value).toFixed(2)}
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <div className="table-actions">
                          <select
                            value={order.status}
                            onChange={(e) => updatePurchaseStatus(order.patientId, order.id, e.target.value)}
                            className="form-control select-compact"
                            style={{ minWidth: '160px', minHeight: '34px', padding: '5px 8px', fontSize: '12px' }}
                            aria-label={`Alterar status da OS ${order.osNumber}`}
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
                            className="icon-button"
                            title="Ver Prontuário"
                            aria-label={`Ver prontuário de ${order.patientName}`}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => triggerPrintOS(order, 'cliente')}
                            className="icon-button"
                            title="Imprimir Via do Cliente (OS)"
                            aria-label={`Imprimir via do cliente da OS ${order.osNumber}`}
                          >
                            <Printer size={14} />
                          </button>

                          <button
                            onClick={() => triggerPrintOS(order, 'laboratorio')}
                            className="icon-button"
                            title="Imprimir Via do Laboratório (OS)"
                            aria-label={`Imprimir via do laboratório da OS ${order.osNumber}`}
                          >
                            <FlaskConical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OpticalOrders;
