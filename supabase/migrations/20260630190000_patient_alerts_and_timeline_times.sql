-- ============================================================================
-- Alertas ativos no perfil do paciente e timestamps completos na timeline
-- ============================================================================
-- A linha do tempo já usa TIMESTAMPTZ. Esta migration adiciona o armazenamento
-- dos alertas ativos diretamente no paciente, para que alertas clínicos apareçam
-- no topo da ficha sem depender de dados mockados/legados.

alter table public.patients
  add column if not exists alerts jsonb not null default '[]'::jsonb;

update public.patients
set alerts = '[]'::jsonb
where alerts is null;
