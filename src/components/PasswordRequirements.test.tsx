import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordRequirements } from './PasswordRequirements';

describe('PasswordRequirements', () => {
  it('acompanha visualmente cada requisito e a confirmação', () => {
    const { rerender } = render(
      <PasswordRequirements password="senha" confirmation="" />
    );

    expect(screen.getByLabelText('8 caracteres ou mais: pendente')).toBeTruthy();
    expect(screen.getByLabelText('Uma letra maiúscula: pendente')).toBeTruthy();
    expect(screen.getByLabelText('Uma letra minúscula: atendido')).toBeTruthy();
    expect(screen.getByLabelText('Um número: pendente')).toBeTruthy();
    expect(screen.getByLabelText('Um símbolo: pendente')).toBeTruthy();
    expect(screen.getByLabelText('As duas senhas são iguais: pendente')).toBeTruthy();

    rerender(
      <PasswordRequirements password="Senha#123" confirmation="Senha#123" />
    );

    expect(screen.getByLabelText('8 caracteres ou mais: atendido')).toBeTruthy();
    expect(screen.getByLabelText('Uma letra maiúscula: atendido')).toBeTruthy();
    expect(screen.getByLabelText('Uma letra minúscula: atendido')).toBeTruthy();
    expect(screen.getByLabelText('Um número: atendido')).toBeTruthy();
    expect(screen.getByLabelText('Um símbolo: atendido')).toBeTruthy();
    expect(screen.getByLabelText('As duas senhas são iguais: atendido')).toBeTruthy();
  });
});
