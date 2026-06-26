-- ==========================================
-- SCRIPT DE PREPARAÇÃO DE PRODUÇÃO (PIA Oftalmo) - CORRIGIDO
-- Este script limpa dados residuais, cria a loja inicial,
-- cria os gatilhos de segurança e transforma seu usuário em Administrador.
-- ==========================================

-- 1. Cria a função e o gatilho (Trigger) para criar automaticamente 
-- um "Perfil" sempre que alguém se cadastrar no sistema.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'recepcao',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Cria os perfis retroativamente (para a sua conta que acabou de ser criada)
INSERT INTO public.profiles (id, full_name, role, is_active)
SELECT id, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), 'recepcao', true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 3. Inserir a Matriz (Loja Oficial)
INSERT INTO public.shops (id, name, is_active) 
VALUES (gen_random_uuid(), 'Matriz PIA Oftalmo', true)
ON CONFLICT DO NOTHING;

-- 4. Promover o PRIMEIRO usuário a Administrador (no caso, você)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1);

-- 5. Associar o administrador recém-criado à Matriz
INSERT INTO public.user_shop_access (profile_id, shop_id)
SELECT p.id, s.id 
FROM public.profiles p
CROSS JOIN public.shops s
WHERE p.role = 'admin'
ON CONFLICT (profile_id, shop_id) DO NOTHING;

-- 6. Garantir que as regras de segurança (RLS) estão ativas
ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
