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
