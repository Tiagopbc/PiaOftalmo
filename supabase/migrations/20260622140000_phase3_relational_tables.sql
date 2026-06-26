-- =====================================================================
-- MIGRAÇÃO FASE 3: ESTRUTURA RELACIONAL (QUEBRA DE JSONB)
-- =====================================================================

-- 1. Criação da Tabela de Eventos do Paciente (Timeline)
CREATE TABLE IF NOT EXISTS public.patient_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'alert', 'system', 'clinical'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    legacy_source_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criação da Tabela de Receituários (Prescriptions)
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    validity_date DATE,
    glasses_type VARCHAR(100),
    lens_type VARCHAR(100),
    od_sph VARCHAR(20),
    od_cyl VARCHAR(20),
    od_axis VARCHAR(20),
    os_sph VARCHAR(20),
    os_cyl VARCHAR(20),
    os_axis VARCHAR(20),
    addition VARCHAR(20),
    notes TEXT,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    legacy_source_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Criação da Tabela de Vendas (Sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, aprovado, cancelado
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    notes TEXT,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Criação da Tabela de Itens de Venda (Sale Items)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- frame, lens, service
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) DEFAULT 0.00,
    total_price DECIMAL(10, 2) DEFAULT 0.00,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Criação da Tabela de Pagamentos (Payments)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- pix, debito, credito, dinheiro
    status VARCHAR(50) DEFAULT 'concluido',
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Criação da Tabela de Ordens de Serviço (Optical Orders)
CREATE TABLE IF NOT EXISTS public.optical_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'producao', -- producao, pronto, entregue
    laboratory VARCHAR(255),
    expected_delivery_date DATE,
    notes TEXT,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6.1. Arquivo de segurança para os payloads antigos em JSONB.
-- Mesmo após migrar para tabelas relacionais, os campos originais ficam preservados
-- aqui e também continuam em public.patients durante a fase de estabilização.
CREATE TABLE IF NOT EXISTS public.patient_legacy_payloads (
    patient_id TEXT PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
    timeline JSONB,
    prescriptions JSONB,
    purchases JSONB,
    payments JSONB,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.patient_timeline_events
    ADD COLUMN IF NOT EXISTS legacy_source_id TEXT;

ALTER TABLE public.prescriptions
    ADD COLUMN IF NOT EXISTS legacy_source_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS patient_timeline_events_legacy_source_uid
    ON public.patient_timeline_events (patient_id, legacy_source_id)
    WHERE legacy_source_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS prescriptions_legacy_source_uid
    ON public.prescriptions (patient_id, legacy_source_id)
    WHERE legacy_source_id IS NOT NULL;

-- 7. Migração de Dados Existentes (JSONB para Relacional)
DO $$
DECLARE
    has_timeline BOOLEAN;
    has_prescriptions BOOLEAN;
    has_purchases BOOLEAN;
    has_payments BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'timeline'
    ) INTO has_timeline;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'prescriptions'
    ) INTO has_prescriptions;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'purchases'
    ) INTO has_purchases;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'payments'
    ) INTO has_payments;

    IF has_timeline OR has_prescriptions OR has_purchases OR has_payments THEN
        EXECUTE format(
            'INSERT INTO public.patient_legacy_payloads (patient_id, timeline, prescriptions, purchases, payments)
             SELECT id, %s, %s, %s, %s
             FROM public.patients
             ON CONFLICT (patient_id) DO UPDATE SET
                timeline = EXCLUDED.timeline,
                prescriptions = EXCLUDED.prescriptions,
                purchases = EXCLUDED.purchases,
                payments = EXCLUDED.payments,
                archived_at = CURRENT_TIMESTAMP',
            CASE WHEN has_timeline THEN 'timeline' ELSE 'NULL::jsonb' END,
            CASE WHEN has_prescriptions THEN 'prescriptions' ELSE 'NULL::jsonb' END,
            CASE WHEN has_purchases THEN 'purchases' ELSE 'NULL::jsonb' END,
            CASE WHEN has_payments THEN 'payments' ELSE 'NULL::jsonb' END
        );
    END IF;
END $$;

-- Migrar Timeline de forma idempotente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'timeline'
    ) THEN
        INSERT INTO public.patient_timeline_events (
            patient_id,
            type,
            title,
            description,
            date,
            shop_id,
            legacy_source_id
        )
        SELECT
            p.id,
            COALESCE(event->>'type', 'system'),
            COALESCE(event->>'title', 'Sem título'),
            COALESCE(event->>'desc', event->>'description'),
            CASE
                WHEN COALESCE(event->>'date', '') ~ '^\d{4}-\d{2}-\d{2}' THEN (event->>'date')::timestamp with time zone
                ELSE CURRENT_TIMESTAMP
            END,
            public.resolve_shop_id((p.shop_id)::TEXT),
            COALESCE(event->>'id', md5(event::TEXT))
        FROM public.patients p
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(p.timeline) = 'array' THEN p.timeline ELSE '[]'::jsonb END
        ) AS event
        WHERE p.timeline IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.patient_timeline_events existing
              WHERE existing.patient_id = p.id
                AND existing.legacy_source_id = COALESCE(event->>'id', md5(event::TEXT))
          );
    END IF;
