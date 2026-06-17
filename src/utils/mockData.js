// Dados de simulação para a clínica PIA Oftalmo

export const INITIAL_PROFESSIONALS = [
  { id: '1', name: 'Dr. Roberto Mendes', specialty: 'Oftalmologista Geral', color: '#3b82f6' },
  { id: '2', name: 'Dra. Sandra Regina', specialty: 'Contatóloga / Lentes de Contato', color: '#10b981' },
  { id: '3', name: 'Dr. Lucas Viana', specialty: 'Especialista em Retinografia', color: '#f59e0b' }
];

export const INITIAL_ROOMS = [
  { id: 'sala-1', name: 'Consultório 1 - Refração' },
  { id: 'sala-2', name: 'Consultório 2 - Lentes' },
  { id: 'sala-3', name: 'Sala de Exames Diagnósticos' }
];

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

export const INITIAL_PATIENTS = [
  {
    id: 'pat-1',
    name: 'Carlos Henrique Souza',
    cpf: '123.456.789-00',
    rg: '12.345.678-9',
    birthDate: '1982-05-14',
    gender: 'Masculino',
    phone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    email: 'carlos.souza@email.com',
    address: 'Rua das Flores, 123, Apto 42 - Pinheiros, São Paulo - SP',
    isMinor: false,
    guardian: {
      name: '',
      cpf: '',
      phone: ''
    },
    alerts: [
      { id: 'a1', type: 'clinical', text: 'Alergia a colírio dilatador (Atropina)', color: '#ef4444' },
      { id: 'a2', type: 'administrative', text: 'Retorno pendente de exames de glaucoma', color: '#f59e0b' }
    ],
    notes: 'Paciente relata dores de cabeça frequentes após leitura prolongada. Histórico familiar de glaucoma (pai).',
    timeline: [
      { id: 't1', date: '2026-05-10', type: 'appointment', title: 'Consulta Geral Realizada', desc: 'Prescrição de novos óculos para perto. Dr. Roberto Mendes.' },
      { id: 't2', date: '2026-05-10', type: 'prescription', title: 'Receita Emitida', desc: 'OD: -2.25 CIL -0.50 EIXO 90° | OE: -2.00 CIL -0.75 EIXO 85°' },
      { id: 't3', date: '2026-05-12', type: 'purchase', title: 'Compra na Ótica', desc: 'Armação Ralph Lauren + Lentes Crizal Sapphire. OS #1042.' }
    ],
    prescriptions: [
      {
        id: 'p1',
        date: '2026-05-10',
        doctor: 'Dr. Roberto Mendes',
        od: { esferico: '-2.25', cilindrico: '-0.50', eixo: '90', adicao: '+1.50', dnp: '31.5' },
        oe: { esferico: '-2.00', cilindrico: '-0.75', eixo: '85', adicao: '+1.50', dnp: '32.0' },
        lensType: 'Multifocal Crizal',
        notes: 'Uso constante para leitura e computador.'
      }
    ],
    purchases: [
      {
        id: 'pur-1',
        date: '2026-05-12',
        osNumber: 'OS-1042',
        item: 'Armação Ralph Lauren RA7074 + Lentes Multifocais',
        value: 1850.00,
        status: 'Entregue'
      }
    ],
    exams: [
      { id: 'e1', date: '2026-05-10', name: 'Tonometria de Sopro', result: 'OD: 14 mmHg | OE: 15 mmHg (Normal)', doctor: 'Dr. Roberto Mendes' }
    ],
    attachments: [
      { id: 'att-1', name: 'Laudo_Tonometria_Maio2026.pdf', date: '2026-05-10', size: '1.2 MB' }
    ]
  },
  {
    id: 'pat-2',
    name: 'Mariana de Oliveira Costa',
    cpf: '987.654.321-11',
    rg: '98.765.432-1',
    birthDate: '2015-08-22',
    gender: 'Feminino',
    phone: '(11) 99888-7766',
    whatsapp: '(11) 99888-7766',
    email: 'mae.mariana@email.com',
    address: 'Av. Paulista, 1500, Bloco B - Bela Vista, São Paulo - SP',
    isMinor: true,
    guardian: {
      name: 'Fabiana de Oliveira Costa (Mãe)',
      cpf: '555.666.777-88',
      phone: '(11) 99888-7766'
    },
    alerts: [
      { id: 'a3', type: 'clinical', text: 'Estrabismo divergente sob fadiga', color: '#3b82f6' }
    ],
    notes: 'Acompanhamento semestral de miopia progressiva infantil. Mãe muito atenta aos prazos.',
    timeline: [
      { id: 't4', date: '2026-06-01', type: 'appointment', title: 'Exame de Campo Visual', desc: 'Realizado com sucesso. Dra. Sandra Regina.' },
      { id: 't5', date: '2026-06-01', type: 'prescription', title: 'Receita de Lente de Contato', desc: 'Adaptação iniciada para lentes gelatinosas descarte mensal.' }
    ],
    prescriptions: [
      {
        id: 'p2',
        date: '2026-06-01',
        doctor: 'Dra. Sandra Regina',
        od: { esferico: '-3.50', cilindrico: 'Plano', eixo: '0', adicao: '', dnp: '30.0' },
        oe: { esferico: '-3.75', cilindrico: 'Plano', eixo: '0', adicao: '', dnp: '30.0' },
        lensType: 'Lente de Contato Gelatinosa',
        notes: 'Adaptação satisfatória.'
      }
    ],
    purchases: [],
    exams: [
      { id: 'e2', date: '2026-06-01', name: 'Mapeamento de Retina', result: 'Sem alterações periféricas', doctor: 'Dra. Sandra Regina' }
    ],
    attachments: []
  },
  {
    id: 'pat-3',
    name: 'José Alencar Ramos',
    cpf: '456.789.123-22',
    rg: '45.678.912-3',
    birthDate: '1955-11-03',
    gender: 'Masculino',
    phone: '(11) 97654-3210',
    whatsapp: '(11) 97654-3210',
    email: 'jose.alencar@email.com',
    address: 'Rua Augusta, 900 - Consolação, São Paulo - SP',
    isMinor: false,
    guardian: { name: '', cpf: '', phone: '' },
    alerts: [
      { id: 'a4', type: 'administrative', text: 'Paciente Inadimplente - Contatar financeiro antes de nova venda', color: '#ef4444' }
    ],
    notes: 'Pós-operatório de catarata em olho direito realizado em Março de 2026. Necessita monitorar pressão intraocular.',
    timeline: [
      { id: 't6', date: '2026-03-15', type: 'appointment', title: 'Cirurgia de Catarata', desc: 'Realizada sem intercorrências no OD.' },
      { id: 't7', date: '2026-04-15', type: 'appointment', title: 'Retorno 30 dias', desc: 'Recuperação excelente. Dr. Roberto Mendes.' }
    ],
    prescriptions: [],
    purchases: [
      {
        id: 'pur-2',
        date: '2026-04-15',
        osNumber: 'OS-0992',
        item: 'Lentes Varilux Physio no óculos antigo',
        value: 1200.00,
        status: 'Aguardando Pagamento'
      }
    ],
    exams: [],
    attachments: []
  }
];

