/**
 * Formata o nome do paciente para a via do laboratório, preservando sua privacidade (LGPD).
 * Exemplo: "Carlos Henrique Souza" -> "Carlos H. S."
 * @param {string} fullName Nome completo do paciente
 * @returns {string} Nome abreviado/anonimizado
 */
export const formatLabName = (fullName) => {
  if (!fullName) return '';
  const names = fullName.trim().split(/\s+/);
  if (names.length <= 1) return fullName;
  const firstName = names[0];
  const initials = names.slice(1).map(n => n[0].toUpperCase() + '.').join(' ');
  return `${firstName} ${initials}`;
};
/**
 * Calcula a comissão de um profissional com base em consultas particulares e convênios.
 * @param {number} privateCount Quantidade de consultas particulares
 * @param {number} insuranceCount Quantidade de consultas por convênio
 * @param {number} privatePrice Preço base da consulta particular (padrão R$ 150,00)
 * @returns {object} Detalhamento dos valores calculados
 */
export const calculateCommission = (privateCount = 0, insuranceCount = 0, privatePrice = 150) => {
  const privateCommission = privateCount * (privatePrice * 0.40); // 40% de comissão
  const insuranceCommission = insuranceCount * 40.00; // Taxa fixa de R$ 40,00
  const total = privateCommission + insuranceCommission;

  return {
    privateCommission,
    insuranceCommission,
    total
  };
};

/**
 * Converte um horário no formato HH:MM em minutos desde a meia-noite.
 * @param {string} timeStr Horário no formato HH:MM
 * @returns {number} Minutos totais
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Verifica se o horário de um agendamento pertence a um determinado slot da grade.
 * @param {string} appTime Horário do agendamento (HH:MM)
 * @param {string} slotTime Horário do slot na grade (HH:MM)
 * @param {number} slotDuration minutos de duração do slot (padrão 30)
 * @returns {boolean} true se o agendamento pertence ao slot
 */
export const isTimeInSlot = (appTime, slotTime, slotDuration = 30) => {
  const appMin = timeToMinutes(appTime);
  const slotMin = timeToMinutes(slotTime);
  return appMin >= slotMin && appMin < slotMin + slotDuration;
};

/**
 * Retorna as opções de horários de atendimento (30 em 30 min se não for encaixe, e 15 em 15 min se for encaixe).
 * @param {boolean} isEncaixe Se o agendamento é um encaixe
 * @returns {string[]} Lista de strings no formato HH:MM
 */
export const getTimeOptions = (isEncaixe) => {
  const standardSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30'
  ];
  if (!isEncaixe) {
    return standardSlots;
  }

  const slots = [];
  for (let h = 8; h <= 17; h++) {
    const hStr = h.toString().padStart(2, '0');
    slots.push(`${hStr}:00`);
    slots.push(`${hStr}:15`);
    slots.push(`${hStr}:30`);
    slots.push(`${hStr}:45`);
  }
  return slots;
};
