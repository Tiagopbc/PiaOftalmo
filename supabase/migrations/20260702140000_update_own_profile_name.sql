-- Permite que o próprio usuário atualize apenas o nome de exibição do perfil.
-- Mantém role, filial e status protegidos pelo fluxo administrativo.

CREATE OR REPLACE FUNCTION public.update_own_profile_name(new_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_name text := NULLIF(BTRIM(new_full_name), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF clean_name IS NULL THEN
    RAISE EXCEPTION 'Nome de perfil obrigatório.';
  END IF;

  UPDATE public.profiles
  SET full_name = clean_name
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_own_profile_name(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_own_profile_name(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_own_profile_name(text) TO authenticated;
