import { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { getAuthUserProfile } from '../utils/authUser';
import { Glasses, Lock, Mail, AlertCircle, Play, Database } from 'lucide-react';

const Login = () => {
  const { setCurrentUser } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoRole, setDemoRole] = useState('admin');

  const handleDemoLogin = () => {
    const names = {
      admin: 'Administrador de Testes',
      medico: 'Dr. Roberto Mendes',
      recepcao: 'Clara — Recepção',
      vendedor: 'Marcos — Óptica'
    };

    setCurrentUser({
      id: `demo-${demoRole}`,
      email: `${demoRole}@demo.local`,
      name: names[demoRole],
      role: demoRole,
      shopId: demoRole === 'admin' ? 'all' : 'loja-1',
      isDemo: true
    });
  };

  const handleRealLogin = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Supabase não configurado! Verifique as credenciais no arquivo .env.local.');
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

      setCurrentUser(getAuthUserProfile(data.user));
    } catch (err) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.28), transparent 36%), radial-gradient(circle at 80% 80%, rgba(13, 148, 136, 0.2), transparent 34%), var(--bg-dark)',
        padding: '20px',
        fontFamily: 'var(--font-body)'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '40px',
          boxShadow: 'var(--shadow-xl)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
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
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-title)' }}>PIA Oftalmo</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Portal de Acesso Integrado - Clínica & Óptica
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--status-cancelado)',
              color: 'var(--status-cancelado-text)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid var(--border-color)'
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Formulário de Login Real (Supabase) */}
        <form onSubmit={handleRealLogin}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-main)' }}>
              <Mail size={14} /> E-mail
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="seu-usuario@clinica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-main)' }}>
              <Lock size={14} /> Senha
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', cursor: 'pointer', fontWeight: 600 }}
            disabled={loading}
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <>
            <div className="login-divider"><span>ou teste no localhost</span></div>

            <div className="login-demo-card">
              <div className="login-demo-heading">
                <div className="login-demo-icon"><Database size={18} /></div>
                <div>
                  <strong>Acesso local de demonstração</strong>
                  <span>10 pacientes fictícios, sem alterar o Supabase</span>
                </div>
              </div>

              <label htmlFor="demo-role" className="login-demo-label">Perfil para o teste</label>
              <select
                id="demo-role"
                className="form-control"
                value={demoRole}
                onChange={(event) => setDemoRole(event.target.value)}
              >
                <option value="admin">Administrador — acesso completo</option>
                <option value="recepcao">Recepção</option>
                <option value="medico">Especialista</option>
                <option value="vendedor">Óptica / OS</option>
              </select>

              <button type="button" className="btn btn-secondary login-demo-button" onClick={handleDemoLogin}>
                <Play size={16} fill="currentColor" /> Entrar no ambiente de teste
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
