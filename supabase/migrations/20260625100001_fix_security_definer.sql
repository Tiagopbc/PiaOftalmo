-- Atualiza a função user_has_shop_access para SECURITY INVOKER
-- Isso é possível agora porque adicionamos RLS policies para profiles e user_shop_access,
-- permitindo que os próprios usuários (SECURITY INVOKER) tenham permissão de leitura
-- em seus próprios registros e avaliem essa função com segurança, sem alertar o linter.

CREATE OR REPLACE FUNCTION public.user_has_shop_access(check_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins (role='admin') ignoram a trava de filial
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM public.user_shop_access 
        WHERE profile_id = auth.uid() AND shop_id = check_shop_id
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';
