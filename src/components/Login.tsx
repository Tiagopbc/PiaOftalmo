import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { getAuthUserProfile } from '../utils/authUser';
import { Glasses, Lock, Mail, AlertCircle, KeyRound, X } from 'lucide-react';

const Login = () => {
  const { setCurrentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAccessHelp, setShowAccessHelp] = useState(false);

  const handleRealLogin = async (e: FormEvent<HTMLFormElement>) => {
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

      const profile = await getAuthUserProfile(data.user);
      setCurrentUser(profile);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Erro ao realizar login.';
      if (errorMessage === '{}' || typeof errorMessage !== 'string') {
        errorMessage = 'Erro de conexão ou serviço indisponível. Verifique sua internet ou bloqueadores de anúncios.';
      }
      setError(errorMessage);
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
            <label htmlFor="login-email" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-main)' }}>
              <Mail size={14} /> E-mail
            </label>
            <input
              id="login-email"
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
            <div className="login-password-heading">
              <label htmlFor="login-password">
                <Lock size={14} /> Senha
              </label>
              <button type="button" className="login-forgot-button" onClick={() => setShowAccessHelp(true)}>
                Esqueci minha senha
              </button>
            </div>
            <input
              id="login-password"
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

        {showAccessHelp && (
          <section className="login-recovery-panel" aria-labelledby="access-help-title">
            <div className="login-recovery-header">
              <div>
                <strong id="access-help-title"><KeyRound size={16} /> Solicitar nova senha</strong>
                <span>O administrador criará uma senha temporária para sua conta.</span>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar instruções de acesso"
                onClick={() => setShowAccessHelp(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="login-access-help-text">
              Entre em contato com um administrador da ótica. No próximo acesso, o sistema exigirá que você escolha uma senha pessoal.
            </p>
          </section>
        )}


      </div>
    </div>
  );
};

export default Login;
