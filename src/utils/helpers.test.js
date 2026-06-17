import { describe, it, expect } from 'vitest';
import { formatLabName, calculateCommission } from './helpers';

describe('formatLabName', () => {
  it('should format patient names correctly by keeping the first name and abbreviating intermediate/last names', () => {
    expect(formatLabName('Carlos Henrique Souza')).toBe('Carlos H. S.');
    expect(formatLabName('Mariana de Oliveira Costa')).toBe('Mariana D. O. C.');
    expect(formatLabName('José Alencar Ramos')).toBe('José A. R.');
    expect(formatLabName('Solange')).toBe('Solange');
    expect(formatLabName('')).toBe('');
    expect(formatLabName(null)).toBe('');
  });
});

describe('calculateCommission', () => {
  it('should calculate correct commission details for private and insurance consultations', () => {
    // 40% de 150 = 60 por consulta particular.
    // R$ 40 fixo por consulta de convênio.
    const result = calculateCommission(2, 3, 150);
    expect(result.privateCommission).toBe(120);
    expect(result.insuranceCommission).toBe(120);
    expect(result.total).toBe(240);
  });

  it('should work with default parameters', () => {
    const result = calculateCommission();
    expect(result.privateCommission).toBe(0);
    expect(result.insuranceCommission).toBe(0);
    expect(result.total).toBe(0);
  });

  it('should support custom private consultation prices', () => {
    // 40% de 350 = 140 por consulta particular.
    // R$ 40 fixo por consulta de convênio.
    const result = calculateCommission(1, 1, 350);
    expect(result.privateCommission).toBe(140);
    expect(result.insuranceCommission).toBe(40);
    expect(result.total).toBe(180);
  });
});
