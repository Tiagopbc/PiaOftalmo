-- =====================================================================
-- MIGRAÇÃO FASE 1: SEGURANÇA, AUDITORIA E MULTI-TENANCY
-- =====================================================================

-- 1. CRIAÇÃO DAS TABELAS MULTI-TENANCY E DE ACESSO

CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_code TEXT UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'vendedor',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.user_shop_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(profile_id, shop_id)
);

-- Compatibilidade com dados antigos que usavam shop_id textual
-- como "loja-1" e "loja-2". O banco novo usa UUID em public.shops.id.
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS legacy_code TEXT UNIQUE;

INSERT INTO public.shops (legacy_code, name, is_active)
VALUES
    ('loja-1', 'Filial 1 - Centro', true),
    ('loja-2', 'Filial 2 - Shopping', true)
ON CONFLICT (legacy_code) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- 2. CRIAÇÃO DA TABELA DE AUDITORIA

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    performed_by UUID, -- Pode ser nulo se feito pelo sistema
    shop_id UUID REFERENCES public.shops(id), -- Opcional, para filtro por filial
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Revoga deleção e atualização na tabela de auditoria
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, public;

-- 3. FUNÇÃO TRIGGER PARA AUDITORIA AUTOMÁTICA

CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    v_shop_id UUID;
BEGIN
    -- Tenta capturar o ID do usuário da sessão do Supabase Auth
    current_user_id := auth.uid();
    
    -- Tenta capturar o shop_id se a tabela possuir essa coluna
    BEGIN
        v_shop_id := public.resolve_shop_id((NEW.shop_id)::TEXT);
    EXCEPTION WHEN OTHERS THEN
        v_shop_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, performed_by)
        VALUES (TG_TABLE_NAME, OLD.id::VARCHAR, TG_OP, row_to_json(OLD)::JSONB, current_user_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by, shop_id)
        VALUES (TG_TABLE_NAME, NEW.id::VARCHAR, TG_OP, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB, current_user_id, v_shop_id);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, performed_by, shop_id)
        VALUES (TG_TABLE_NAME, NEW.id::VARCHAR, TG_OP, row_to_json(NEW)::JSONB, current_user_id, v_shop_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. APLICAÇÃO DO TRIGGER NAS TABELAS EXISTENTES
-- Assumimos que patients, appointments e waitlist já existem conforme o seed.

DROP TRIGGER IF EXISTS trg_audit_patients ON public.patients;
CREATE TRIGGER trg_audit_patients
AFTER INSERT OR UPDATE OR DELETE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_appointments ON public.appointments;
CREATE TRIGGER trg_audit_appointments
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_waitlist ON public.waitlist;
CREATE TRIGGER trg_audit_waitlist
AFTER INSERT OR UPDATE OR DELETE ON public.waitlist
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 5. ROW LEVEL SECURITY (RLS)

-- Habilitar RLS
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shop_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Função Helper: Checa se o usuário logado tem acesso a um determinado shop_id
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Políticas para patients
DROP POLICY IF EXISTS "Usuários veem pacientes de suas filiais" ON public.patients;
CREATE POLICY "Usuários veem pacientes de suas filiais" ON public.patients
FOR SELECT USING (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários criam pacientes em suas filiais" ON public.patients;
CREATE POLICY "Usuários criam pacientes em suas filiais" ON public.patients
FOR INSERT WITH CHECK (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários atualizam pacientes de suas filiais" ON public.patients;
CREATE POLICY "Usuários atualizam pacientes de suas filiais" ON public.patients
FOR UPDATE USING (public.user_has_shop_access(shop_id::TEXT));

-- Políticas para appointments
DROP POLICY IF EXISTS "Usuários veem agendamentos de suas filiais" ON public.appointments;
CREATE POLICY "Usuários veem agendamentos de suas filiais" ON public.appointments
FOR SELECT USING (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários criam agendamentos em suas filiais" ON public.appointments;
CREATE POLICY "Usuários criam agendamentos em suas filiais" ON public.appointments
FOR INSERT WITH CHECK (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários atualizam agendamentos de suas filiais" ON public.appointments;
CREATE POLICY "Usuários atualizam agendamentos de suas filiais" ON public.appointments
FOR UPDATE USING (public.user_has_shop_access(shop_id::TEXT));

-- Políticas para waitlist
DROP POLICY IF EXISTS "Usuários veem fila de suas filiais" ON public.waitlist;
CREATE POLICY "Usuários veem fila de suas filiais" ON public.waitlist
FOR SELECT USING (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários gerenciam fila em suas filiais" ON public.waitlist;
CREATE POLICY "Usuários gerenciam fila em suas filiais" ON public.waitlist
FOR ALL USING (public.user_has_shop_access(shop_id::TEXT));

-- Políticas para audit_logs
DROP POLICY IF EXISTS "Admins leem todos logs, gerentes leem de sua filial" ON public.audit_logs;
CREATE POLICY "Admins leem todos logs, gerentes leem de sua filial" ON public.audit_logs
FOR SELECT USING (public.user_has_shop_access(shop_id));

-- Ninguém altera ou deleta logs
-- (Isso já foi garantido pelo comando REVOKE acima, mas o RLS reforça).
