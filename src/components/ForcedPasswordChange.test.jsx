import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../context/AuthContext';
import { ForcedPasswordChange } from './ForcedPasswordChange';

const mocks = vi.hoisted(() => ({
  invokeAdminUsers: vi.fn(),
  signInWithPassword: vi.fn()
}));

vi.mock('../utils/adminUsers', () => ({
  invokeAdminUsers: mocks.invokeAdminUsers
}));

vi.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword
    }
  }
}));

describe('ForcedPasswordChange', () => {
  beforeEach(() => {
    mocks.invokeAdminUsers.mockReset();
    mocks.signInWithPassword.mockReset();
  });

  it('troca a senha pela Edge Function e libera a sessão atualizada', async () => {
    const setCurrentUser = vi.fn();
    mocks.invokeAdminUsers.mockResolvedValue({});
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'colaborador@clinica.com',
          app_metadata: {
            role: 'recepcao',
            shop_id: 'loja-1',
            must_change_password: false
          },
          user_metadata: { name: 'Colaborador' }
        }
      },
      error: null
    });

    render(
      <AuthContext.Provider value={{
        currentUser: {
          email: 'colaborador@clinica.com',
          mustChangePassword: true
        },
        setCurrentUser,
        logout: vi.fn()
      }}>
        <ForcedPasswordChange />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'NovaSenha#123' }
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'NovaSenha#123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));

    await waitFor(() => {
      expect(mocks.invokeAdminUsers).toHaveBeenCalledWith({
        action: 'complete-password-change',
        password: 'NovaSenha#123'
      });
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'colaborador@clinica.com',
        password: 'NovaSenha#123'
      });
      expect(setCurrentUser).toHaveBeenCalledWith(expect.objectContaining({
        mustChangePassword: false,
        role: 'recepcao'
      }));
    });
  });

  it('orienta novo login quando a senha muda, mas a nova sessão falha', async () => {
    mocks.invokeAdminUsers.mockResolvedValue({});
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Falha interna da sessão')
    });

    render(
      <AuthContext.Provider value={{
        currentUser: {
          email: 'colaborador@clinica.com',
          mustChangePassword: true
        },
        setCurrentUser: vi.fn(),
        logout: vi.fn()
      }}>
        <ForcedPasswordChange />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'NovaSenha#123' }
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'NovaSenha#123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Saia da conta e entre novamente com a nova senha.'
      );
    });
  });

  it('permite revelar os dois campos sem remover a proteção inicial', () => {
    render(
      <AuthContext.Provider value={{
        currentUser: {
          email: 'colaborador@clinica.com',
          mustChangePassword: true
        },
        setCurrentUser: vi.fn(),
        logout: vi.fn()
      }}>
        <ForcedPasswordChange />
      </AuthContext.Provider>
    );

    const passwordInput = screen.getByLabelText('Nova senha');
    const confirmationInput = screen.getByLabelText('Confirmar nova senha');

    expect(passwordInput.type).toBe('password');
    expect(confirmationInput.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nova senha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar confirmação de senha' }));

    expect(passwordInput.type).toBe('text');
    expect(confirmationInput.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Ocultar nova senha' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ocultar confirmação de senha' })).toBeTruthy();
  });

  it('não redefine a senha quando a confirmação estiver diferente', () => {
    render(
      <AuthContext.Provider value={{
        currentUser: {
          email: 'colaborador@clinica.com',
          mustChangePassword: true
        },
        setCurrentUser: vi.fn(),
        logout: vi.fn()
      }}>
        <ForcedPasswordChange />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'NovaSenha#123' }
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'OutraSenha#456' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));

    expect(screen.getByRole('alert').textContent).toBe('As senhas informadas não coincidem.');
    expect(mocks.invokeAdminUsers).not.toHaveBeenCalled();
  });

  it('não envia uma senha que não atende todos os requisitos', () => {
    render(
      <AuthContext.Provider value={{
        currentUser: {
          email: 'colaborador@clinica.com',
          mustChangePassword: true
        },
        setCurrentUser: vi.fn(),
        logout: vi.fn()
      }}>
        <ForcedPasswordChange />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'senhasimples' }
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'senhasimples' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));

    expect(screen.getByRole('alert').textContent).toContain('letra maiúscula');
    expect(mocks.invokeAdminUsers).not.toHaveBeenCalled();
  });
});
