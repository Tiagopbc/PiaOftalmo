import { useState } from 'react';
import { Eye, EyeOff, Glasses, KeyRound, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { invokeAdminUsers } from '../utils/adminUsers';
import { getAuthUserProfile } from '../utils/authUser';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwords';
import { supabase } from '../utils/supabaseClient';
import { PasswordRequirements } from './PasswordRequirements';

export const ForcedPasswordChange = () => {
  const { currentUser, setCurrentUser, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (password !== confirmation) {
      setError('As senhas informadas não coincidem.');
      return;
    }

    setLoading(true);
    let passwordChanged = false;
    try {
      await invokeAdminUsers({ action: 'complete-password-change', password });
      passwordChanged = true;

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password
      });
      if (signInError || !data.user) {
        throw signInError || new Error('Não foi possível iniciar a nova sessão.');
      }

      setCurrentUser(getAuthUserProfile(data.user));
    } catch (changeError) {
      setError(
        passwordChanged
          ? 'Sua senha foi alterada, mas a nova sessão não pôde ser iniciada. Saia da conta e entre novamente com a nova senha.'
          : changeError.message || 'Não foi possível alterar a senha. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="password-recovery-screen">
      <section className="password-recovery-card" aria-labelledby="temporary-password-title">
        <div className="password-recovery-brand" aria-hidden="true">
          <Glasses size={28} />
        </div>

        <div className="password-recovery-heading">
          <KeyRound size={22} />
          <div>
            <h1 id="temporary-password-title">Crie sua senha pessoal</h1>
            <p>A senha informada pelo administrador é temporária e não poderá continuar em uso.</p>
          </div>
        </div>

        <p className="password-change-account">Conta: <strong>{currentUser.email}</strong></p>

        <form onSubmit={handleSubmit} className="password-recovery-form">
          <div className="form-group">
            <label htmlFor="new-password"><Lock size={14} /> Nova senha</label>
            <div className="password-input-wrapper">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                minLength={8}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="password-visibility-button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password"><Lock size={14} /> Confirmar nova senha</label>
            <div className="password-input-wrapper">
              <input
                id="confirm-password"
                type={showConfirmation ? 'text' : 'password'}
                className="form-control"
                minLength={8}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="password-visibility-button"
                onClick={() => setShowConfirmation((visible) => !visible)}
                aria-label={showConfirmation ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                aria-pressed={showConfirmation}
                disabled={loading}
              >
                {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <PasswordRequirements password={password} confirmation={confirmation} />

          {error && <p className="password-recovery-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvando nova senha...' : 'Salvar senha e entrar'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={logout} disabled={loading}>
            <LogOut size={16} /> Sair da conta
          </button>
        </form>
      </section>
    </main>
  );
};
