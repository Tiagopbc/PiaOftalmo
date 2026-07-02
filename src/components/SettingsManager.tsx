import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { User, Users, Save, Lock, Eye, EyeOff, Store } from 'lucide-react';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwords';
import { getShopDisplayName } from '../utils/shops';
import PageHeader from './PageHeader';
import { PasswordRequirements } from './PasswordRequirements';
import { TeamAccessManager } from './TeamAccessManager';
import { ShopManager } from './ShopManager';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado.';

const SettingsManager = () => {
  const { currentUser, setCurrentUser } = useAuth();

  const isAdmin = currentUser?.role === 'admin';
  const [activeSubTab, setActiveSubTab] = useState(() => isAdmin ? 'shops' : 'account'); // shops, team, account

  // State para Personalização de Conta do Usuário
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [newPasswordState, setNewPasswordState] = useState('');
  const [confirmPasswordState, setConfirmPasswordState] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    setProfileName(currentUser?.name || '');
  }, [currentUser?.name]);

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = profileName.trim();
    if (!trimmedName || !currentUser?.id) return;

    setUpdatingProfile(true);

    if (isSupabaseConfigured) {
      try {
        const { error: profileError } = await supabase.rpc('update_own_profile_name', {
          new_full_name: trimmedName
        });

        if (profileError) throw profileError;

        const { error } = await supabase.auth.updateUser({
          data: { name: trimmedName }
        });

        if (error) throw error;

        // Atualizar estado local do usuário no contexto
        setCurrentUser((prev) => prev ? ({
          ...prev,
          name: trimmedName
        }) : prev);
        setProfileName(trimmedName);

        alert('Nome de perfil atualizado com sucesso!');
      } catch (err) {
        alert('Erro ao atualizar perfil: ' + getErrorMessage(err));
      } finally {
        setUpdatingProfile(false);
      }
    } else {
      alert('Supabase não configurado. Não foi possível atualizar o perfil real.');
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isStrongPassword(newPasswordState)) {
      alert(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (newPasswordState !== confirmPasswordState) {
      alert('As senhas informadas não coincidem.');
      return;
    }

    setUpdatingPassword(true);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPasswordState
        });

        if (error) throw error;

        setNewPasswordState('');
        setConfirmPasswordState('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        alert('Senha atualizada com sucesso!');
      } catch (err) {
        alert('Erro ao atualizar senha: ' + getErrorMessage(err));
      } finally {
        setUpdatingPassword(false);
      }
    } else {
      alert('Supabase não configurado. Não foi possível atualizar a senha real.');
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={isAdmin ? 'Administração' : 'Conta'}
        title="Configurações"
        description={isAdmin
          ? 'Gerencie unidades, acessos da equipe e seu perfil.'
          : 'Consulte seus dados de acesso e personalize seu perfil.'}
        meta={isAdmin ? 'Acesso administrativo' : 'Preferências pessoais'}
      />

      <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', minHeight: '70vh' }}>

      {/* Sub-abas de Ajustes */}
      <div className="settings-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }} role="group" aria-label="Seções de configuração">
        {isAdmin && (
          <>
            <button
              type="button"
              aria-pressed={activeSubTab === 'shops'}
              className={`btn ${activeSubTab === 'shops' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
              onClick={() => setActiveSubTab('shops')}
            >
              <Store size={16} /> Unidades / Filiais
            </button>
            <button
              type="button"
              aria-pressed={activeSubTab === 'team'}
              className={`btn ${activeSubTab === 'team' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
              onClick={() => setActiveSubTab('team')}
            >
              <Users size={16} /> Equipe & Acessos
            </button>
          </>
        )}
        <button
          type="button"
          aria-pressed={activeSubTab === 'account'}
          className={`btn ${activeSubTab === 'account' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          onClick={() => setActiveSubTab('account')}
        >
          <User size={16} /> Minha Conta
        </button>
      </div>

      <div style={{ padding: '8px 0' }}>
        {/* ABA 1: UNIDADES / FILIAIS */}
        {isAdmin && activeSubTab === 'shops' && (
          <ShopManager currentUser={currentUser} />
        )}

        {/* ABA 2: EQUIPE & ACESSOS */}
        {isAdmin && activeSubTab === 'team' && (
          <TeamAccessManager currentUser={currentUser} />
        )}

        {/* ABA 3: MINHA CONTA */}
        {activeSubTab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>

            {/* Editar Informações Básicas */}
            <div style={{ border: '1px solid var(--border-color)', padding: '24px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-title)' }}>
                Dados de Perfil
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                Personalize o seu nome de exibição e verifique os detalhes de acesso da sua conta.
              </p>

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>E-mail de acesso (Não alterável)</span>
                  <input
                    type="email"
                    className="form-control"
                    value={currentUser?.email || ''}
                    disabled
                    style={{ backgroundColor: 'var(--bg-primary)', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="account-profile-name" style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Nome Completo / Exibição*</label>
                  <input
                    id="account-profile-name"
                    type="text"
                    className="form-control"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    placeholder="Seu nome"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Nível de Acesso</span>
                    <strong style={{ color: 'var(--primary)', display: 'block', marginTop: '4px' }}>
                      {currentUser?.role === 'admin' ? 'Administrador Geral' : currentUser?.role || ''}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Loja / Filial atual</span>
                    <strong style={{ display: 'block', marginTop: '4px' }}>
                      {getShopDisplayName(currentUser?.shopId, currentUser?.shopName, {
                        allLabel: 'Consolidado (Todas as Filiais)'
                      })}
                    </strong>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', marginTop: '8px', cursor: 'pointer' }}
                  disabled={updatingProfile}
                >
                  <Save size={18} /> {updatingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            </div>

            {/* Alterar Senha */}
            <div style={{ border: '1px solid var(--border-color)', padding: '24px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-title)' }}>
                Segurança (Alterar Senha)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                Defina uma nova senha forte para acessar o sistema.
              </p>

              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="account-new-password" style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Nova senha*</label>
                  <div className="password-input-wrapper">
                    <input
                      id="account-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-control"
                      value={newPasswordState}
                      onChange={(e) => setNewPasswordState(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Mínimo de 8 caracteres"
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="password-visibility-button"
                      onClick={() => setShowNewPassword((visible) => !visible)}
                      aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                      aria-pressed={showNewPassword}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="account-confirm-password" style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Confirmar nova senha*</label>
                  <div className="password-input-wrapper">
                    <input
                      id="account-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-control"
                      value={confirmPasswordState}
                      onChange={(e) => setConfirmPasswordState(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Digite a mesma senha novamente"
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="password-visibility-button"
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                      aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <PasswordRequirements
                  password={newPasswordState}
                  confirmation={confirmPasswordState}
                />

                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', marginTop: '8px', cursor: 'pointer' }}
                  disabled={updatingPassword}
                >
                  <Lock size={18} /> {updatingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </form>
            </div>

          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default SettingsManager;
