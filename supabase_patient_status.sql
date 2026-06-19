-- Adiciona inativação lógica aos pacientes sem apagar o histórico clínico.
-- Execute no SQL Editor do Supabase antes de usar o recurso com contas reais.

ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.patients
SET is_active = true
WHERE is_active IS NULL;

COMMENT ON COLUMN public.patients.is_active IS
'Controla se o paciente está disponível para novos atendimentos sem apagar seu histórico.';
