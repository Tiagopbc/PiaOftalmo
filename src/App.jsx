import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import Dashboard from './components/Dashboard';
import PatientManager from './components/PatientManager';
import AgendaManager from './components/AgendaManager';
import OpticalOrders from './components/OpticalOrders';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Glasses,
  Smartphone,
  X,
  Menu
} from 'lucide-react';

function App() {
  const { activeTab, setActiveTab } = useContext(AppContext);
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

    // Verificar se já está rodando standalone (instalado)
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
      // Simulação para navegadores que não suportam ou desenvolvimento local
      alert(
        'Instalação Simetrizada! No celular ou navegador, clique em "Adicionar à Tela de Início" nas opções do seu navegador para instalar o aplicativo como PWA offline.'
      );
      setShowPwaBanner(false);
    }
  };

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
      default:
        return <Dashboard />;
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
            <span>Gestão Clínica & Óptica</span>
          </div>
        </div>
        <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '12px' }}>
          DR
        </div>
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

        <nav className="nav-links">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            Painel Geral
          </button>
          <button
            className={`nav-item ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            <Users size={20} />
            Pacientes
          </button>
          <button
            className={`nav-item ${activeTab === 'agenda' ? 'active' : ''}`}
            onClick={() => setActiveTab('agenda')}
          >
            <CalendarDays size={20} />
            Agenda & Consultas
          </button>
          <button
            className={`nav-item ${activeTab === 'optical' ? 'active' : ''}`}
            onClick={() => setActiveTab('optical')}
          >
            <Glasses size={20} />
            Óptica & OS
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">DR</div>
            <div className="user-info">
              <div className="user-name">Dr. Roberto</div>
              <div className="user-role">Diretor Clínico</div>
            </div>
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
        <button
          className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          Painel
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          <Users size={20} />
          Pacientes
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'agenda' ? 'active' : ''}`}
          onClick={() => setActiveTab('agenda')}
        >
          <CalendarDays size={20} />
          Agenda
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'optical' ? 'active' : ''}`}
          onClick={() => setActiveTab('optical')}
        >
          <Glasses size={20} />
          Óptica & OS
        </button>
      </nav>
    </div>
  );
}

export default App;
