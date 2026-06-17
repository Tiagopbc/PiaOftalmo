import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Glasses, Lock, Mail, Play, AlertCircle } from 'lucide-react';

const Login = () => {
  const { setCurrentUser } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoRole, setDemoRole] = useState('admin');
  const [selectedShop, setSelectedShop] = useState('loja-1');

  const handleRealLogin = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Supabase não configurado! Use o Acesso de Demonstração abaixo.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // Buscar perfil no banco de dados para determinar a role (regra simplificada de metadados)
      const user = data.user;
      const role = user.user_metadata?.role || 'admin';
      const name = user.user_metadata?.name || user.email.split('@')[0];
      const shopId = user.user_metadata?.shop_id || 'loja-1';

      setCurrentUser({
        id: user.id,
        email: user.email,
        name,
        role,
        shopId
      });
    } catch (err) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (e) => {
    e.preventDefault();
    let name = 'Administrador';
    if (demoRole === 'medico') name = 'Dr. Roberto Mendes';
    else if (demoRole === 'recepcao') name = 'Clara (Recepção)';
    else if (demoRole === 'vendedor') name = 'Marcos (Ótica)';

    setCurrentUser({
      id: `demo-${demoRole}`,
      email: `${demoRole}@demo-pia.com`,
      name,
      role: demoRole,
      shopId: selectedShop,
      isDemo: true
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-dark)',
        padding: '20px',
        fontFamily: 'var(--font-body)'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '450px',
          padding: '40px',
          boxShadow: 'var(--shadow-xl)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            className="logo-icon"
            style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 16px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Glasses size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--bg-dark)' }}>PIA Oftalmo</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Portal de Acesso Integrado - Clínica & Óptica
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Formulário de Login Real (Supabase) */}
        <form onSubmit={handleRealLogin} style={{ marginBottom: '24px' }}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} /> E-mail
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="seu-usuario@clinica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} /> Senha
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Separador */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: 'var(--text-muted)' }}>
          <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
          <span style={{ padding: '0 10px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Ou</span>
          <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
        </div>

        {/* Formulário de Acesso de Demonstração (Demo) */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}
        >
          <h4
            style={{
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--bg-dark)'
            }}
          >
            <Play size={12} color="var(--primary)" /> Modo de Demonstração (Local)
          </h4>

          <div className="form-group">
            <label>Escolha o Perfil de Teste</label>
            <select
              className="form-control"
              value={demoRole}
              onChange={(e) => setDemoRole(e.target.value)}
              style={{ padding: '8px' }}
            >
              <option value="admin">Administrador (Acesso Total)</option>
              <option value="recepcao">Recepção (Agenda & Cadastro)</option>
              <option value="medico">Médico (Oftalmologista - Prontuários)</option>
              <option value="vendedor">Vendedor (Ótica & Laboratório)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Selecione a Filial (Loja)</label>
            <select
              className="form-control"
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              style={{ padding: '8px' }}
            >
              <option value="loja-1">Filial 1 - Centro</option>
              <option value="loja-2">Filial 2 - Shopping</option>
            </select>
          </div>

          <button
            onClick={handleDemoLogin}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
          >
            Simular Acesso Rápido
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
