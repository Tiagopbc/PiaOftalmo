export const SERVICE_TYPES = [
  { id: 'consulta', name: 'Consulta Geral', duration: 30 },
  { id: 'exame', name: 'Exame de Campo Visual', duration: 45 },
  { id: 'adaptacao', name: 'Adaptação de Lente de Contato', duration: 60 },
  { id: 'retirada', name: 'Retirada de Óculos / Ajuste', duration: 15 },
  { id: 'retorno', name: 'Consulta de Retorno', duration: 20 },
  { id: 'avaliacao', name: 'Avaliação Cirúrgica', duration: 30 }
];

export const PAYMENT_TYPES = [
  { id: 'convenio', name: 'Unimed / Convênio' },
  { id: 'particular', name: 'Particular' },
  { id: 'cortesia', name: 'Cortesia' }
];

export const ROOMS = [
  { id: 'sala-1', name: 'Consultório 1 - Refração' },
  { id: 'sala-2', name: 'Consultório 2 - Lentes' },
  { id: 'sala-3', name: 'Sala de Exames Diagnósticos' }
];
