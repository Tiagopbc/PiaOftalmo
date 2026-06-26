import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { User, Users, Building2, Save, Lock, Eye, EyeOff, Store } from 'lucide-react';
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
  const { clinicSettings, updateClinicSettings } = useApp();

  const isAdmin = currentUser?.role === 'admin';
  const [activeSubTab, setActiveSubTab] = useState(() => isAdmin ? 'clinic' : 'account'); // clinic, shops, team, account

  // State para Dados da Clínica
  const [clinicName, setClinicName] = useState(clinicSettings.name || '');
  const [clinicAddress, setClinicAddress] = useState(clinicSettings.address || '');
  const [clinicCep, setClinicCep] = useState(clinicSettings.cep || '');
  const [clinicPhone, setClinicPhone] = useState(clinicSettings.phone || '');
  const [loadingSettings, setLoadingSettings] = useState(false);

  // State para Personalização de Conta do Usuário
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [newPasswordState, setNewPasswordState] = useState('');
  const [confirmPasswordState, setConfirmPasswordState] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    setUpdatingProfile(true);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: { name: profileName }
        });

        if (error) throw error;

        // Atualizar estado local do usuário no contexto
        setCurrentUser((prev) => prev ? ({
          ...prev,
          name: profileName
        }) : prev);

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

  // Handler para Salvar Dados da Clínica
  const handleSaveClinicSettings = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingSettings(true);
    updateClinicSettings({
      name: clinicName,
      address: clinicAddress,
      cep: clinicCep,
      phone: clinicPhone
    });
    setLoadingSettings(false);
    alert('Configurações da clínica salvas com sucesso! As próximas impressões de receitas e OS exibirão estes dados.');
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={isAdmin ? 'Administração' : 'Conta'}
        title="Configurações"
        description={isAdmin
          ? 'Gerencie as preferências da clínica, os acessos da equipe e seu perfil.'
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
              aria-pressed={activeSubTab === 'clinic'}
              className={`btn ${activeSubTab === 'clinic' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
              onClick={() => setActiveSubTab('clinic')}
            >
              <Building2 size={16} /> Dados do Consultório
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
            <button
              type="button"
              aria-pressed={activeSubTab === 'shops'}
              className={`btn ${activeSubTab === 'shops' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
              onClick={() => setActiveSubTab('shops')}
            >
              <Store size={16} /> Unidades / Filiais
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
        {/* ABA 1: DADOS DO CONSULTÓRIO */}
        {isAdmin && activeSubTab === 'clinic' && (
          <div style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="var(--primary)" /> Perfil do Consultório / Óptica
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Defina os dados de cabeçalho e rodapé que serão exibidos automaticamente nas vias impressas e PDFs de receitas e ordens de serviço.
            </p>

            <form onSubmit={handleSaveClinicSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Nome do Estabelecimento / Logo Texto*</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Ex: Centro Visual Optometria"
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Endereço Completo (Rua, Número, Bairro, Cidade)*</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  placeholder="Ex: Av. Quatro, Nº 01, Sl. 02 - Cohab Anil IV - São Luís/MA"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>CEP*</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={clinicCep}
                    onChange={(e) => setClinicCep(e.target.value)}
                    placeholder="Ex: 65050-700"
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>WhatsApp / Telefone de Contato*</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    placeholder="Ex: (98) 98815-4507"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', marginTop: '8px' }}
                disabled={loadingSettings}
              >
                <Save size={18} /> {loadingSettings ? 'Gravando...' : 'Salvar Preferências'}
              </button>
            </form>
          </div>
        )}

        {/* ABA 2: EQUIPE & ACESSOS */}
        {isAdmin && activeSubTab === 'team' && (
          <TeamAccessManager currentUser={currentUser} />
        )}

        {/* ABA 3: UNIDADES / FILIAIS */}
        {isAdmin && activeSubTab === 'shops' && (
          <ShopManager currentUser={currentUser} />
        )}

        {/* ABA 4: MINHA CONTA */}
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
                  <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Nome Completo / Exibição*</label>
                  <input
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
