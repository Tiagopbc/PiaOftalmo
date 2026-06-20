import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamAccessManager } from './TeamAccessManager';

const mocks = vi.hoisted(() => ({
  invokeAdminUsers: vi.fn()
}));

vi.mock('../utils/adminUsers', () => ({
  invokeAdminUsers: mocks.invokeAdminUsers
}));

vi.mock('../utils/passwords', () => ({
  generateTemporaryPassword: () => 'Temp#12345Aa'
}));

vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { refreshSession: vi.fn() } }
}));

const USERS = [
  {
    id: 'admin-1',
    name: 'Administrador Principal',
    email: 'admin1@clinica.com',
    role: 'admin',
    shopId: 'all',
    isActive: true,
    isSelf: true,
    mustChangePassword: false
  },
  {
    id: 'admin-2',
    name: 'Administrador Reserva',
    email: 'admin2@clinica.com',
    role: 'admin',
    shopId: 'all',
    isActive: true,
    isSelf: false,
    mustChangePassword: false
  },
  {
    id: 'user-1',
    name: 'Usuária Teste',
    email: 'teste@clinica.com',
    role: 'recepcao',
    shopId: 'loja-1',
    isActive: true,
    isSelf: false,
    mustChangePassword: false
  }
];

describe('TeamAccessManager', () => {
  beforeEach(() => {
    mocks.invokeAdminUsers.mockReset();
    mocks.invokeAdminUsers.mockImplementation(async ({ action }) => {
      if (action === 'list') return { users: USERS };
      return {};
    });
  });

  it('redefine a senha e marca a troca obrigatória para outro usuário', async () => {
    render(
      <TeamAccessManager currentUser={{
        id: 'admin-1',
        role: 'admin',
        isDemo: false
      }} />
    );

    expect(await screen.findByText('Cobertura administrativa protegida')).toBeTruthy();

    const userCard = screen.getByText('Usuária Teste').closest('article');
    fireEvent.click(within(userCard).getByRole('button', { name: 'Redefinir senha' }));
    fireEvent.click(within(userCard).getByRole('button', { name: 'Aplicar senha temporária' }));

    await waitFor(() => {
      expect(mocks.invokeAdminUsers).toHaveBeenCalledWith({
        action: 'reset-password',
        userId: 'user-1',
        temporaryPassword: 'Temp#12345Aa'
      });
      expect(within(userCard).getByRole('button', { name: 'Copiar senha temporária' })).toBeTruthy();
    });
  });
});
