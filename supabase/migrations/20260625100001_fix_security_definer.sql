-- Atualiza a função user_has_shop_access para SECURITY INVOKER
-- Isso é possível agora porque adicionamos RLS policies para profiles e user_shop_access,
-- permitindo que os próprios usuários (SECURITY INVOKER) tenham permissão de leitura
-- em seus próprios registros e avaliem essa função com segurança, sem alertar o linter.

CREATE OR REPLACE FUNCTION public.resolve_shop_id(raw_shop_id TEXT)
RETURNS UUID AS $$
DECLARE
    resolved_shop_id UUID;
BEGIN
    IF raw_shop_id IS NULL OR btrim(raw_shop_id) = '' OR raw_shop_id = 'all' THEN
        RETURN NULL;
    END IF;

    BEGIN
        RETURN raw_shop_id::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        NULL;
    END;

    SELECT id
    INTO resolved_shop_id
    FROM public.shops
    WHERE legacy_code = raw_shop_id
    LIMIT 1;

    RETURN resolved_shop_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '';

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

CREATE OR REPLACE FUNCTION public.user_has_shop_access(check_shop_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    resolved_shop_id UUID;
BEGIN
    -- Super admins (role='admin') ignoram a trava de filial
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN
        RETURN TRUE;
    END IF;

    resolved_shop_id := public.resolve_shop_id(check_shop_id);

    IF resolved_shop_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM public.user_shop_access 
        WHERE profile_id = auth.uid() AND shop_id = resolved_shop_id
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';
