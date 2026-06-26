import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ROLES = new Set(['admin', 'recepcao', 'medico', 'vendedor']);
const LONG_BAN_DURATION = '876000h';
const MINIMUM_ACTIVE_ADMINS = 2;
const PASSWORD_POLICY_MESSAGE =
    'Use pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula, número e símbolo.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type AdminApi = {
  listUsers: (params: { page: number; perPage: number }) => Promise<{
    data: { users: AuthUser[] };
    error: { message: string } | null;
  }>;

  getUserById: (id: string) => Promise<{
    data: { user: AuthUser | null };
    error: { message: string } | null;
  }>;

  createUser: (attributes: Record<string, unknown>) => Promise<{
    data: { user: AuthUser | null };
    error: { message: string } | null;
  }>;

  updateUserById: (id: string, attributes: Record<string, unknown>) => Promise<{
    data: { user: AuthUser | null };
    error: { message: string } | null;
  }>;
};

type ProfileRecord = {
  id: string;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean | null;
};

type ShopRecord = {
  id: string;
  legacy_code?: string | null;
  name?: string | null;
  is_active?: boolean | null;
};

type AccessRecord = {
  profile_id: string;
  shop_id: string;
  shops?: ShopRecord | ShopRecord[] | null;
};

type AccessDirectory = {
  profiles: Map<string, ProfileRecord>;
  access: Map<string, AccessRecord>;
};

