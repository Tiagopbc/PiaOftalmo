-- Migration para criar automaticamente o profile quando um usuário for registrado

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

-- Cria os profiles retroativamente para quem já se cadastrou e não tinha
INSERT INTO public.profiles (id, full_name, role, is_active)
SELECT id, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), 'recepcao', true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