END $$;

-- Migrar Prescriptions de forma idempotente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'prescriptions'
    ) THEN
        INSERT INTO public.prescriptions (
            patient_id,
            date,
            glasses_type,
            lens_type,
            od_sph,
            od_cyl,
            od_axis,
            os_sph,
            os_cyl,
            os_axis,
            addition,
            notes,
            shop_id,
            legacy_source_id
        )
        SELECT
            p.id,
            CASE
                WHEN COALESCE(rx->>'date', '') ~ '^\d{4}-\d{2}-\d{2}' THEN (rx->>'date')::date
                ELSE CURRENT_DATE
            END,
            rx->>'glassesType',
            rx->>'lensType',
            COALESCE(rx->'longe'->'od'->>'esferico', rx->'od'->>'esferico'),
            COALESCE(rx->'longe'->'od'->>'cilindrico', rx->'od'->>'cilindrico'),
            COALESCE(rx->'longe'->'od'->>'eixo', rx->'od'->>'eixo'),
            COALESCE(rx->'longe'->'oe'->>'esferico', rx->'oe'->>'esferico'),
            COALESCE(rx->'longe'->'oe'->>'cilindrico', rx->'oe'->>'cilindrico'),
            COALESCE(rx->'longe'->'oe'->>'eixo', rx->'oe'->>'eixo'),
            COALESCE(rx->>'adicao', rx->'od'->>'adicao', rx->'oe'->>'adicao'),
            rx->>'notes',
            public.resolve_shop_id((p.shop_id)::TEXT),
            COALESCE(rx->>'id', md5(rx::TEXT))
        FROM public.patients p
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(p.prescriptions) = 'array' THEN p.prescriptions ELSE '[]'::jsonb END
        ) AS rx
        WHERE p.prescriptions IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.prescriptions existing
              WHERE existing.patient_id = p.id
                AND existing.legacy_source_id = COALESCE(rx->>'id', md5(rx::TEXT))
          );
    END IF;
END $$;

-- IMPORTANTE:
-- Não removemos mais timeline, prescriptions, purchases ou payments de public.patients
-- nesta fase. A aplicação ainda está em transição e esses campos funcionam como
-- rollback/dupla leitura até a validação completa em produção.
-- A remoção física deve acontecer somente em uma migration futura, depois de:
-- 1) backup validado;
-- 2) contagem de registros migrados conferida;
-- 3) versão do frontend usando apenas as tabelas relacionais publicada;
-- 4) janela de reversão encerrada.

-- 8. RLS E POLÍTICAS DE SEGURANÇA

ALTER TABLE public.patient_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optical_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_legacy_payloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins leem payloads legados" ON public.patient_legacy_payloads;
CREATE POLICY "Admins leem payloads legados" ON public.patient_legacy_payloads
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- patient_timeline_events
DROP POLICY IF EXISTS "Acesso Timeline da filial" ON public.patient_timeline_events;
CREATE POLICY "Acesso Timeline da filial" ON public.patient_timeline_events
    FOR ALL USING (public.user_has_shop_access(shop_id));

-- prescriptions
DROP POLICY IF EXISTS "Acesso Prescriptions da filial" ON public.prescriptions;
CREATE POLICY "Acesso Prescriptions da filial" ON public.prescriptions
    FOR ALL USING (public.user_has_shop_access(shop_id));

-- sales
DROP POLICY IF EXISTS "Acesso Sales da filial" ON public.sales;
CREATE POLICY "Acesso Sales da filial" ON public.sales
    FOR ALL USING (public.user_has_shop_access(shop_id));

-- sale_items
DROP POLICY IF EXISTS "Acesso Sale Items da filial" ON public.sale_items;
CREATE POLICY "Acesso Sale Items da filial" ON public.sale_items
    FOR ALL USING (public.user_has_shop_access(shop_id));

-- payments
DROP POLICY IF EXISTS "Acesso Payments da filial" ON public.payments;
CREATE POLICY "Acesso Payments da filial" ON public.payments
    FOR ALL USING (public.user_has_shop_access(shop_id));

-- optical_orders
DROP POLICY IF EXISTS "Acesso Optical Orders da filial" ON public.optical_orders;
CREATE POLICY "Acesso Optical Orders da filial" ON public.optical_orders
    FOR ALL USING (public.user_has_shop_access(shop_id));

-- 9. TRIGGERS DE AUDITORIA

DROP TRIGGER IF EXISTS tr_audit_patient_timeline_events ON public.patient_timeline_events;
CREATE TRIGGER tr_audit_patient_timeline_events
    AFTER INSERT OR UPDATE OR DELETE ON public.patient_timeline_events
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_prescriptions ON public.prescriptions;
CREATE TRIGGER tr_audit_prescriptions
    AFTER INSERT OR UPDATE OR DELETE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_sales ON public.sales;
CREATE TRIGGER tr_audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_sale_items ON public.sale_items;
CREATE TRIGGER tr_audit_sale_items
    AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_payments ON public.payments;
CREATE TRIGGER tr_audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_optical_orders ON public.optical_orders;
CREATE TRIGGER tr_audit_optical_orders
    AFTER INSERT OR UPDATE OR DELETE ON public.optical_orders
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
