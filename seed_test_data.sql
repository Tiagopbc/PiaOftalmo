-- =====================================================================
-- SCRIPT DE SEMEADURA DE DADOS DE TESTE REAL (PIA OFTALMO)
-- =====================================================================
-- Instruções:
-- 1. Acesse o painel do seu Supabase (https://supabase.com).
-- 2. Vá em: SQL Editor -> New Query.
-- 3. Cole todo o conteúdo deste arquivo e clique em "Run" (Executar).
-- =====================================================================

-- 1. LIMPAR DADOS EXISTENTES (Zerar tabelas)
TRUNCATE TABLE waitlist CASCADE;
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE patients CASCADE;

-- 2. INSERIR 10 PACIENTES DE TESTE (com prefixo TESTE)
INSERT INTO patients (
  id, name, cpf, rg, birth_date, gender, phone, whatsapp, email, address, 
  is_minor, guardian, alerts, notes, timeline, prescriptions, purchases, exams, attachments, shop_id
) VALUES 
(
  'pat-teste-1', 
  '(TESTE) Ana Clara Silva', 
  '111.222.333-44', 
  '11.222.333-4', 
  '1995-03-15', 
  'Feminino', 
  '(98) 98888-1111', 
  '(98) 98888-1111', 
  'anaclara@teste.com', 
  'Rua das Palmeiras, 10, Cohama - São Luís/MA', 
  false, 
  '{}'::jsonb, 
  '[{"id": "a-t1", "type": "clinical", "text": "Pressão ocular limítrofe", "color": "#f59e0b"}]'::jsonb, 
  'Paciente relata fadiga ocular frequente após trabalhar no computador.', 
  '[{"id": "t-t1", "date": "2026-06-18", "type": "system", "title": "Cadastro Inicial", "desc": "Ficha criada para testes reais."}]'::jsonb, 
  '[{"id": "rx-t1", "date": "2026-06-18", "doctor": "Dr. Roberto Mendes", "od": {"esferico": "-1.50", "cilindrico": "-0.50", "eixo": "90", "adicao": "", "dnp": "31.0"}, "oe": {"esferico": "-1.25", "cilindrico": "-0.75", "eixo": "85", "adicao": "", "dnp": "31.5"}, "lensType": "Monofocal antirreflexo", "notes": "Uso para longe e computador."}]'::jsonb, 
  '[{"id": "pur-t1", "date": "2026-06-18", "osNumber": "OS-8001", "item": "Armação Oakley + Lentes Anti-blue", "value": 950.00, "status": "Aguardando Laboratório", "shop_id": "loja-1"}]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-1'
),
(
  'pat-teste-2', 
  '(TESTE) Roberto Carlos Souza', 
  '222.333.444-55', 
  '22.333.444-5', 
  '1970-07-20', 
  'Masculino', 
  '(98) 98777-2222', 
  '(98) 98777-2222', 
  'robertocarlos@teste.com', 
  'Av. Litorânea, 50, Calhau - São Luís/MA', 
  false, 
  '{}'::jsonb, 
  '[{"id": "a-t2", "type": "administrative", "text": "Paciente inadimplente - OS retida", "color": "#ef4444"}]'::jsonb, 
  'Acompanhamento de presbiopia e histórico familiar de glaucoma.', 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[{"id": "pur-t2", "date": "2026-06-15", "osNumber": "OS-8002", "item": "Lentes Varilux Physio + Armação Ray-Ban", "value": 2450.00, "status": "Aguardando Pagamento", "shop_id": "loja-1"}]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-1'
),
(
  'pat-teste-3', 
  '(TESTE) Mariana Santos Lima', 
  '333.444.555-66', 
  '33.444.555-6', 
  '2018-05-12', 
  'Feminino', 
  '(98) 98666-3333', 
  '(98) 98666-3333', 
  'mae.mariana@teste.com', 
  'Rua do Giz, 30, Centro - São Luís/MA', 
  true, 
  '{"name": "Luciana Santos (Mãe)", "cpf": "123.987.456-55", "phone": "(98) 98666-3333"}'::jsonb, 
  '[]'::jsonb, 
  'Acompanhamento de miopia progressiva infantil.', 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-2'
),
(
  'pat-teste-4', 
  '(TESTE) João Pedro Oliveira', 
  '444.555.666-77', 
  '44.555.666-7', 
  '1988-12-05', 
  'Masculino', 
  '(98) 98555-4444', 
  '(98) 98555-4444', 
  'joaopedro@teste.com', 
  'Av. dos Holandeses, 12, Ponta do Farol - São Luís/MA', 
  false, 
  '{}'::jsonb, 
  '[]'::jsonb, 
  'Usuário de lentes de contato gelatinosas.', 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-1'
),
(
  'pat-teste-5', 
  '(TESTE) Francisca Ferreira Melo', 
  '555.666.777-88', 
  '55.666.777-8', 
  '1962-10-18', 
  'Feminino', 
  '(98) 98444-5555', 
  '(98) 98444-5555', 
  'francisca@teste.com', 
  'Rua das Flores, 8, Renascença - São Luís/MA', 
  false, 
  '{}'::jsonb, 
  '[{"id": "a-t3", "type": "clinical", "text": "Suspeita de glaucoma - Retorno urgente", "color": "#ef4444"}]'::jsonb, 
  'Histórico familiar de glaucoma severo e pressão ocular alta.', 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-2'
),
(
  'pat-teste-6', 
  '(TESTE) Antônio Marcos Barbosa', 
  '666.777.888-99', 
  '66.777.888-9', 
  '1990-04-25', 
  'Masculino', 
  '(98) 98333-6666', 
  '(98) 98333-6666', 
  'antoniomarcos@teste.com', 
  'Av. Jerônimo de Albuquerque, 100, Vinhais - São Luís/MA', 
  false, 
  '{}'::jsonb, 
  '[]'::jsonb, 
  'Fez cirurgia refrativa em 2024. Exames de rotina ok.', 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-1'
),
(
  'pat-teste-7', 
  '(TESTE) Juliana Teixeira', 
  '777.888.999-00', 
  '77.888.999-0', 
  '2001-09-02', 
  'Feminino', 
  '(98) 98222-7777', 
  '(98) 98222-7777', 
  'juliana@teste.com', 
  'Rua do Alecrim, 4, Turu - São Luís/MA', 
  false, 
  '{}'::jsonb, 
  '[]'::jsonb, 
  'Paciente queixa-se de fotofobia acentuada no ambiente de trabalho.', 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-2'
),
(
  'pat-teste-8', 
  '(TESTE) Bruno Alencar Guedes', 
  '888.999.000-11', 
  '88.999.000-1', 
  '1984-11-30', 
  'Masculino', 
  '(98) 98111-8888', 
  '(98) 98111-8888', 
  'brunoalencar@teste.com', 
  'Rua 4, Cohab - São Luís/MA', 
  false, 
  '{}'::jsonb, 
  '[]'::jsonb, 
  'Paciente necessita lentes de alto índice de refração (alto grau de miopia).', 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-1'
),
(
  'pat-teste-9', 
  '(TESTE) Patrícia Albuquerque', 
  '999.000.111-22', 
  '99.000.111-2', 
  '1979-01-14', 
  'Feminino', 
  '(98) 98000-9999', 
  '(98) 98000-9999', 
  'patricia@teste.com', 
  'Av. Daniel de La Touche, 300, Cohama - São Luís/MA', 
  false, 
  '{}'::jsonb, 
  '[]'::jsonb, 
  'Usuária de óculos multifocais há 3 anos.', 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-2'
),
(
  'pat-teste-10', 
  '(TESTE) Carlos Augusto Pinto', 
  '123.321.456-78', 
  '12.321.456-7', 
  '1993-06-05', 
  'Masculino', 
  '(98) 99111-0000', 
  '(98) 99111-0000', 
  'carlosaugusto@teste.com', 
  'Rua Grande, 500, Centro - São Luís/MA', 
  false, 
  '{}'::jsonb, 
  '[]'::jsonb, 
  'Paciente esportista. Deseja óculos com lentes especiais anti-impacto.', 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  '[]'::jsonb, 
  'loja-1'
);

-- 3. INSERIR AGENDAMENTOS DE TESTE (Hoje, com horários e status variados)
-- Nota: substitui dinamicamente pelo dia atual na consulta
INSERT INTO appointments (
  id, patient_id, patient_name, professional_id, room_id, service_id, payment_type, date, time, duration, status, notes, is_encaixe, shop_id
) VALUES 
(
  'app-teste-1', 
  'pat-teste-1', 
  '(TESTE) Ana Clara Silva', 
  '1', -- Dr. Roberto Mendes
  'sala-1', 
  'consulta', 
  'particular', 
  CURRENT_DATE, 
  '08:30', 
  30, 
  'confirmado', 
  'Paciente relata cansaço visual ao fim do dia.', 
  false, 
  'loja-1'
),
(
  'app-teste-2', 
  'pat-teste-2', 
  '(TESTE) Roberto Carlos Souza', 
  '1', 
  'sala-1', 
  'consulta', 
  'convenio', 
  CURRENT_DATE, 
  '09:00', 
  30, 
  'confirmado', 
  'Exame de refração de rotina periódica.', 
  false, 
  'loja-1'
),
(
  'app-teste-3', 
  'pat-teste-3', 
  '(TESTE) Mariana Santos Lima', 
  '2', -- Dra. Sandra Regina
  'sala-2', 
  'exame', 
  'particular', 
  CURRENT_DATE, 
  '10:15', 
  45, 
  'confirmado', 
  'Paciente infantil. Necessita acompanhamento lúdico.', 
  true, -- Encaixe de 15 minutos
  'loja-2'
),
(
  'app-teste-4', 
  'pat-teste-4', 
  '(TESTE) João Pedro Oliveira', 
  '2', 
  'sala-2', 
  'adaptacao', 
  'convenio', 
  CURRENT_DATE, 
  '14:00', 
  60, 
  'atendido', -- Finalizado
  'Adaptação de lentes rígidas esclerais.', 
  false, 
  'loja-1'
),
(
  'app-teste-5', 
  'pat-teste-5', 
  '(TESTE) Francisca Ferreira Melo', 
  '3', -- Dr. Lucas Viana
  'sala-3', 
  'exame', 
  'convenio', 
  CURRENT_DATE, 
  '15:30', 
  45, 
  'falta', -- Registrado falta
  'Tonometria urgente e mapeamento de retina.', 
  false, 
  'loja-2'
);

-- 4. INSERIR FILA DE ESPERA DE TESTE
INSERT INTO waitlist (
  id, patient_name, phone, preferred_doctor, service, date_added, shop_id
) VALUES 
(
  'wait-teste-1', 
  '(TESTE) Bruno Alencar Guedes', 
  '(98) 98111-8888', 
  'Dr. Roberto Mendes', 
  'Consulta Geral', 
  CURRENT_DATE, 
  'loja-1'
),
(
  'wait-teste-2', 
  '(TESTE) Patrícia Albuquerque', 
  '(98) 98000-9999', 
  'Dra. Sandra Regina', 
  'Adaptação de Lentes', 
  CURRENT_DATE, 
  'loja-2'
);
