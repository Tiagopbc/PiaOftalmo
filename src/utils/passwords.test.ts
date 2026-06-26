import { describe, expect, it } from 'vitest';
import {
  generateTemporaryPassword,
  getPasswordRequirements,
  isStrongPassword
} from './passwords';

describe('generateTemporaryPassword', () => {
  it('gera uma senha forte com os grupos obrigatórios', () => {
    const password = generateTemporaryPassword();

    expect(password).toHaveLength(16);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%&*?]/);
  });

  it('gera valores diferentes entre chamadas', () => {
    expect(generateTemporaryPassword()).not.toBe(generateTemporaryPassword());
  });

  it('recusa comprimentos inseguros', () => {
    expect(() => generateTemporaryPassword(7)).toThrow(/pelo menos 8/);
  });

  it('valida todos os requisitos da política', () => {
    expect(isStrongPassword('Senha#123')).toBe(true);
    expect(isStrongPassword('senha#123')).toBe(false);
    expect(isStrongPassword('SENHA#123')).toBe(false);
    expect(isStrongPassword('SenhaTeste')).toBe(false);
    expect(isStrongPassword('Senha123')).toBe(false);
    expect(isStrongPassword('Senhç123')).toBe(false);
    expect(isStrongPassword('Ab#123')).toBe(false);

    expect(getPasswordRequirements('Senha#123').every(({ met }) => met)).toBe(true);
  });
});
