import { describe, expect, it } from 'vitest';
import { getAuthUserProfile } from './authUser';

describe('getAuthUserProfile', () => {
  it('usa app_metadata como fonte confiável de função e filial', () => {
    const profile = getAuthUserProfile({
      id: 'user-1',
      email: 'admin@clinica.com',
      app_metadata: { role: 'admin', shop_id: 'all' },
      user_metadata: { name: 'Administrador', role: 'recepcao', shop_id: 'loja-1' }
    });

    expect(profile.role).toBe('admin');
    expect(profile.shopId).toBe('all');
    expect(profile.name).toBe('Administrador');
  });

  it('não concede acesso administrativo a partir de user_metadata', () => {
    const profile = getAuthUserProfile({
      id: 'user-2',
      email: 'usuario@clinica.com',
      app_metadata: {},
      user_metadata: { role: 'admin', shop_id: 'all' }
    });

    expect(profile.role).toBe('recepcao');
    expect(profile.shopId).toBe('loja-1');
  });
});
