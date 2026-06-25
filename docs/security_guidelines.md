# Diretrizes de Segurança e Acessos

Este documento estabelece as regras de governança para criação, manutenção e revogação de acessos na plataforma PIA Oftalmo.

## 1. Regra de Menor Privilégio
Nenhum usuário deve ter o papel de `admin` se as suas funções do dia a dia não demandarem isso. 
- **Vendedor**: Acesso apenas aos pacientes, vendas, pagamentos e orçamentos da sua própria loja.
- **Médico**: Acesso restrito ao Prontuário Eletrônico, Prescrições e Anamneses da sua própria loja.
- **Recepção**: Acesso a Agenda, Fila de Espera, Cadastro básico de Pacientes e Recebimentos simples.
- **Admin**: Acesso irrestrito a configurações, todas as lojas, relatórios financeiros e deleções lógicas.

## 2. Abertura e Manutenção de Perfis
Toda conta criada (no painel Supabase Auth) terá seu perfil atrelado na tabela `public.profiles`.
- A matriz de permissão que o banco de dados confia (via RLS) reside na tabela `profiles.role` e no `app_metadata` da conta do Auth.
- Para vincular um usuário a uma ou mais filiais (lojas), ele deve ser inserido na tabela `user_shop_access`. Um vendedor sem loja atrelada **não verá nenhum dado no sistema**.

## 3. Revisão Periódica e Desligamento
Quando um funcionário for desligado da clínica:
1. O administrador **NÃO DEVE** apagar a conta dele do sistema. (Isso corromperia o log de autoria de receitas, vendas e recibos).
2. O procedimento correto é marcar o usuário como **Inativo** (alterar `is_active = false` na tabela `profiles`).
3. Bloquear o acesso de login diretamente no Supabase Auth (Suspend User).

É recomendada uma revisão a cada 3 meses da lista de usuários ativos para confirmar que todos ainda fazem parte do quadro de funcionários.

## 4. Rastreabilidade (Auditoria)
Qualquer alteração em Prontuário e Agendamento está sendo gravada silenciosamente e de forma automática na tabela `audit_logs`.
- Os atendentes não podem visualizar ou apagar essa tabela.
- Administradores devem usar essa tabela caso haja denúncia de vazamento de dados de pacientes ou modificação indevida de orçamentos e financeiro.
