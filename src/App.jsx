import { lazy, Suspense, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import { ForcedPasswordChange } from './components/ForcedPasswordChange';
import { StatePanel } from './components/StatePanel';
import { formatLabName } from './utils/helpers';
import { getShopDisplayName } from './utils/shops';

// Lazy loading component tabs for bundle optimization
const Dashboard = lazy(() => import('./components/Dashboard'));
const PatientManager = lazy(() => import('./components/PatientManager'));
const AgendaManager = lazy(() => import('./components/AgendaManager'));
const OpticalOrders = lazy(() => import('./components/OpticalOrders'));
const FinanceManager = lazy(() => import('./components/FinanceManager'));
const SettingsManager = lazy(() => import('./components/SettingsManager'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Glasses,
  DollarSign,
  LogOut,
  Store,
  Settings,
  Sun,
  Moon,
  Package
} from 'lucide-react';

function App() {
  const { currentUser, logout } = useAuth();
  const {
    activeTab,
    setActiveTab,
    activePrintData,
    clinicSettings,
    theme,
    toggleTheme
  } = useApp();

  // Filtragem de abas de acordo com a Role do usuário
  const getNavItems = () => {
    const role = currentUser?.role;
    if (!role) return [];

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
      items.push({ id: 'inventory', label: 'Estoque', icon: <Package size={20} /> });
    }

    if (role === 'admin') {
      items.push({ id: 'finance', label: 'Financeiro', icon: <DollarSign size={20} /> });
    }

    // Todos podem acessar o próprio perfil; opções administrativas continuam
    // protegidas dentro da tela de configurações.
    items.push({ id: 'settings', label: 'Configurações', icon: <Settings size={20} /> });

    return items;
  };

  const navItems = getNavItems();

  const isTabAllowed = navItems.some((item) => item.id === activeTab);
  useEffect(() => {
    if (currentUser && !isTabAllowed) {
      setActiveTab('dashboard');
    }
  }, [currentUser, isTabAllowed, setActiveTab]);

  // Se não estiver logado, exibe tela de login
  if (!currentUser) {
    return <Login />;
  }

  if (currentUser.mustChangePassword) {
    return <ForcedPasswordChange />;
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
      case 'inventory':
        return <InventoryManager />;
      case 'settings':
        return <SettingsManager />;
      default:
        return <Dashboard />;
    }
  };

  const getShopName = (shopId, shopName) => getShopDisplayName(shopId, shopName);
  const getPrintShopName = (shopId, shopName) => getShopDisplayName(
    shopId,
    shopName || (shopId === currentUser.shopId ? currentUser.shopName : undefined)
  );

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
      <a className="skip-link" href="#main-content">Pular para o conteúdo principal</a>

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="logo-container">
          <div className="logo-icon" style={{ padding: '6px' }}>
            <Glasses size={18} />
          </div>
          <div className="logo-text">
            <h1>PIA Oftalmo</h1>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              {getShopName(currentUser.shopId, currentUser.shopName)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
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
        </div>
      </header>

      {/* Sidebar Navigation - Desktop */}
      <aside className="sidebar" aria-label="Menu lateral">
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
          <span>Loja: <strong>{getShopName(currentUser.shopId, currentUser.shopName)}</strong></span>
        </div>

        <nav className="nav-links" aria-label="Navegação principal">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="user-profile">
              <div className="user-avatar" style={{ textTransform: 'uppercase' }} aria-hidden="true">
                {currentUser.name ? currentUser.name[0] : '?'}
              </div>
              <div className="user-info">
                <div className="user-name" style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.name}
                </div>
                <div className="user-role">{getRoleBadge(currentUser.role)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={toggleTheme}
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
                title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                type="button"
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
                aria-label="Sair da conta"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content" id="main-content" tabIndex="-1">
        {/* Dynamic page component with lazy loading fallback */}
        <Suspense fallback={
          <StatePanel
            type="loading"
            title="Preparando a área de trabalho"
            description="Carregando os recursos desta tela."
            className="page-loading-state"
          />
        }>
          {renderActiveTab()}
        </Suspense>
      </main>

      {/* Bottom Navigation - Mobile Tab Bar */}
      <nav className="bottom-nav" aria-label="Navegação móvel">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            {item.icon}
            {item.label.split(' ')[0]}
          </button>
        ))}
      </nav>

      {/* Elementos Exclusivos para Impressao (PDF) */}
      {activePrintData && activePrintData.type === 'rx' && (() => {
        const rx = activePrintData.data || {};
        const longeOD = rx.longe?.od || rx.od || {};
        const longeOE = rx.longe?.oe || rx.oe || {};
        const pertoOD = rx.perto?.od || null;
        const pertoOE = rx.perto?.oe || null;
        const adicao = rx.adicao || rx.od?.adicao || rx.oe?.adicao || '';
        const lensTypes = rx.lensTypes || {};
        const notes = rx.notes || '';
        const lensType = rx.lensType || '';

        // Calculate age
        const calculateAge = (birthDateString) => {
          if (!birthDateString) return '';
          const today = new Date();
          const birthDate = new Date(birthDateString + 'T00:00:00');
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return `${age} anos`;
        };
        const patientAge = calculateAge(activePrintData.patientBirthDate);

        return (
          <div className="print-only print-page" style={{ padding: '40px', color: '#000', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {clinicSettings?.name || 'Centro Visual'}
                </h2>
                <p style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: '#555', margin: 0 }}>
                  Optometria & Saúde Visual
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', border: '1px solid #000', padding: '16px', borderRadius: '4px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6' }}>
              <div>
                <p style={{ margin: '0 0 6px' }}><strong>Paciente:</strong> {activePrintData.patientName}</p>
                <p style={{ margin: '0 0 6px' }}><strong>Data de Nascimento:</strong> {activePrintData.patientBirthDate ? new Date(activePrintData.patientBirthDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'} {patientAge && `(${patientAge})`}</p>
                <p style={{ margin: 0 }}><strong>Sexo:</strong> {activePrintData.patientGender || '-'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 6px' }}><strong>Emissor:</strong> {rx.doctor}</p>
                <p style={{ margin: '0 0 6px' }}><strong>Data:</strong> {rx.date ? new Date(rx.date + 'T00:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</p>
                {activePrintData.patientPhone && <p style={{ margin: 0 }}><strong>Contato:</strong> {activePrintData.patientPhone}</p>}
              </div>
            </div>

            <h3 style={{ fontSize: '15px', borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '14px', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Receita de Óculos (Prescrição)
            </h3>

            {/* LONGE TABLE */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>Longe</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid #000', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '1px solid #000' }}>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '10%' }}>Olho</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '22.5%' }}>Esférico</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '22.5%' }}>Cilíndrico</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '15%' }}>Eixo</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '15%' }}>DNP</th>
                    <th style={{ padding: '8px', width: '15%' }}>AV</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OD</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{longeOD.esferico || '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{longeOD.cilindrico || '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{longeOD.eixo ? `${longeOD.eixo}°` : '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{longeOD.dnp ? `${longeOD.dnp} mm` : '—'}</td>
                    <td style={{ padding: '8px' }}>{longeOD.av || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OE</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{longeOE.esferico || '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{longeOE.cilindrico || '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{longeOE.eixo ? `${longeOE.eixo}°` : '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{longeOE.dnp ? `${longeOE.dnp} mm` : '—'}</td>
                    <td style={{ padding: '8px' }}>{longeOE.av || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PERTO TABLE */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>Perto</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid #000', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '1px solid #000' }}>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '10%' }}>Olho</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '22.5%' }}>Esférico</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '22.5%' }}>Cilíndrico</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '15%' }}>Eixo</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '15%' }}>DNP</th>
                    <th style={{ padding: '8px', width: '15%' }}>AV</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OD</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{pertoOD?.esferico || '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{pertoOD?.cilindrico || '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{pertoOD?.eixo ? `${pertoOD.eixo}°` : '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{pertoOD?.dnp ? `${pertoOD.dnp} mm` : '—'}</td>
                    <td style={{ padding: '8px' }}>{pertoOD?.av || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OE</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{pertoOE?.esferico || '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{pertoOE?.cilindrico || '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{pertoOE?.eixo ? `${pertoOE.eixo}°` : '—'}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000' }}>{pertoOE?.dnp ? `${pertoOE.dnp} mm` : '—'}</td>
                    <td style={{ padding: '8px' }}>{pertoOE?.av || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ADIÇÃO */}
            <div style={{ marginBottom: '20px', fontSize: '13px' }}>
              <span style={{ padding: '8px', border: '1px solid #000', display: 'inline-block', minWidth: '150px', backgroundColor: '#fafafa' }}>
                <strong>ADIÇÃO:</strong> {adicao ? `${adicao.startsWith('+') || adicao.startsWith('-') ? '' : '+'}${adicao}` : '—'}
              </span>
            </div>

            {/* TIPO DE LENTE (Checkboxes) */}
            <div style={{ marginBottom: '20px', fontSize: '13px', border: '1px solid #000', padding: '12px', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Tipo de Lente / Filtros:</div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>{lensTypes.antireflexo ? '☑' : '☐'}</span> Antirreflexo
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>{lensTypes.multifocal ? '☑' : '☐'}</span> Multifocal
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>{lensTypes.fotossensivel ? '☑' : '☐'}</span> Fotossensível
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>{lensTypes.bluecontrol ? '☑' : '☐'}</span> Bluecontrol
                </span>
              </div>
            </div>

            {/* LENS SUGGESTION & NOTES */}
            {lensType && (
              <p style={{ fontSize: '13px', margin: '0 0 8px' }}>
                <strong>Sugestão de Lentes:</strong> {lensType}
              </p>
            )}
            {notes && (
              <p style={{ fontSize: '13px', fontStyle: 'italic', margin: '0 0 24px', color: '#333' }}>
                <strong>Obs.:</strong> "{notes}"
              </p>
            )}

            {/* SIGNATURE / STAMP */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '60px' }}>
              <div style={{ fontSize: '10px', color: '#555', maxWidth: '300px', lineHeight: '1.4' }}>
                <p style={{ margin: '0 0 4px' }}><strong>{clinicSettings?.name || 'Centro Visual Optometria'}</strong></p>
                <p style={{ margin: 0 }}>{clinicSettings?.address || 'Av. Quatro, Nº 01, Sl. 02 - Cohab Anil IV - São Luís/MA'}</p>
                <p style={{ margin: 0 }}>CEP: {clinicSettings?.cep || '65050-700'} | Contato: {clinicSettings?.phone || '(98) 98815-4507'}</p>
              </div>
              <div style={{ textAlign: 'center', width: '250px' }}>
                <div style={{ minHeight: '60px' }}></div>
                <hr style={{ width: '220px', margin: '0 auto 6px', borderColor: '#000' }} />
                <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0 }}>Dr(a). {rx.doctor}</p>
                <p style={{ fontSize: '10px', color: '#555', margin: 0 }}>Optometrista / Oftalmologista</p>
              </div>
            </div>
          </div>
        );
      })()}

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
                  <p style={{ margin: 0 }}><strong>Loja Emissora:</strong> {getPrintShopName(activePrintData.data.shop_id, activePrintData.data.shopName || activePrintData.data.shop_name)}</p>
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

              {activePrintData.rx ? (() => {
                const rx = activePrintData.rx;
                const longeOD = rx.longe?.od || rx.od || {};
                const longeOE = rx.longe?.oe || rx.oe || {};
                const pertoOD = rx.perto?.od || null;
                const pertoOE = rx.perto?.oe || null;
                const adicao = rx.adicao || rx.od?.adicao || rx.oe?.adicao || '';
                const lensTypes = rx.lensTypes || {};

                return (
                  <div style={{ marginBottom: '20px' }}>
                    {/* LONGE */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>Longe</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid #000', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '1px solid #000' }}>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '10%' }}>Olho</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '22.5%' }}>Esférico</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '22.5%' }}>Cilíndrico</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '15%' }}>Eixo</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '15%' }}>DNP</th>
                            <th style={{ padding: '6px', width: '15%' }}>AV</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #000' }}>
                            <td style={{ padding: '6px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OD</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{longeOD.esferico || '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{longeOD.cilindrico || '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{longeOD.eixo ? `${longeOD.eixo}°` : '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{longeOD.dnp ? `${longeOD.dnp} mm` : '—'}</td>
                            <td style={{ padding: '6px' }}>{longeOD.av || '—'}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OE</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{longeOE.esferico || '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{longeOE.cilindrico || '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{longeOE.eixo ? `${longeOE.eixo}°` : '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{longeOE.dnp ? `${longeOE.dnp} mm` : '—'}</td>
                            <td style={{ padding: '6px' }}>{longeOE.av || '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* PERTO */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>Perto</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid #000', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '1px solid #000' }}>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '10%' }}>Olho</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '22.5%' }}>Esférico</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '22.5%' }}>Cilíndrico</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '15%' }}>Eixo</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #000', width: '15%' }}>DNP</th>
                            <th style={{ padding: '6px', width: '15%' }}>AV</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #000' }}>
                            <td style={{ padding: '6px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OD</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{pertoOD?.esferico || '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{pertoOD?.cilindrico || '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{pertoOD?.eixo ? `${pertoOD.eixo}°` : '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{pertoOD?.dnp ? `${pertoOD.dnp} mm` : '—'}</td>
                            <td style={{ padding: '6px' }}>{pertoOD?.av || '—'}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px', borderRight: '1px solid #000', fontWeight: 'bold' }}>OE</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{pertoOE?.esferico || '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{pertoOE?.cilindrico || '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{pertoOE?.eixo ? `${pertoOE.eixo}°` : '—'}</td>
                            <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{pertoOE?.dnp ? `${pertoOE.dnp} mm` : '—'}</td>
                            <td style={{ padding: '6px' }}>{pertoOE?.av || '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* ADIÇÃO & FILTROS */}
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '12px' }}>
                      {adicao && (
                        <span><strong>Adição:</strong> {adicao ? `${adicao.startsWith('+') || adicao.startsWith('-') ? '' : '+'}${adicao}` : '—'}</span>
                      )}
                      {(() => {
                        const types = [];
                        if (lensTypes.antireflexo) types.push('Antirreflexo');
                        if (lensTypes.multifocal) types.push('Multifocal');
                        if (lensTypes.fotossensivel) types.push('Fotossensível');
                        if (lensTypes.bluecontrol) types.push('Bluecontrol');
                        return types.length > 0 ? (
                          <span><strong>Filtros:</strong> {types.join(', ')}</span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                );
              })() : (
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
                  <p style={{ margin: 0 }}><strong>Loja:</strong> {getPrintShopName(activePrintData.data.shop_id, activePrintData.data.shopName || activePrintData.data.shop_name)}</p>
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
