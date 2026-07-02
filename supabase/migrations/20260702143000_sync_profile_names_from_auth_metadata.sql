-- Sincroniza nomes de exibição salvos anteriormente no Auth metadata
-- com a tabela pública profiles, que é usada pelas telas administrativas
-- e pelas consultas de profissionais ativos.

UPDATE public.profiles AS profile
SET full_name = BTRIM(auth_user.raw_user_meta_data->>'name')
FROM auth.users AS auth_user
WHERE profile.id = auth_user.id
  AND NULLIF(BTRIM(auth_user.raw_user_meta_data->>'name'), '') IS NOT NULL
  AND profile.full_name IS DISTINCT FROM BTRIM(auth_user.raw_user_meta_data->>'name');
