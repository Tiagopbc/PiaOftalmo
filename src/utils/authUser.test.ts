import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthUserProfile } from './authUser';

const mocks = vi.hoisted(() => {
  const state: {
    profile: Record<string, unknown> | null;
    access: Record<string, unknown> | null;
    profileError: Error | null;
    accessError: Error | null;
  } = {
    profile: null,
    access: null,
    profileError: null,
    accessError: null
  };

  const from = vi.fn((table: string) => {
    const result = table === 'profiles'
      ? { data: state.profile, error: state.profileError }
      : { data: state.access, error: state.accessError };

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      limit: vi.fn(() => query),
      single: vi.fn().mockResolvedValue(result)
    };

    return query;
  });

  return { from, state };
});

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: mocks.from
  }
}));

describe('getAuthUserProfile', () => {
  beforeEach(() => {
    mocks.from.mockClear();
    mocks.state.profile = null;
    mocks.state.access = null;
    mocks.state.profileError = null;
    mocks.state.accessError = null;
  });

  it('usa profiles como fonte confiável de função administrativa', async () => {
    mocks.state.profile = { role: 'admin' };

    const profile = await getAuthUserProfile({
      id: 'user-1',
      email: 'admin@clinica.com',
      app_metadata: { role: 'recepcao', shop_id: 'loja-1' },
      user_metadata: { name: 'Administrador', role: 'recepcao', shop_id: 'loja-1' }
    });

    expect(profile.role).toBe('admin');
    expect(profile.appRole).toBe('admin');
    expect(profile.shopId).toBe('all');
    expect(profile.shopName).toBe('Todas as Filiais');
    expect(profile.name).toBe('Administrador');
    expect(mocks.from).toHaveBeenCalledWith('profiles');
    expect(mocks.from).not.toHaveBeenCalledWith('user_shop_access');
  });

  it('usa profiles.full_name como nome exibido quando disponível', async () => {
    mocks.state.profile = { role: 'medico', full_name: 'Médico Teste' };
    mocks.state.access = {
      shop_id: 'shop-uuid-1',
      shops: { legacy_code: 'loja-1', name: 'Filial 1 - Centro' }
    };

    const profile = await getAuthUserProfile({
      id: 'user-medico',
      email: 'medico@clinica.com',
      app_metadata: {},
      user_metadata: { name: 'Nome Antigo' }
    });

    expect(profile.name).toBe('Médico Teste');
    expect(profile.role).toBe('medico');
  });

  it('não concede acesso administrativo a partir de user_metadata ou app_metadata', async () => {
    mocks.state.profile = { role: 'recepcao' };
    mocks.state.access = {
      shop_id: 'shop-uuid-1',
      shops: { legacy_code: 'loja-1', name: 'Filial 1 - Centro' }
    };

    const profile = await getAuthUserProfile({
      id: 'user-2',
      email: 'usuario@clinica.com',
      app_metadata: { role: 'admin', shop_id: 'all' },
      user_metadata: { role: 'admin', shop_id: 'all' }
    });

    expect(profile.role).toBe('recepcao');
    expect(profile.shopId).toBe('shop-uuid-1');
    expect(profile.shopName).toBe('Filial 1 - Centro');
    expect(profile.shopCode).toBe('loja-1');
    expect(mocks.from).toHaveBeenCalledWith('profiles');
    expect(mocks.from).toHaveBeenCalledWith('user_shop_access');
  });

  it('exige a troca de senha somente quando app_metadata determina', async () => {
    mocks.state.profile = { role: 'recepcao' };
    mocks.state.access = {
      shop_id: 'shop-uuid-1',
      shops: { legacy_code: 'loja-1', name: 'Filial 1 - Centro' }
    };

    const profile = await getAuthUserProfile({
      id: 'user-3',
      email: 'temporario@clinica.com',
      app_metadata: { must_change_password: true },
      user_metadata: { must_change_password: false }
    });

    expect(profile.mustChangePassword).toBe(true);
  });

  it('não confia em user_metadata para liberar ou exigir troca de senha', async () => {
    mocks.state.profile = { role: 'recepcao' };
    mocks.state.access = {
      shop_id: 'shop-uuid-1',
      shops: { legacy_code: 'loja-1', name: 'Filial 1 - Centro' }
    };

    const profile = await getAuthUserProfile({
      id: 'user-4',
      email: 'usuario@clinica.com',
      app_metadata: {},
      user_metadata: { must_change_password: true }
    });

    expect(profile.mustChangePassword).toBe(false);
  });
});