// Gerar agendamentos dinâmicos ao redor da data atual para parecer ativo
const getRelativeDate = (daysOffset) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

export const INITIAL_APPOINTMENTS = [
  {
    id: 'app-1',
    patientId: 'pat-1',
    patientName: 'Carlos Henrique Souza',
    professionalId: '1', // Dr. Roberto Mendes
    roomId: 'sala-1',
    serviceId: 'consulta',
    paymentType: 'particular',
    date: getRelativeDate(0), // Hoje
    time: '09:00',
    duration: 30,
    status: 'confirmado', // confirmado, atendido, cancelado, falta
    notes: 'Exame de rotina anual e revisão da receita.'
  },
  {
    id: 'app-2',
    patientId: 'pat-2',
    patientName: 'Mariana de Oliveira Costa',
    professionalId: '2', // Dra. Sandra Regina
    roomId: 'sala-2',
    serviceId: 'adaptacao',
    paymentType: 'convenio',
    date: getRelativeDate(0), // Hoje
    time: '10:30',
    duration: 60,
    status: 'confirmado',
    notes: 'Treinamento de colocação e retirada das lentes gelatinosas.'
  },
  {
    id: 'app-3',
    patientId: 'pat-3',
    patientName: 'José Alencar Ramos',
    professionalId: '1', // Dr. Roberto Mendes
    roomId: 'sala-1',
    serviceId: 'retorno',
    paymentType: 'cortesia',
    date: getRelativeDate(0), // Hoje
    time: '14:00',
    duration: 20,
    status: 'confirmado',
    notes: 'Avaliação pós-operatória de catarata.'
  },
  {
    id: 'app-4',
    patientId: 'pat-1',
    patientName: 'Carlos Henrique Souza',
    professionalId: '3', // Dr. Lucas Viana
    roomId: 'sala-3',
    serviceId: 'exame',
    paymentType: 'convenio',
    date: getRelativeDate(1), // Amanhã
    time: '11:00',
    duration: 45,
    status: 'confirmado',
    notes: 'Mapeamento de retina agendado.'
  }
];

export const INITIAL_WAITLIST = [
  { id: 'w1', patientName: 'Solange Maria Silva', phone: '(11) 94444-5555', preferredDoctor: 'Dr. Roberto Mendes', service: 'Consulta Geral', dateAdded: getRelativeDate(-1) },
  { id: 'w2', patientName: 'Pedro Cavalcante', phone: '(11) 93333-2222', preferredDoctor: 'Qualquer profissional', service: 'Adaptação de Lente', dateAdded: getRelativeDate(0) }
];
