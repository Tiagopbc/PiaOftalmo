import { withSupabase } from 'npm:@supabase/server@^1';

const ALLOWED_ROLES = new Set(['admin', 'recepcao', 'medico', 'vendedor']);
const ALLOWED_SHOPS = new Set(['all', 'loja-1', 'loja-2']);
const LONG_BAN_DURATION = '876000h';
const MINIMUM_ACTIVE_ADMINS = 2;
const PASSWORD_POLICY_MESSAGE =
  'Use pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula, número e símbolo.';

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[!-/:-@[-`{-~]/.test(password);

const jsonError = (message: string, status: number) =>
  Response.json({ error: message }, { status });

const isUserActive = (user: { banned_until?: string | null; app_metadata?: Record<string, unknown> }) => {
  if (user.app_metadata?.is_active === false) return false;
  if (!user.banned_until) return true;

  const bannedUntil = Date.parse(user.banned_until);
  return Number.isNaN(bannedUntil) || bannedUntil <= Date.now();
};

const serializeUser = (user: {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}, requesterId: string) => ({
  id: user.id,
  email: user.email || '',
  name: String(user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário'),
  role: String(user.app_metadata?.role || 'recepcao'),
  shopId: String(user.app_metadata?.shop_id || 'loja-1'),
  isActive: isUserActive(user),
  createdAt: user.created_at,
  lastSignInAt: user.last_sign_in_at || null,
  isSelf: user.id === requesterId,
  mustChangePassword: user.app_metadata?.must_change_password === true
});

const canReduceAdminCoverage = async (
  admin: {
    listUsers: (params: { page: number; perPage: number }) => Promise<{
      data: { users: Array<{
        banned_until?: string | null;
        app_metadata?: Record<string, unknown>;
      }> };
      error: Error | null;
    }>;
  }
) => {
  const { data, error } = await admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const activeAdmins = data.users.filter((user) =>
    user.app_metadata?.role === 'admin' && isUserActive(user)
  );

  return activeAdmins.length > MINIMUM_ACTIVE_ADMINS;
};

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    try {
      const { data: requesterData, error: requesterError } = await context.supabase.auth.getUser();
      const requester = requesterData.user;

      if (requesterError || !requester) {
        return jsonError('Sessão inválida ou expirada.', 401);
      }

      const body = await request.json().catch(() => ({}));
      const action = String(body.action || 'list');
      const admin = context.supabaseAdmin.auth.admin;

      if (action === 'complete-password-change') {
        const password = String(body.password || '');
        if (!isStrongPassword(password)) {
          return jsonError(PASSWORD_POLICY_MESSAGE, 400);
        }
        if (requester.app_metadata?.must_change_password !== true) {
          return jsonError('Essa conta não possui uma troca de senha pendente.', 400);
        }

        const { data, error } = await admin.updateUserById(requester.id, {
          password,
          app_metadata: {
            ...requester.app_metadata,
            must_change_password: false
          }
        });
        if (error || !data.user) throw error || new Error('Falha ao liberar a nova senha.');

        return Response.json({ user: serializeUser(data.user, requester.id) });
      }

      if (requester.app_metadata?.role !== 'admin') {
        return jsonError('Somente administradores podem gerenciar contas de acesso.', 403);
      }

      if (action === 'list') {
        const { data, error } = await admin.listUsers({ page: 1, perPage: 1000 });
        if (error) throw error;

        const users = data.users
          .map((user) => serializeUser(user, requester.id))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        return Response.json({ users });
      }

      if (action === 'create') {
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim().toLocaleLowerCase('pt-BR');
        const password = String(body.password || '');
        const role = String(body.role || 'recepcao');
        const shopId = String(body.shopId || 'loja-1');

        if (!name || !email || !isStrongPassword(password)) {
          return jsonError(`Informe nome, e-mail e uma senha provisória válida. ${PASSWORD_POLICY_MESSAGE}`, 400);
        }
        if (!ALLOWED_ROLES.has(role) || !ALLOWED_SHOPS.has(shopId)) {
          return jsonError('Função ou filial inválida.', 400);
        }

        const { data, error } = await admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, role, shop_id: shopId },
          app_metadata: {
            role,
            shop_id: shopId,
            is_active: true,
            must_change_password: true
          }
        });
        if (error) throw error;

        return Response.json({ user: serializeUser(data.user, requester.id) }, { status: 201 });
      }

      if (action === 'update') {
        const userId = String(body.userId || '');
        const role = String(body.role || '');
        const shopId = String(body.shopId || '');

        if (!userId || !ALLOWED_ROLES.has(role) || !ALLOWED_SHOPS.has(shopId)) {
          return jsonError('Usuário, função ou filial inválida.', 400);
        }
        if (userId === requester.id && role !== 'admin') {
          return jsonError('Você não pode remover seu próprio acesso administrativo.', 400);
        }

        const { data: targetData, error: targetError } = await admin.getUserById(userId);
        if (targetError || !targetData.user) {
          return jsonError('Usuário não encontrado.', 404);
        }

        const target = targetData.user;
        if (
          target.app_metadata?.role === 'admin' &&
          role !== 'admin' &&
          isUserActive(target) &&
          !(await canReduceAdminCoverage(admin))
        ) {
          return jsonError('Mantenha pelo menos dois administradores ativos antes de alterar essa função.', 400);
        }

        const { data, error } = await admin.updateUserById(userId, {
          user_metadata: { ...target.user_metadata, role, shop_id: shopId },
          app_metadata: { ...target.app_metadata, role, shop_id: shopId }
        });
        if (error || !data.user) throw error || new Error('Falha ao atualizar usuário.');

        return Response.json({ user: serializeUser(data.user, requester.id) });
      }

      if (action === 'set-active') {
        const userId = String(body.userId || '');
        const isActive = body.isActive === true;

        if (!userId) return jsonError('Usuário inválido.', 400);
        if (userId === requester.id && !isActive) {
          return jsonError('Você não pode desativar a própria conta.', 400);
        }

        const { data: targetData, error: targetError } = await admin.getUserById(userId);
        if (targetError || !targetData.user) {
          return jsonError('Usuário não encontrado.', 404);
        }

        const target = targetData.user;
        if (
          !isActive &&
          target.app_metadata?.role === 'admin' &&
          isUserActive(target) &&
          !(await canReduceAdminCoverage(admin))
        ) {
          return jsonError('Mantenha pelo menos dois administradores ativos antes de inativar essa conta.', 400);
        }

        const { data, error } = await admin.updateUserById(userId, {
          ban_duration: isActive ? 'none' : LONG_BAN_DURATION,
          app_metadata: { ...target.app_metadata, is_active: isActive }
        });
        if (error || !data.user) throw error || new Error('Falha ao alterar acesso.');

        return Response.json({ user: serializeUser(data.user, requester.id) });
      }

      if (action === 'reset-password') {
        const userId = String(body.userId || '');
        const temporaryPassword = String(body.temporaryPassword || '');

        if (!userId || !isStrongPassword(temporaryPassword)) {
          return jsonError(`Informe o usuário e uma senha temporária válida. ${PASSWORD_POLICY_MESSAGE}`, 400);
        }
        if (userId === requester.id) {
          return jsonError('Use a troca de senha do próprio perfil para alterar sua conta.', 400);
        }

        const { data: targetData, error: targetError } = await admin.getUserById(userId);
        if (targetError || !targetData.user) {
          return jsonError('Usuário não encontrado.', 404);
        }
        if (!isUserActive(targetData.user)) {
          return jsonError('Reative o acesso antes de redefinir a senha.', 400);
        }

        const target = targetData.user;
        const { data, error } = await admin.updateUserById(userId, {
          password: temporaryPassword,
          app_metadata: {
            ...target.app_metadata,
            must_change_password: true
          }
        });
        if (error || !data.user) throw error || new Error('Falha ao redefinir a senha.');

        return Response.json({ user: serializeUser(data.user, requester.id) });
      }

      return jsonError('Ação administrativa desconhecida.', 400);
    } catch (error) {
      console.error('admin-users:', error);
      return jsonError('Não foi possível concluir a operação administrativa.', 500);
    }
  })
};
