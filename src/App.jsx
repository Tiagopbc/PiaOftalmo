import React, { useContext, useState, useEffect, lazy, Suspense } from 'react';
import { AppContext } from './context/AppContext';
import Login from './components/Login';
import { formatLabName } from './utils/helpers';

// Lazy loading component tabs for bundle optimization
const Dashboard = lazy(() => import('./components/Dashboard'));
const PatientManager = lazy(() => import('./components/PatientManager'));
const AgendaManager = lazy(() => import('./components/AgendaManager'));
const OpticalOrders = lazy(() => import('./components/OpticalOrders'));
const FinanceManager = lazy(() => import('./components/FinanceManager'));
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Glasses,
  DollarSign,
  LogOut,
  Store
} from 'lucide-react';

function App() {
  const { currentUser, logout, activeTab, setActiveTab, activePrintData } = useContext(AppContext);

  // Se não estiver logado, exibe tela de login
  if (!currentUser) {
    return <Login />;
  }

  // Filtragem de abas de acordo com a Role do usuário
  const getNavItems = () => {
    const role = currentUser.role;
    const items = [
      { id: 'dashboard', label: 'Painel Geral', icon: <LayoutDashboard size={20} /> }
    ];

    if (role === 'admin' || role === 'recepcao' || role === 'medico') {
      items.push({ id: 'patients', label: 'Pacientes', icon: <Users size={20} /> });
    } else if (role === 'vendedor') {
      // Vendedores precisam acessar a lista de pacientes para ver receitas e OS
      items.push({ id: 'patients', label: 'Receitas / Fichas', icon: <Users size={20} /> });
    }

    if (role === 'admin' || role === 'recepcao' || role === 'medico') {
      items.push({ id: 'agenda', label: 'Agenda & Consultas', icon: <CalendarDays size={20} /> });
    }

    if (role === 'admin' || role === 'vendedor') {
      items.push({ id: 'optical', label: 'Óptica & OS', icon: <Glasses size={20} /> });
    }

    if (role === 'admin') {
      items.push({ id: 'finance', label: 'Financeiro', icon: <DollarSign size={20} /> });
    }

    return items;
  };

  const navItems = getNavItems();

  // Validar se a aba atual está disponível para a role. Se não, redireciona para dashboard
  const isTabAllowed = navItems.some(item => item.id === activeTab);
  if (!isTabAllowed) {
    setActiveTab('dashboard');
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'patients':
        return <PatientManager />;
      case 'agenda':
        return <AgendaManager />;
      case 'optical':
        return <OpticalOrders />;
      case 'finance':
        return <FinanceManager />;
      default:
        return <Dashboard />;
    }
  };

  const getShopName = (shopId) => {
    if (shopId === 'loja-1') return 'Filial 1 - Centro';
    if (shopId === 'loja-2') return 'Filial 2 - Shopping';
    return 'Todas as Filiais';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'medico': return 'Especialista';
      case 'recepcao': return 'Recepção';
      case 'vendedor': return 'Óptica / OS';
      default: return role;
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="logo-container">
          <div className="logo-icon" style={{ padding: '6px' }}>
            <Glasses size={18} />
          </div>
          <div className="logo-text">
            <h1>PIA Oftalmo</h1>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              {getShopName(currentUser.shopId)}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            border: 'none',
            background: 'none',
            color: 'var(--status-cancelado-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          <LogOut size={16} /> Sair
        </button>
      </header>

      {/* Sidebar Navigation - Desktop */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <Glasses size={24} />
          </div>
          <div className="logo-text">
            <h1>PIA Oftalmo</h1>
            <span>Gestão Clínica & Óptica</span>
          </div>
        </div>

        {/* Loja Ativa Tag */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            marginBottom: '24px',
            color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          <Store size={15} color="var(--primary)" />
          <span>Loja: <strong>{getShopName(currentUser.shopId)}</strong></span>
        </div>

        <nav className="nav-links">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="user-profile">
              <div className="user-avatar" style={{ textTransform: 'uppercase' }}>
                {currentUser.name[0]}
              </div>
              <div className="user-info">
                <div className="user-name" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.name}
                </div>
                <div className="user-role">{getRoleBadge(currentUser.role)}</div>
              </div>
            </div>

            <button
              onClick={logout}
              style={{
                border: 'none',
                background: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Sair da Conta"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        {/* Dynamic page component with lazy loading fallback */}
        <Suspense fallback={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
            <div className="loader" style={{ width: '40px', height: '40px' }}></div>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>Carregando painel...</span>
          </div>
        }>
          {renderActiveTab()}
        </Suspense>
      </main>

      {/* Bottom Navigation - Mobile Tab Bar */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            {item.label.split(' ')[0]}
          </button>
        ))}
      </nav>

      {/* Elementos Exclusivos para Impressao (PDF) */}
      {activePrintData && activePrintData.type === 'rx' && (
        <div className="print-only print-page" style={{ padding: '40px', color: '#000', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px', textTransform: 'uppercase' }}>PIA Oftalmo - Consultório Médico</h2>
            <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>Atendimento Oftalmológico & Diagnóstico Visual</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', border: '1px solid #000', padding: '16px', borderRadius: '4px', marginBottom: '28px', fontSize: '13px', lineHeight: '1.6' }}>
            <div>
              <p style={{ margin: '0 0 6px' }}><strong>Paciente:</strong> {activePrintData.patientName}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Data de Nascimento:</strong> {activePrintData.patientBirthDate ? new Date(activePrintData.patientBirthDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>
              <p style={{ margin: 0 }}><strong>Sexo:</strong> {activePrintData.patientGender || '-'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 6px' }}><strong>Médico(a) Prescritor(a):</strong> {activePrintData.data.doctor}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Data da Emissão:</strong> {activePrintData.data.date ? new Date(activePrintData.data.date + 'T00:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</p>
              {activePrintData.patientPhone && <p style={{ margin: 0 }}><strong>Telefone de Contato:</strong> {activePrintData.patientPhone}</p>}
            </div>
          </div>

          <h3 style={{ fontSize: '16px', borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '16px', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Receita de Óculos (Prescrição)
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', marginBottom: '24px', border: '1px solid #000', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '10px', borderRight: '1px solid #000' }}>Olho</th>
                <th style={{ padding: '10px', borderRight: '1px solid #000' }}>Esférico</th>
                <th style={{ padding: '10px', borderRight: '1px solid #000' }}>Cilíndrico</th>
                <th style={{ padding: '10px', borderRight: '1px solid #000' }}>Eixo</th>
                <th style={{ padding: '10px', borderRight: '1px solid #000' }}>Adição</th>
                <th style={{ padding: '10px' }}>DNP</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '12px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OD</td>
                <td style={{ padding: '12px', borderRight: '1px solid #000' }}>{activePrintData.data.od?.esferico || 'Plano'}</td>
                <td style={{ padding: '12px', borderRight: '1px solid #000' }}>{activePrintData.data.od?.cilindrico || '-'}</td>
                <td style={{ padding: '12px', borderRight: '1px solid #000' }}>{activePrintData.data.od?.eixo ? `${activePrintData.data.od.eixo}°` : '-'}</td>
                <td style={{ padding: '12px', borderRight: '1px solid #000' }}>{activePrintData.data.od?.adicao || '-'}</td>
                <td style={{ padding: '12px' }}>{activePrintData.data.od?.dnp ? `${activePrintData.data.od.dnp} mm` : '-'}</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OE</td>
                <td style={{ padding: '12px', borderRight: '1px solid #000' }}>{activePrintData.data.oe?.esferico || 'Plano'}</td>
                <td style={{ padding: '12px', borderRight: '1px solid #000' }}>{activePrintData.data.oe?.cilindrico || '-'}</td>
                <td style={{ padding: '12px', borderRight: '1px solid #000' }}>{activePrintData.data.oe?.eixo ? `${activePrintData.data.oe.eixo}°` : '-'}</td>
                <td style={{ padding: '12px', borderRight: '1px solid #000' }}>{activePrintData.data.oe?.adicao || '-'}</td>
                <td style={{ padding: '12px' }}>{activePrintData.data.oe?.dnp ? `${activePrintData.data.oe.dnp} mm` : '-'}</td>
              </tr>
            </tbody>
          </table>

          {activePrintData.data.lensType && (
            <p style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Sugestão de Lentes:</strong> {activePrintData.data.lensType}
            </p>
          )}
          {activePrintData.data.notes && (
            <p style={{ fontSize: '13px', fontStyle: 'italic', marginBottom: '32px' }}>
              <strong>Notas / Observações:</strong> "{activePrintData.data.notes}"
            </p>
          )}

          <div style={{ marginTop: '120px', textAlign: 'center' }}>
            <hr style={{ width: '250px', margin: '0 auto 8px', borderColor: '#000' }} />
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Dr(a). {activePrintData.data.doctor}</p>
            <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>Médico Oftalmologista</p>
          </div>
        </div>
      )}

      {activePrintData && activePrintData.type === 'os' && (
        <div className="print-only print-page" style={{ padding: '40px', color: '#000', fontFamily: 'sans-serif' }}>
          {activePrintData.printType === 'laboratorio' ? (
            /* VIA DO LABORATÓRIO (Hides prices, hides CPF, masks patient name, shows refraction grid) */
            <div>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px', textTransform: 'uppercase' }}>PIA Oftalmo - Via Laboratório</h2>
                <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>Ordem de Confecção de Lentes / Serviço Óptico</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '13px' }}>
                <div>
                  <p style={{ margin: '0 0 4px' }}><strong>Nº OS:</strong> {activePrintData.data.osNumber}</p>
                  <p style={{ margin: '0 0 4px' }}><strong>Data da OS:</strong> {new Date(activePrintData.data.date).toLocaleDateString('pt-BR')}</p>
                  <p style={{ margin: 0 }}><strong>Loja Emissora:</strong> Filial {activePrintData.data.shop_id === 'loja-1' ? '1 - Centro' : '2 - Shopping'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px' }}>
                    <strong>Paciente (Identificação):</strong> {formatLabName(activePrintData.patientName)}
                  </p>
                  <p style={{ margin: 0, color: '#555' }}><strong>Status do Pedido:</strong> {activePrintData.data.status}</p>
                </div>
              </div>

              <h3 style={{ fontSize: '15px', borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Parâmetros Refrativos (Grade da Receita)
              </h3>

              {activePrintData.rx ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', marginBottom: '20px', border: '1px solid #000', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '1px solid #000' }}>
                      <th style={{ padding: '8px', borderRight: '1px solid #000' }}>Olho</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #000' }}>Esférico</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #000' }}>Cilíndrico</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #000' }}>Eixo</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #000' }}>Adição</th>
                      <th style={{ padding: '8px' }}>DNP</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '10px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OD</td>
                      <td style={{ padding: '10px', borderRight: '1px solid #000' }}>{activePrintData.rx.od?.esferico || 'Plano'}</td>
                      <td style={{ padding: '10px', borderRight: '1px solid #000' }}>{activePrintData.rx.od?.cilindrico || '-'}</td>
                      <td style={{ padding: '10px', borderRight: '1px solid #000' }}>{activePrintData.rx.od?.eixo ? `${activePrintData.rx.od.eixo}°` : '-'}</td>
                      <td style={{ padding: '10px', borderRight: '1px solid #000' }}>{activePrintData.rx.od?.adicao || '-'}</td>
                      <td style={{ padding: '10px' }}>{activePrintData.rx.od?.dnp ? `${activePrintData.rx.od.dnp} mm` : '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OE</td>
                      <td style={{ padding: '10px', borderRight: '1px solid #000' }}>{activePrintData.rx.oe?.esferico || 'Plano'}</td>
                      <td style={{ padding: '10px', borderRight: '1px solid #000' }}>{activePrintData.rx.oe?.cilindrico || '-'}</td>
                      <td style={{ padding: '10px', borderRight: '1px solid #000' }}>{activePrintData.rx.oe?.eixo ? `${activePrintData.rx.oe.eixo}°` : '-'}</td>
                      <td style={{ padding: '10px', borderRight: '1px solid #000' }}>{activePrintData.rx.oe?.adicao || '-'}</td>
                      <td style={{ padding: '10px' }}>{activePrintData.rx.oe?.dnp ? `${activePrintData.rx.oe.dnp} mm` : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div style={{ border: '1px dashed #ef4444', padding: '12px', textAlign: 'center', marginBottom: '20px', borderRadius: '4px' }}>
                  <p style={{ margin: 0, color: '#b91c1c', fontSize: '13px', fontWeight: 'bold' }}>
                    Nenhuma receita cadastrada para este paciente no sistema.
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#7f1d1d' }}>
                    Preencha os dados ópticos manualmente na folha impressa, se necessário.
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '24px', fontSize: '13px' }}>
                <p style={{ margin: '0 0 6px' }}><strong>Lente/Armação Solicitada (OS):</strong> {activePrintData.data.item}</p>
                {activePrintData.rx?.lensType && (
                  <p style={{ margin: '0 0 6px' }}><strong>Sugestão de Lentes (Receita):</strong> {activePrintData.rx.lensType}</p>
                )}
                {activePrintData.rx?.notes && (
                  <p style={{ margin: '0 0 6px', fontStyle: 'italic' }}><strong>Notas / Observações Clínicas:</strong> "{activePrintData.rx.notes}"</p>
                )}
              </div>

              <div style={{ borderTop: '1px solid #ddd', paddingTop: '16px', marginTop: '60px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555' }}>
                <p style={{ margin: 0 }}>Documento emitido eletronicamente para fins de controle interno de laboratório.</p>
                <p style={{ margin: 0 }}><strong>Óptica PIA Oftalmo</strong></p>
              </div>
            </div>
          ) : (
            /* VIA DO CLIENTE (Traditional receipt, shows item, value, pickup terms, signatures - No CPF) */
            <div>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px', textTransform: 'uppercase' }}>PIA Oftalmo - Óptica & OS</h2>
                <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>Comprovante de Compra e Ordem de Serviço</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '13px' }}>
                <div>
                  <p style={{ margin: '0 0 4px' }}><strong>Nº OS:</strong> {activePrintData.data.osNumber}</p>
                  <p style={{ margin: '0 0 4px' }}><strong>Data do Pedido:</strong> {new Date(activePrintData.data.date).toLocaleDateString('pt-BR')}</p>
                  <p style={{ margin: 0 }}><strong>Loja:</strong> Filial {activePrintData.data.shop_id === 'loja-1' ? '1 - Centro' : '2 - Shopping'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px' }}><strong>Cliente:</strong> {activePrintData.patientName}</p>
                  <p style={{ margin: 0, color: '#555' }}><strong>Status da OS:</strong> {activePrintData.data.status}</p>
                </div>
              </div>

              <h3 style={{ fontSize: '15px', borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Itens Solicitados
              </h3>

              <div style={{ border: '1px solid #000', padding: '16px', borderRadius: '4px', marginBottom: '24px', backgroundColor: '#fafafa' }}>
                <p style={{ fontSize: '14px', margin: '0 0 8px' }}><strong>Produto/Lente:</strong> {activePrintData.data.item}</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Valor Pago: R$ {parseFloat(activePrintData.data.value).toFixed(2)}</p>
              </div>

              <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.5', marginBottom: '48px' }}>
                <p style={{ margin: 0 }}>
                  <strong>Orientações de Retirada:</strong> O prazo médio para montagem e conferência no laboratório é de 5 a 7 dias úteis. Apresente esta via no momento da retirada para a conferência final do DNP e ajuste da armação.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px' }}>
                <div style={{ textAlign: 'center', width: '220px' }}>
                  <hr style={{ borderColor: '#000', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '12px', margin: 0 }}>Assinatura do Consultor</p>
                </div>
                <div style={{ textAlign: 'center', width: '220px' }}>
                  <hr style={{ borderColor: '#000', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '12px', margin: 0 }}>Assinatura do Cliente</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
