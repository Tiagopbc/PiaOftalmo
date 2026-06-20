-- Corrige políticas RLS que usavam user_metadata para autorização.
-- app_metadata é mantido pelo servidor e não pode ser alterado pelo usuário final.

DO $$
DECLARE
  policy_record record;
  alter_statement text;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ILIKE '%user_metadata%'
        OR COALESCE(with_check, '') ILIKE '%user_metadata%'
      )
  LOOP
    alter_statement := format(
      'ALTER POLICY %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );

    IF policy_record.qual IS NOT NULL THEN
      alter_statement := alter_statement || format(
        ' USING (%s)',
        replace(policy_record.qual, 'user_metadata', 'app_metadata')
      );
    END IF;

    IF policy_record.with_check IS NOT NULL THEN
      alter_statement := alter_statement || format(
        ' WITH CHECK (%s)',
        replace(policy_record.with_check, 'user_metadata', 'app_metadata')
      );
    END IF;

    EXECUTE alter_statement;
    RAISE NOTICE 'Política corrigida: %.%.%',
      policy_record.schemaname,
      policy_record.tablename,
      policy_record.policyname;
  END LOOP;
END
$$;

-- A migração deve terminar sem nenhuma política pública usando user_metadata.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ILIKE '%user_metadata%'
        OR COALESCE(with_check, '') ILIKE '%user_metadata%'
      )
  ) THEN
    RAISE EXCEPTION 'Ainda existem políticas RLS usando user_metadata.';
  END IF;
END
$$;
