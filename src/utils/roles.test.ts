import { describe, expect, it } from 'vitest';
import {
  canCreatePatients,
  canManageAdministrativeAlerts,
  getCanonicalRole,
  getRoleLabel,
  isAdminUser,
  isDoctorUser,
  isReceptionUser
} from './roles';

describe('roles', () => {
  it.each([
    'medico',
    'médico',
    'doctor',
    'oftalmologista',
    'especialista',
    'especialista médico',
    'especialista (médico)',
    'medico especialista'
  ])('reconhece "%s" como papel técnico de médico', (role) => {
    expect(getCanonicalRole(role)).toBe('medico');
    expect(getRoleLabel(role)).toBe('Especialista (Médico)');
  });

  it('aplica permissões de médico mesmo quando a função vem como rótulo de interface', () => {
    const user = {
      role: 'Especialista (Médico)',
      appRole: 'Especialista'
    };

    expect(isDoctorUser(user)).toBe(true);
    expect(canCreatePatients(user)).toBe(false);
    expect(canManageAdministrativeAlerts(user)).toBe(false);
  });

  it('reconhece administrador e recepção por rótulos amigáveis', () => {
    expect(isAdminUser({ role: 'Administrador Geral' })).toBe(true);
    expect(isReceptionUser({ role: 'Recepção' })).toBe(true);
    expect(canCreatePatients({ role: 'Recepção' })).toBe(true);
  });

  it('prefere segurança quando role técnico e rótulo visual divergem', () => {
    const user = {
      role: 'medico',
      appRole: 'Especialista (Médico)'
    };

    expect(isDoctorUser(user)).toBe(true);
    expect(canCreatePatients(user)).toBe(false);
    expect(canManageAdministrativeAlerts(user)).toBe(false);
  });
});
