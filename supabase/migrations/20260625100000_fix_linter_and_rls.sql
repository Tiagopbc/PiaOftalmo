-- Migração de Correção: Resolve avisos do linter do Supabase e RLS
-- 1. Políticas RLS para tabelas que estavam sem políticas definidas
-- 2. Revogação de acesso indevido (anon) às funções SECURITY DEFINER

-- Políticas RLS para profiles
DROP POLICY IF EXISTS "Usuários leem o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários leem o próprio perfil" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Políticas RLS para shops
DROP POLICY IF EXISTS "Usuários veem as lojas permitidas" ON public.shops;
CREATE POLICY "Usuários veem as lojas permitidas" ON public.shops
FOR SELECT USING (
  -- Permite se for admin OU se tiver o shop vinculado em user_shop_access
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR 
  EXISTS (SELECT 1 FROM public.user_shop_access WHERE profile_id = auth.uid() AND shop_id = public.shops.id)
);

-- Políticas RLS para user_shop_access
DROP POLICY IF EXISTS "Usuários leem os próprios acessos de loja" ON public.user_shop_access;
CREATE POLICY "Usuários leem os próprios acessos de loja" ON public.user_shop_access
FOR SELECT USING (
  profile_id = auth.uid() 
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Segurança das Funções (Linter Warnings 0028 & 0029)
-- Retira de PUBLIC para que "anon" não possa executar as funções
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.resolve_shop_id(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_shop_id(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_shop_id(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_shop_access(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_shop_access(UUID) FROM anon;
-- Garantimos que o "authenticated" tenha execute para as políticas RLS avaliadas
GRANT EXECUTE ON FUNCTION public.user_has_shop_access(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_shop_access(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_shop_access(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_shop_access(TEXT) TO authenticated;
