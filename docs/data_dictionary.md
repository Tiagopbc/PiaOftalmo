# Dicionário de Dados Inicial

Este dicionário mapeia as tabelas e relacionamentos necessários para a consolidação da Fase 3. Todos os registros operacionais são sensíveis à filial (`shop_id`).

## Estrutura Base (Multi-Tenancy)
- `shops`: Cadastros de filiais.
- `profiles`: Metadados estendidos do Supabase Auth, contendo nome completo, CPF, `role` (papel).
- `user_shop_access`: Tabela relacional que vincula um `profile_id` a um ou mais `shop_id`.

## Clínico
- `patients`: Dados demográficos (Nome, CPF, RG, Nascimento, Contato, Endereço).
- `patient_alerts`: Alertas médicos ou administrativos não impeditivos.
- `patient_timeline_events`: Ocorrências globais do prontuário do paciente (criado de forma imutável).
- `clinical_encounters`: Atendimentos médicos contendo anamnese, acuidade visual, refração e tonometria.
- `prescriptions`: Receita gerada após o atendimento. Contém dados de longe/perto e validade.
- `exams`: Exames complementares.
- `documents`: Metadados de arquivos vinculados ao paciente armazenados no Supabase Storage.

## Atendimento & Recepção
- `appointments`: Agendamentos contendo data, horário, médico, sala, tipo de consulta e `status`.

## Comercial (Venda & Produção)
- `quotes`: Orçamentos salvos e não aprovados.
- `sales`: A venda fechada. Uma venda SEMPRE deve existir para que haja faturamento. Uma venda isolada de armação afeta a `sales` e o estoque, mas não a OS.
- `sale_items`: Itens que compõem a venda (armações, lentes, serviços).
- `optical_orders`: Ordem de Serviço (OS). Entidade laboratorial. Só é gerada se a venda incluir lentes ou serviços de montagem/laboratório.
- `optical_order_status_history`: Rastreio de movimentação da OS.
- `laboratories`: Cadastros de laboratórios parceiros.

## Financeiro & Estoque
- `payments`: Transações financeiras reais (dinheiro, cartão, pix). Podem existir múltiplos `payments` parciais para uma única `sale`.
- `products`: Catálogo de lentes, tratamentos, armações e acessórios.
- `inventory_movements`: Entradas, saídas e ajustes de saldo.
- `cash_sessions`: Abertura e fechamento de caixa por filial.
- `accounts_payable`: Contas a pagar da clínica (água, luz, laboratório).

## Auditoria
- `audit_logs`: Tabela _insert-only_ obrigatória para registro de mudanças sensíveis. Campos essenciais: `table_name`, `record_id`, `action`, `old_data`, `new_data`, `performed_by`, `timestamp`, `shop_id`.
