import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import Dashboard from './components/Dashboard';
import PatientManager from './components/PatientManager';
import AgendaManager from './components/AgendaManager';
import OpticalOrders from './components/OpticalOrders';
import FinanceManager from './components/FinanceManager';
import Login from './components/Login';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Glasses,
  Smartphone,
  X,
  DollarSign,
  LogOut,
  Store
} from 'lucide-react';

function App() {
  const { currentUser, logout, activeTab, setActiveTab } = useContext(AppContext);
  const [showPwaBanner, setShowPwaBanner] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Capturar evento de instalação do PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPwaBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPwaBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('Usuário aceitou a instalação do PWA');
      }
      setDeferredPrompt(null);
      setShowPwaBanner(false);
    } else {
      alert(
        'Instalação Simulada! Para instalar em seu dispositivo móvel, use a opção "Adicionar à Tela de Início" nas configurações do seu navegador.'
      );
      setShowPwaBanner(false);
    }
  };

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
        {/* PWA Banner */}
        {showPwaBanner && (
          <div className="pwa-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Smartphone size={24} style={{ color: 'var(--accent)' }} />
              <div className="pwa-banner-text">
                <h4>Instale o PIA Oftalmo no seu celular</h4>
                <p>Acesse offline, de forma rápida e segura a qualquer momento sem usar espaço do seu telefone.</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleInstallPwa}>
                Instalar App
              </button>
              <button
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                onClick={() => setShowPwaBanner(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic page component */}
        {renderActiveTab()}
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
    </div>
  );
}

export default App;
