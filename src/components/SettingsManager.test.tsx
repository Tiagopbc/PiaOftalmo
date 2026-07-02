import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppContext } from '../context/AppContext';
import { AuthContext } from '../context/AuthContext';
import SettingsManager from './SettingsManager';

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  rpc: vi.fn()
}));

vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      updateUser: mocks.updateUser
    },
    rpc: mocks.rpc
  }
}));

const renderSettings = () => render(
  <AuthContext.Provider value={{
    currentUser: {
      id: 'user-1',
      email: 'colaborador@clinica.com',
      name: 'Colaborador',
      role: 'recepcao',
      appRole: 'recepcao',
      shopId: 'shop-1'
    },
    setCurrentUser: vi.fn(),
    logout: vi.fn()
  }}>
    <AppContext.Provider value={{
      activeTab: 'settings',
      setActiveTab: vi.fn(),
      selectedPatientId: null,
      setSelectedPatientId: vi.fn(),
      activePrintData: null,
      setActivePrintData: vi.fn(),
      clinicSettings: {
        name: 'Clínica Demo',
        address: '',
        cep: '',
        phone: ''
      },
      updateClinicSettings: vi.fn(),
      theme: 'light',
      toggleTheme: vi.fn(),
      professionals: [],
      rooms: []
    }}>
      <SettingsManager />
    </AppContext.Provider>
  </AuthContext.Provider>
);

describe('SettingsManager - alteração de senha', () => {
  beforeEach(() => {
    mocks.updateUser.mockReset();
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ error: null });
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exige confirmação e permite visualizar os dois campos', async () => {
    renderSettings();

    const passwordInput = screen.getByLabelText('Nova senha*') as HTMLInputElement;
    const confirmationInput = screen.getByLabelText('Confirmar nova senha*') as HTMLInputElement;

    fireEvent.change(passwordInput, { target: { value: 'NovaSenha#123' } });
    fireEvent.change(confirmationInput, { target: { value: 'OutraSenha#456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar Senha' }));

    expect(window.alert).toHaveBeenCalledWith('As senhas informadas não coincidem.');
    expect(mocks.updateUser).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nova senha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar confirmação de senha' }));

    expect(passwordInput.type).toBe('text');
    expect(confirmationInput.type).toBe('text');

    fireEvent.change(confirmationInput, { target: { value: 'NovaSenha#123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar Senha' }));

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'NovaSenha#123' });
      expect(window.alert).toHaveBeenCalledWith('Senha atualizada com sucesso!');
    });
  });

  it('sincroniza o nome de exibição no perfil público e no Auth', async () => {
    renderSettings();

    fireEvent.change(screen.getByLabelText('Nome Completo / Exibição*'), {
      target: { value: '  Médico Teste  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('update_own_profile_name', {
        new_full_name: 'Médico Teste'
      });
      expect(mocks.updateUser).toHaveBeenCalledWith({
        data: { name: 'Médico Teste' }
      });
      expect(window.alert).toHaveBeenCalledWith('Nome de perfil atualizado com sucesso!');
    });
  });
});
