# Revisão de Migrations Sensíveis — 2026-06-26

## Objetivo

Reduzir o risco de perda de dados e quebra de acesso antes de aplicar as migrations novas no Supabase de produção.

## Decisão principal

A migration da Fase 3 não deve apagar fisicamente os campos legados de `public.patients` nesta etapa.

Os campos abaixo continuam preservados até a aplicação estar validada usando somente as tabelas relacionais:

- `timeline`
- `prescriptions`
- `purchases`
- `payments`

## Correções aplicadas localmente

### Fase 1 — Segurança, auditoria e multi-filial

- Adicionado `shops.legacy_code` para mapear identificadores antigos como `loja-1` e `loja-2`.
- Criada função `public.resolve_shop_id(text)` para converter:
  - UUID válido;
  - códigos legados (`loja-1`, `loja-2`);
  - valores inválidos para `NULL`.
- Criada sobrecarga `public.user_has_shop_access(text)`.
- Removido uso direto de `shop_id::UUID` nas policies de tabelas legadas (`patients`, `appointments`, `waitlist`).
- Auditoria passa a resolver `shop_id` com `public.resolve_shop_id(...)`.

### Fase 3 — Modelo relacional

- Criada tabela `patient_legacy_payloads` para arquivar os JSONs antigos.
- Adicionados `legacy_source_id` em:
  - `patient_timeline_events`;
  - `prescriptions`.
- Migração de timeline/receitas agora é idempotente e evita duplicação.
- Removido o `DROP COLUMN` dos campos legados de `patients`.
- Adicionado RLS em `patient_legacy_payloads`, com leitura somente para `admin`.

### Fase 7 — Storage/LGPD

- Corrigido role inexistente `doctor` para `medico`.
- Policy de download do bucket `patient-documents` agora confere:
  - vínculo de filial;
  - confidencialidade do anexo;
  - role `admin`/`medico` para anexos sigilosos.
- Adicionada policy de exclusão no Storage usando as mesmas regras de acesso.

## Riscos ainda existentes

1. A Edge Function `admin-users` ainda usa `shop_id` textual (`loja-1`, `loja-2`) em `app_metadata`. Como o app agora confia em `profiles` + `user_shop_access`, a gestão de equipe deve ser revisada para sincronizar essas tabelas.
2. A migração automática de `purchases` antigos para `sales`/`sale_items`/`optical_orders` ainda não foi implementada. Os dados ficam preservados, mas a leitura final precisa de etapa própria.
3. Antes de produção, é obrigatório comparar quais migrations já foram aplicadas no Supabase remoto. Se alguma dessas migrations já tiver sido aplicada, não editar histórico aplicado: criar migration corretiva nova.

## Checklist antes de produção

1. Fazer backup do banco remoto.
2. Confirmar lista de migrations aplicadas no Supabase.
3. Rodar migrations em ambiente de teste/staging ou projeto Supabase duplicado.
4. Conferir contagens:
   - total de pacientes;
   - total de eventos legados;
   - total de eventos migrados;
   - total de receitas legadas;
   - total de receitas migradas.
5. Testar acesso por usuário:
   - admin;
   - recepção;
   - médico;
   - vendedor.
6. Testar isolamento por filial.
7. Testar anexos sigilosos com recepção, médico e admin.
8. Só depois aplicar em produção.
