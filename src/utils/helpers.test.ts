import { describe, it, expect } from 'vitest';
import {
  formatLabName,
  calculateCommission,
  timeToMinutes,
  isTimeInSlot,
  getTimeOptions
} from './helpers';

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

describe('timeToMinutes', () => {
  it('should convert HH:MM to total minutes from midnight correctly', () => {
    expect(timeToMinutes('08:00')).toBe(480);
    expect(timeToMinutes('10:15')).toBe(615);
    expect(timeToMinutes('13:30')).toBe(810);
    expect(timeToMinutes('17:45')).toBe(1065);
    expect(timeToMinutes('')).toBe(0);
    expect(timeToMinutes(null)).toBe(0);
  });
});

describe('isTimeInSlot', () => {
  it('should correctly determine if a given appointment time falls inside a specific slot range', () => {
    // Slot 10:00 (range 10:00 to 10:29)
    expect(isTimeInSlot('10:00', '10:00')).toBe(true);
    expect(isTimeInSlot('10:15', '10:00')).toBe(true);
    expect(isTimeInSlot('10:29', '10:00')).toBe(true);
    expect(isTimeInSlot('10:30', '10:00')).toBe(false);
    expect(isTimeInSlot('09:59', '10:00')).toBe(false);

    // Slot 10:30 (range 10:30 to 10:59)
    expect(isTimeInSlot('10:30', '10:30')).toBe(true);
    expect(isTimeInSlot('10:45', '10:30')).toBe(true);
    expect(isTimeInSlot('11:00', '10:30')).toBe(false);
  });
});

describe('getTimeOptions', () => {
  it('should return 30-minute standard intervals when not a squeeze-in', () => {
    const slots = getTimeOptions(false);
    expect(slots).toContain('08:00');
    expect(slots).toContain('08:30');
    expect(slots).not.toContain('08:15');
    expect(slots.length).toBe(20);
  });

  it('should return 15-minute intervals when is a squeeze-in', () => {
    const slots = getTimeOptions(true);
    expect(slots).toContain('08:00');
    expect(slots).toContain('08:15');
    expect(slots).toContain('08:30');
    expect(slots).toContain('08:45');
    expect(slots.length).toBe(40);
  });
});
