-- Execute uma única vez no SQL Editor do Supabase.
-- Substitua o e-mail abaixo pelo e-mail da conta administradora inicial.
-- A função admin-users confia somente em app_metadata, que não pode ser
-- alterado pelo próprio usuário no navegador.

UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'role', 'admin',
    'shop_id', 'all',
    'is_active', true
  )
WHERE email = 'SEU_EMAIL_ADMIN@DOMINIO.COM';

-- Confirme o resultado antes de implantar a função.
SELECT
  id,
  email,
  raw_app_meta_data ->> 'role' AS role,
  raw_app_meta_data ->> 'shop_id' AS shop_id,
  raw_app_meta_data ->> 'is_active' AS is_active
FROM auth.users
ORDER BY created_at;