const isStrongPassword = (password: string) =>
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!-/:-@[-`{-~]/.test(password);

const jsonResponse = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: corsHeaders
    });

const jsonError = (message: string, status: number) =>
    jsonResponse({ error: message }, status);

const isUserActive = (user: {
  banned_until?: string | null;
  app_metadata?: Record<string, unknown>;
}) => {
  if (user.app_metadata?.is_active === false) return false;
  if (!user.banned_until) return true;

  const bannedUntil = Date.parse(user.banned_until);
  return Number.isNaN(bannedUntil) || bannedUntil <= Date.now();
};

const isUuid = (value: string) =>
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

const getJoinedShop = (access?: AccessRecord) => {
  const joined = access?.shops;
  if (Array.isArray(joined)) return joined[0] || null;
  return joined || null;
};

const fetchAccessDirectory = async (client: any, users: AuthUser[]): Promise<AccessDirectory> => {
  const userIds = users.map((user) => user.id);

  if (userIds.length === 0) {
    return { profiles: new Map(), access: new Map() };
  }

  const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id, full_name, role, is_active')
      .in('id', userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const { data: accessRows, error: accessError } = await client
      .from('user_shop_access')
      .select('profile_id, shop_id, shops(id, legacy_code, name, is_active)')
      .in('profile_id', userIds);

  if (accessError) {
    throw new Error(accessError.message);
  }

  return {
    profiles: new Map((profiles || []).map((profile: ProfileRecord) => [profile.id, profile])),
    access: new Map((accessRows || []).map((access: AccessRecord) => [access.profile_id, access]))
  };
};

const getRequesterProfile = async (client: any, userId: string): Promise<ProfileRecord | null> => {
  const { data, error } = await client
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', userId)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
};

const resolveShopUuid = async (
  client: any,
  shopId: string,
  options: { requireActive?: boolean } = {}
): Promise<string | null> => {
  if (shopId === 'all') return null;

  const query = client
      .from('shops')
      .select('id, is_active')
      .limit(1);

  const { data, error } = isUuid(shopId)
      ? await query.eq('id', shopId)
      : await query.eq('legacy_code', shopId);

  if (error) {
    throw new Error(error.message);
  }

  const shop = data?.[0];
  if (!shop?.id) {
    throw new Error('Filial não encontrada.');
  }

  if (options.requireActive && shop.is_active === false) {
    throw new Error('Filial inativa. Reative a unidade antes de vincular usuários.');
  }

  return shop.id;
};

const ensureValidShopAssignment = async (client: any, role: string, shopId: string) => {
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('Função inválida.');
  }

  if (role === 'admin') {
    if (shopId !== 'all') {
      throw new Error('Administradores devem ficar com acesso consolidado a todas as filiais.');
    }
    return;
  }

  if (!shopId || shopId === 'all') {
    throw new Error('Selecione uma filial ativa para este perfil.');
  }

  await resolveShopUuid(client, shopId, { requireActive: true });
};

const syncProfileAndAccess = async (
  client: any,
  user: AuthUser,
  attributes: { name?: string; role: string; shopId: string; isActive?: boolean }
) => {
  const name = attributes.name || String(user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário');
  const isActive = attributes.isActive ?? isUserActive(user);

  const { error: profileError } = await client
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: name,
        role: attributes.role,
        is_active: isActive
      }, { onConflict: 'id' });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: deleteError } = await client
      .from('user_shop_access')
      .delete()
      .eq('profile_id', user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const resolvedShopId = await resolveShopUuid(client, attributes.shopId);

  if (resolvedShopId) {
    const { error: accessError } = await client
        .from('user_shop_access')
        .insert({
          profile_id: user.id,
          shop_id: resolvedShopId
        });

    if (accessError) {
      throw new Error(accessError.message);
    }
  }
};

const serializeUser = (
  user: AuthUser,
  requesterId: string,
  directory?: AccessDirectory
) => {
  const profile = directory?.profiles.get(user.id);
  const access = directory?.access.get(user.id);
  const shop = getJoinedShop(access);
  const role = String(profile?.role || user.app_metadata?.role || 'recepcao');

  return {
    id: user.id,
    email: user.email || '',
    name: String(profile?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário'),
    role,
    shopId: role === 'admin'
        ? 'all'
        : String(access?.shop_id || shop?.legacy_code || user.app_metadata?.shop_id || ''),
    shopName: role === 'admin' ? 'Todas as Filiais' : String(shop?.name || ''),
    shopCode: role === 'admin' ? 'all' : String(shop?.legacy_code || ''),
    isActive: profile?.is_active !== false && isUserActive(user),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at || null,
    isSelf: user.id === requesterId,
    mustChangePassword: user.app_metadata?.must_change_password === true
  };
};

const canReduceAdminCoverage = async (admin: AdminApi, client: any) => {
  const { data, error } = await admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw new Error(error.message);
  }

  const directory = await fetchAccessDirectory(client, data.users);
  const activeAdmins = data.users.filter((user) =>
      (directory.profiles.get(user.id)?.role || user.app_metadata?.role) === 'admin' &&
      directory.profiles.get(user.id)?.is_active !== false &&
      isUserActive(user)
  );

  return activeAdmins.length > MINIMUM_ACTIVE_ADMINS;
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonError('Variáveis de ambiente do Supabase não configuradas.', 500);
    }

    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return jsonError('Cabeçalho de autorização ausente.', 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const admin = adminClient.auth.admin as unknown as AdminApi;

    const { data: requesterData, error: requesterError } = await userClient.auth.getUser();
    const requester = requesterData.user as AuthUser | null;

    if (requesterError || !requester) {
      return jsonError('Sessão inválida ou expirada.', 401);
    }

    const requesterProfile = await getRequesterProfile(adminClient, requester.id);

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action || 'list');

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

      if (error || !data.user) {
        throw new Error(error?.message || 'Falha ao liberar a nova senha.');
      }

      return jsonResponse({
        user: serializeUser(data.user, requester.id)
      });
    }

    if (requesterProfile?.is_active === false || !isUserActive(requester)) {
      return jsonError('Acesso inativo.', 403);
    }

    if ((requesterProfile?.role || requester.app_metadata?.role) !== 'admin') {
      return jsonError('Somente administradores podem gerenciar contas de acesso.', 403);
    }

    if (action === 'list') {
      const { data, error } = await admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (error) {
        throw new Error(error.message);
      }

      const directory = await fetchAccessDirectory(adminClient, data.users);
      const users = data.users
          .map((user) => serializeUser(user, requester.id, directory))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

      return jsonResponse({ users });
    }

    if (action === 'create') {
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLocaleLowerCase('pt-BR');
      const password = String(body.password || '');
      const role = String(body.role || 'recepcao');
      const shopId = role === 'admin' ? 'all' : String(body.shopId || '');

      if (!name || !email || !isStrongPassword(password)) {
        return jsonError(
            `Informe nome, e-mail e uma senha provisória válida. ${PASSWORD_POLICY_MESSAGE}`,
            400
        );
      }

      try {
        await ensureValidShopAssignment(adminClient, role, shopId);
      } catch (validationError) {
        return jsonError(validationError instanceof Error ? validationError.message : 'Função ou filial inválida.', 400);
      }

      const { data, error } = await admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
          shop_id: shopId
        },
        app_metadata: {
          role,
          shop_id: shopId,
          is_active: true,
          must_change_password: true
        }
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Falha ao criar usuário.');
      }

      await syncProfileAndAccess(adminClient, data.user, {
        name,
        role,
        shopId,
        isActive: true
      });

      return jsonResponse({
        user: serializeUser(data.user, requester.id, await fetchAccessDirectory(adminClient, [data.user]))
      }, 201);
    }

    if (action === 'update') {
      const userId = String(body.userId || '');
      const role = String(body.role || '');
      const shopId = role === 'admin' ? 'all' : String(body.shopId || '');

      if (!userId) {
        return jsonError('Usuário inválido.', 400);
      }

      try {
        await ensureValidShopAssignment(adminClient, role, shopId);
      } catch (validationError) {
        return jsonError(validationError instanceof Error ? validationError.message : 'Função ou filial inválida.', 400);
      }

      if (userId === requester.id && role !== 'admin') {
        return jsonError('Você não pode remover seu próprio acesso administrativo.', 400);
      }

      const { data: targetData, error: targetError } = await admin.getUserById(userId);

      if (targetError || !targetData.user) {
        return jsonError('Usuário não encontrado.', 404);
      }

      const target = targetData.user;
      const targetProfile = await getRequesterProfile(adminClient, userId);

      if (
          (targetProfile?.role || target.app_metadata?.role) === 'admin' &&
          role !== 'admin' &&
          isUserActive(target) &&
          !(await canReduceAdminCoverage(admin, adminClient))
      ) {
        return jsonError(
            'Mantenha pelo menos dois administradores ativos antes de alterar essa função.',
            400
        );
      }

      const { data, error } = await admin.updateUserById(userId, {
        user_metadata: {
          ...target.user_metadata,
          role,
          shop_id: shopId
        },
        app_metadata: {
          ...target.app_metadata,
          role,
          shop_id: shopId
        }
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Falha ao atualizar usuário.');
      }

      await syncProfileAndAccess(adminClient, data.user, {
        name: String(data.user.user_metadata?.name || target.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário'),
        role,
        shopId,
        isActive: targetProfile?.is_active !== false && isUserActive(data.user)
      });

      return jsonResponse({
        user: serializeUser(data.user, requester.id, await fetchAccessDirectory(adminClient, [data.user]))
      });
    }

    if (action === 'set-active') {
      const userId = String(body.userId || '');
      const isActive = body.isActive === true;

      if (!userId) {
        return jsonError('Usuário inválido.', 400);
      }

      if (userId === requester.id && !isActive) {
        return jsonError('Você não pode desativar a própria conta.', 400);
      }

      const { data: targetData, error: targetError } = await admin.getUserById(userId);

      if (targetError || !targetData.user) {
        return jsonError('Usuário não encontrado.', 404);
      }

      const target = targetData.user;
      const targetProfile = await getRequesterProfile(adminClient, userId);

      if (
          !isActive &&
          (targetProfile?.role || target.app_metadata?.role) === 'admin' &&
          isUserActive(target) &&
          !(await canReduceAdminCoverage(admin, adminClient))
      ) {
        return jsonError(
            'Mantenha pelo menos dois administradores ativos antes de inativar essa conta.',
            400
        );
      }

      const { data, error } = await admin.updateUserById(userId, {
        ban_duration: isActive ? 'none' : LONG_BAN_DURATION,
        app_metadata: {
          ...target.app_metadata,
          is_active: isActive
        }
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Falha ao alterar acesso.');
      }

      const updatedProfile = await getRequesterProfile(adminClient, userId);
      const updatedRole = String(updatedProfile?.role || data.user.app_metadata?.role || 'recepcao');
      await syncProfileAndAccess(adminClient, data.user, {
        name: String(updatedProfile?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário'),
        role: updatedRole,
        shopId: updatedRole === 'admin'
            ? 'all'
            : String(data.user.app_metadata?.shop_id || target.app_metadata?.shop_id || ''),
        isActive
      });

      return jsonResponse({
        user: serializeUser(data.user, requester.id, await fetchAccessDirectory(adminClient, [data.user]))
      });
    }

    if (action === 'reset-password') {
      const userId = String(body.userId || '');
      const temporaryPassword = String(body.temporaryPassword || '');

      if (!userId || !isStrongPassword(temporaryPassword)) {
        return jsonError(
            `Informe o usuário e uma senha temporária válida. ${PASSWORD_POLICY_MESSAGE}`,
            400
        );
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

      if (error || !data.user) {
        throw new Error(error?.message || 'Falha ao redefinir a senha.');
      }

      return jsonResponse({
        user: serializeUser(data.user, requester.id)
      });
    }

    return jsonError('Ação administrativa desconhecida.', 400);
  } catch (error) {
    console.error('admin-users:', error);
    return jsonError('Não foi possível concluir a operação administrativa.', 500);
  }
});
