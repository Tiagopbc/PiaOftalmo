import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamAccessManager } from './TeamAccessManager';

const mocks = vi.hoisted(() => ({
  invokeAdminUsers: vi.fn(),
  getAllShops: vi.fn()
}));

vi.mock('../utils/adminUsers', () => ({
  invokeAdminUsers: mocks.invokeAdminUsers
}));

vi.mock('../services/shopService', () => ({
  shopService: {
    getAll: mocks.getAllShops
  }
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
    shopId: 'shop-uuid-1',
    isActive: true,
    isSelf: false,
    mustChangePassword: false
  }
];

describe('TeamAccessManager', () => {
  beforeEach(() => {
    mocks.invokeAdminUsers.mockReset();
    mocks.getAllShops.mockReset();
    mocks.getAllShops.mockResolvedValue([
      {
        id: 'shop-uuid-1',
        name: 'Filial 1 - Centro',
        isActive: true
      }
    ]);
    mocks.invokeAdminUsers.mockImplementation(async ({ action }) => {
      if (action === 'list') return { users: USERS };
      return {};
    });
  });

  it('redefine a senha e marca a troca obrigatória para outro usuário', async () => {
    render(
      <TeamAccessManager currentUser={{
        id: 'admin-1',
        email: 'admin1@clinica.com',
        name: 'Administrador Principal',
        role: 'admin',
        shopId: 'all'
      }} />
    );

    expect(await screen.findByText('Cobertura administrativa protegida')).toBeTruthy();

    const userCard = screen.getByText('Usuária Teste').closest('article');
    expect(userCard).toBeTruthy();
    if (!userCard) throw new Error('Card da usuária teste não encontrado.');

    fireEvent.click(within(userCard).getByRole('button', { name: /Editar acesso de Usuária Teste/i }));
    fireEvent.click(within(userCard).getByRole('button', { name: 'Redefinir senha' }));
    fireEvent.click(within(userCard).getByRole('button', { name: 'Aplicar senha temporária' }));

    await waitFor(() => {
      const resetCall = mocks.invokeAdminUsers.mock.calls.find(
        ([payload]) => payload.action === 'reset-password'
      );
      expect(resetCall).toBeTruthy();
      if (!resetCall) throw new Error('Chamada de redefinição não encontrada.');

      expect(resetCall[0].userId).toBe('user-1');
      expect(resetCall[0].temporaryPassword).toHaveLength(16);
      expect(resetCall[0].temporaryPassword).toMatch(/[A-Z]/);
      expect(resetCall[0].temporaryPassword).toMatch(/[a-z]/);
      expect(resetCall[0].temporaryPassword).toMatch(/[0-9]/);
      expect(resetCall[0].temporaryPassword).toMatch(/[^A-Za-z0-9\s]/);
      expect(within(userCard).getByRole('button', { name: 'Copiar senha temporária' })).toBeTruthy();
    });
  });
});
