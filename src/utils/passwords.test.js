import { describe, expect, it } from 'vitest';
import { generateTemporaryPassword } from './passwords';

describe('generateTemporaryPassword', () => {
  it('gera uma senha forte com os grupos obrigatórios', () => {
    const password = generateTemporaryPassword();

    expect(password).toHaveLength(14);
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
});
