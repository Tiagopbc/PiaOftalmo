import { useCallback, useEffect, useState } from 'react';
import {
  Copy,
  KeyRound,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';
import { invokeAdminUsers } from '../utils/adminUsers';
import {
  generateTemporaryPassword,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE
} from '../utils/passwords';
import { PasswordRequirements } from './PasswordRequirements';
import { StatePanel } from './StatePanel';
import { StatusBadge } from './StatusBadge';

const ROLE_OPTIONS = [
  { value: 'recepcao', label: 'Recepção' },
  { value: 'medico', label: 'Especialista (Médico)' },
  { value: 'vendedor', label: 'Vendedor (Óptica)' },
  { value: 'admin', label: 'Administrador Geral' }
];

const SHOP_OPTIONS = [
  { value: 'loja-1', label: 'Filial 1 - Centro' },
  { value: 'loja-2', label: 'Filial 2 - Shopping' },
  { value: 'all', label: 'Todas as Filiais' }
];

const formatAccessDate = (value) => {
  if (!value) return 'Nunca acessou';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
};

export const TeamAccessManager = ({ currentUser }) => {
  const canUseRemoteManagement =
    isSupabaseConfigured && Boolean(currentUser) && !currentUser?.isDemo;

  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(canUseRemoteManagement);
  const [operationUserId, setOperationUserId] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('recepcao');
  const [shopId, setShopId] = useState('loja-1');
  const [creating, setCreating] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [resetCompleted, setResetCompleted] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const activeAdminCount = users.filter((user) =>
    user.role === 'admin' && user.isActive
  ).length;

  const loadUsers = useCallback(async () => {
    if (!canUseRemoteManagement) return;

    setLoading(true);
    setError('');

    try {
      const data = await invokeAdminUsers({ action: 'list' });
      const nextUsers = data?.users || [];
      setUsers(nextUsers);
      setDrafts(Object.fromEntries(nextUsers.map((user) => [
        user.id,
        { role: user.role, shopId: user.shopId }
      ])));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [canUseRemoteManagement]);

  useEffect(() => {
    if (!canUseRemoteManagement) return undefined;

    let cancelled = false;
    invokeAdminUsers({ action: 'list' })
      .then((data) => {
        if (cancelled) return;
        const nextUsers = data?.users || [];
        setUsers(nextUsers);
        setDrafts(Object.fromEntries(nextUsers.map((user) => [
          user.id,
          { role: user.role, shopId: user.shopId }
        ])));
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canUseRemoteManagement]);

  const updateDraft = (userId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...current[userId], [field]: value }
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setFeedback('');

    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setCreating(true);

    try {
      await invokeAdminUsers({
        action: 'create',
        name,
        email,
        password,
        role,
        shopId
      });
      setName('');
      setEmail('');
      setPassword('');
      setRole('recepcao');
      setShopId('loja-1');
      setFeedback('Conta criada. A senha provisória deverá ser trocada no primeiro acesso.');
      await loadUsers();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (user) => {
    const draft = drafts[user.id];
    if (!draft) return;

    setOperationUserId(user.id);
    setError('');
    setFeedback('');

    try {
      await invokeAdminUsers({
        action: 'update',
        userId: user.id,
        role: draft.role,
        shopId: draft.shopId
      });
      if (user.isSelf) await supabase.auth.refreshSession();
      setFeedback(`Permissões de ${user.name} atualizadas.`);
      await loadUsers();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setOperationUserId('');
    }
  };

  const handleToggleAccess = async (user) => {
    const nextActive = !user.isActive;
    if (!nextActive) {
      const confirmed = window.confirm(
        `Inativar o acesso de ${user.name}? Essa pessoa não poderá entrar no sistema.`
      );
      if (!confirmed) return;
    }

    setOperationUserId(user.id);
    setError('');
    setFeedback('');

    try {
      await invokeAdminUsers({
        action: 'set-active',
        userId: user.id,
        isActive: nextActive
      });
      setFeedback(nextActive
        ? `Acesso de ${user.name} reativado.`
        : `Acesso de ${user.name} inativado.`);
      await loadUsers();
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setOperationUserId('');
    }
  };

  const openPasswordReset = (user) => {
    setResetUserId(user.id);
    setTemporaryPassword(generateTemporaryPassword());
    setResetCompleted(false);
    setCopyFeedback('');
    setError('');
    setFeedback('');
  };

  const closePasswordReset = () => {
    setResetUserId('');
    setTemporaryPassword('');
    setResetCompleted(false);
    setCopyFeedback('');
  };

  const handleResetPassword = async (event, user) => {
    event.preventDefault();
    setError('');
    setFeedback('');

    if (!isStrongPassword(temporaryPassword)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setOperationUserId(user.id);

    try {
      await invokeAdminUsers({
        action: 'reset-password',
        userId: user.id,
        temporaryPassword
      });
      setResetCompleted(true);
      setFeedback(`Senha temporária criada para ${user.name}.`);
      await loadUsers();
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setOperationUserId('');
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopyFeedback('Senha copiada. Entregue-a diretamente ao colaborador.');
    } catch {
      setCopyFeedback('Não foi possível copiar automaticamente. Selecione a senha acima.');
    }
  };

  if (!canUseRemoteManagement) {
    return (
      <StatePanel
        type="empty"
        title="Contas reais indisponíveis no modo de teste"
        description="Entre com uma conta administrativa do Supabase para listar e gerenciar os acessos da equipe."
      />
    );
  }

  return (
    <div className="team-access-layout">
      <section className="team-create-panel" aria-labelledby="team-create-title">
        <h3 id="team-create-title" className="settings-section-title">
          <UserPlus size={20} /> Cadastrar colaborador
        </h3>
        <p className="settings-section-description">
          Crie uma conta com senha provisória, função e filial definidas.
        </p>

        <form onSubmit={handleCreate} className="team-create-form">
          <div className="form-group">
            <label htmlFor="team-name">Nome completo*</label>
            <input
              id="team-name"
              type="text"
              className="form-control"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={creating}
            />
          </div>

          <div className="form-group">
            <label htmlFor="team-email">E-mail corporativo*</label>
            <input
              id="team-email"
              type="email"
              className="form-control"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={creating}
            />
          </div>

          <div className="form-group">
            <label htmlFor="team-password">Senha provisória*</label>
            <input
              id="team-password"
              type="password"
              className="form-control"
              required
              minLength={8}
              placeholder="Mínimo de 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={creating}
            />
          </div>

          <PasswordRequirements password={password} />

          <div className="team-form-grid">
            <div className="form-group">
              <label htmlFor="team-role">Função</label>
              <select
                id="team-role"
                className="form-control"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                disabled={creating}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="team-shop">Filial</label>
              <select
                id="team-shop"
                className="form-control"
                value={shopId}
                onChange={(event) => setShopId(event.target.value)}
                disabled={creating}
              >
                {SHOP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={creating}>
            <UserPlus size={17} /> {creating ? 'Criando conta...' : 'Criar conta de acesso'}
          </button>
        </form>
      </section>

      <section className="team-users-panel" aria-labelledby="team-users-title">
        <div className="team-users-header">
          <div>
            <h3 id="team-users-title" className="settings-section-title">
              <Shield size={20} /> Usuários de acesso
            </h3>
            <p className="settings-section-description">
              {users.length} {users.length === 1 ? 'conta cadastrada' : 'contas cadastradas'} no Supabase.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'state-spinner' : ''} /> Atualizar
          </button>
        </div>

        {feedback && <div className="team-feedback" role="status">{feedback}</div>}

        {!loading && users.length > 0 && (
          <div className={`admin-coverage ${activeAdminCount >= 2 ? 'is-ready' : 'needs-backup'}`}>
            {activeAdminCount >= 2 ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            <div>
              <strong>
                {activeAdminCount >= 2
                  ? 'Cobertura administrativa protegida'
                  : 'Cadastre um administrador de segurança'}
              </strong>
              <span>
                {activeAdminCount >= 2
                  ? `${activeAdminCount} administradores ativos. O sistema impedirá que esse número fique abaixo de dois.`
                  : 'A equipe precisa de uma segunda conta administrativa para recuperar o acesso do administrador principal.'}
              </span>
            </div>
          </div>
        )}

        {error && (
          <StatePanel
            type="error"
            title="Não foi possível gerenciar os usuários"
            description={error}
            compact
            action={(
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadUsers}>
                Tentar novamente
              </button>
            )}
          />
        )}

        {loading && users.length === 0 ? (
          <StatePanel
            type="loading"
            title="Carregando usuários do Supabase"
            description="Consultando contas e permissões da equipe."
            compact
          />
        ) : users.length === 0 && !error ? (
          <StatePanel
            type="empty"
            title="Nenhuma conta encontrada"
            description="Crie o primeiro colaborador pelo formulário ao lado."
            compact
          />
        ) : (
          <div className="team-user-list">
            {users.map((user) => {
              const draft = drafts[user.id] || { role: user.role, shopId: user.shopId };
              const isOperating = operationUserId === user.id;
              const hasChanges = draft.role !== user.role || draft.shopId !== user.shopId;

              return (
                <article key={user.id} className={`team-user-card ${!user.isActive ? 'is-inactive' : ''}`}>
                  <div className="team-user-summary">
                    <div className="team-user-identity">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <StatusBadge status={user.isActive ? 'ativo' : 'inativo'} />
                  </div>

                  <div className="team-user-meta">
                    <span>Último acesso: {formatAccessDate(user.lastSignInAt)}</span>
                    <div className="team-user-flags">
                      {user.mustChangePassword && <span className="team-password-label">Troca de senha pendente</span>}
                      {user.isSelf && <span className="team-self-label">Sua conta</span>}
                    </div>
                  </div>

                  <div className="team-user-controls">
                    <div className="form-group">
                      <label htmlFor={`role-${user.id}`}>Função</label>
                      <select
                        id={`role-${user.id}`}
                        className="form-control"
                        value={draft.role}
                        onChange={(event) => updateDraft(user.id, 'role', event.target.value)}
                        disabled={isOperating || !user.isActive}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            disabled={
                              user.role === 'admin' &&
                              activeAdminCount <= 2 &&
                              option.value !== 'admin'
                            }
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`shop-${user.id}`}>Filial</label>
                      <select
                        id={`shop-${user.id}`}
                        className="form-control"
                        value={draft.shopId}
                        onChange={(event) => updateDraft(user.id, 'shopId', event.target.value)}
                        disabled={isOperating || !user.isActive}
                      >
                        {SHOP_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="team-user-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSave(user)}
                      disabled={isOperating || !hasChanges || !user.isActive}
                    >
                      <Save size={15} /> {isOperating && hasChanges ? 'Salvando...' : 'Salvar permissões'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openPasswordReset(user)}
                      disabled={isOperating || user.isSelf || !user.isActive}
                      title={user.isSelf ? 'Altere sua própria senha pelo perfil' : undefined}
                    >
                      <KeyRound size={15} /> Redefinir senha
                    </button>
                    <button
                      type="button"
                      className={`btn ${user.isActive ? 'btn-danger' : 'btn-success'} btn-sm`}
                      onClick={() => handleToggleAccess(user)}
                      disabled={
                        isOperating ||
                        user.isSelf ||
                        (user.isActive && user.role === 'admin' && activeAdminCount <= 2)
                      }
                      title={
                        user.isSelf
                          ? 'A própria conta não pode ser inativada'
                          : user.isActive && user.role === 'admin' && activeAdminCount <= 2
                            ? 'Mantenha pelo menos dois administradores ativos'
                            : undefined
                      }
                    >
                      {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                      {user.isActive ? 'Inativar acesso' : 'Reativar acesso'}
                    </button>
                  </div>

                  {resetUserId === user.id && (
                    <form className="team-password-reset" onSubmit={(event) => handleResetPassword(event, user)}>
                      <div className="team-password-reset-heading">
                        <div>
                          <strong>Senha temporária</strong>
                          <span>
                            {resetCompleted
                              ? 'A senha já está ativa e deverá ser trocada no próximo acesso.'
                              : 'Revise a senha e confirme a redefinição.'}
                          </span>
                        </div>
                        <button type="button" className="icon-button" onClick={closePasswordReset} aria-label="Fechar redefinição de senha">
                          ×
                        </button>
                      </div>

                      <div className="team-password-field">
                        <input
                          type="text"
                          className="form-control"
                          aria-label={`Senha temporária de ${user.name}`}
                          minLength={8}
                          required
                          value={temporaryPassword}
                          onChange={(event) => {
                            setTemporaryPassword(event.target.value);
                            setResetCompleted(false);
                            setCopyFeedback('');
                          }}
                          disabled={isOperating || resetCompleted}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setTemporaryPassword(generateTemporaryPassword());
                            setResetCompleted(false);
                            setCopyFeedback('');
                          }}
                          disabled={isOperating || resetCompleted}
                        >
                          Gerar outra
                        </button>
                      </div>

                      <PasswordRequirements password={temporaryPassword} />

                      {copyFeedback && <p className="team-copy-feedback" role="status">{copyFeedback}</p>}

                      <div className="team-password-reset-actions">
                        {resetCompleted ? (
                          <button type="button" className="btn btn-primary btn-sm" onClick={handleCopyPassword}>
                            <Copy size={15} /> Copiar senha temporária
                          </button>
                        ) : (
                          <button type="submit" className="btn btn-primary btn-sm" disabled={isOperating || !isStrongPassword(temporaryPassword)}>
                            <KeyRound size={15} /> {isOperating ? 'Redefinindo...' : 'Aplicar senha temporária'}
                          </button>
                        )}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={closePasswordReset} disabled={isOperating}>
                          Fechar
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
