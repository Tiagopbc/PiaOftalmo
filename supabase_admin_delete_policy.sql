-- Proteção adicional no banco: somente administradores podem excluir pacientes.
-- Execute este arquivo no SQL Editor do Supabase.
--
-- IMPORTANTE: a autorização usa app_metadata, que o usuário não pode alterar
-- pela API pública. Defina { "role": "admin" } no app_metadata da conta
-- administradora pelo painel do Supabase ou por uma rotina segura no servidor.
-- Exemplo para executar uma única vez, substituindo o e-mail:
-- UPDATE auth.users
-- SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
--   || '{"role":"admin"}'::jsonb
-- WHERE email = 'SEU_EMAIL_ADMIN@DOMINIO.COM';

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Somente administradores excluem pacientes" ON public.patients;

CREATE POLICY "Somente administradores excluem pacientes"
ON public.patients
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);

-- Conferência opcional das políticas que também afetam DELETE.
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'patients';
