type CommissionBreakdown = {
  privateCommission: number;
  insuranceCommission: number;
  total: number;
};

/**
 * Formata o nome do paciente para a via do laboratório, preservando sua privacidade (LGPD).
 * Exemplo: "Carlos Henrique Souza" -> "Carlos H. S."
 */
export const formatLabName = (fullName?: string | null) => {
  if (!fullName) return '';
  const names = fullName.trim().split(/\s+/);
  if (names.length <= 1) return fullName;
  const firstName = names[0];
  const initials = names.slice(1).map((name) => `${name[0].toUpperCase()}.`).join(' ');
  return `${firstName} ${initials}`;
};

/**
 * Calcula a comissão de um profissional com base em consultas particulares e convênios.
 */
export const calculateCommission = (
  privateCount = 0,
  insuranceCount = 0,
  privatePrice = 150
): CommissionBreakdown => {
  const privateCommission = privateCount * (privatePrice * 0.40);
  const insuranceCommission = insuranceCount * 40.00;
  const total = privateCommission + insuranceCommission;

  return {
    privateCommission,
    insuranceCommission,
    total
  };
};

/**
 * Converte um horário no formato HH:MM em minutos desde a meia-noite.
 */
export const timeToMinutes = (timeStr?: string | null) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Verifica se o horário de um agendamento pertence a um determinado slot da grade.
 */
export const isTimeInSlot = (
  appTime?: string | null,
  slotTime?: string | null,
  slotDuration = 30
) => {
  const appMin = timeToMinutes(appTime);
  const slotMin = timeToMinutes(slotTime);
  return appMin >= slotMin && appMin < slotMin + slotDuration;
};

/**
 * Retorna as opções de horários de atendimento.
 */
export const getTimeOptions = (isEncaixe: boolean) => {
  const standardSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30'
  ];
  if (!isEncaixe) {
    return standardSlots;
  }

  const slots: string[] = [];
  for (let hour = 8; hour <= 17; hour += 1) {
    const hourLabel = hour.toString().padStart(2, '0');
    slots.push(`${hourLabel}:00`);
    slots.push(`${hourLabel}:15`);
    slots.push(`${hourLabel}:30`);
    slots.push(`${hourLabel}:45`);
  }
  return slots;
};
