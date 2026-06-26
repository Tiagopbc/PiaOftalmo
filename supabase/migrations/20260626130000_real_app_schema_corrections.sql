-- ============================================================================
-- MIGRAÇÃO CORRETIVA: APP REAL, SEM DADOS FICTÍCIOS E COM COMPATIBILIDADE
-- ============================================================================
-- Contexto:
-- As migrations de Fase 1 e Fase 3 já foram aplicadas no Supabase remoto.
-- Portanto, correções de RLS, shop_id legado e preservação de dados precisam
-- entrar em uma migration nova, sem depender de reexecutar arquivos antigos.

-- 1. Compatibilidade entre filiais legadas ("loja-1", "loja-2") e UUIDs reais
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS legacy_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS shops_legacy_code_uid
  ON public.shops (legacy_code)
  WHERE legacy_code IS NOT NULL;

UPDATE public.shops
SET name = 'Filial 1 - Centro', is_active = true
WHERE legacy_code = 'loja-1';

INSERT INTO public.shops (legacy_code, name, is_active)
SELECT 'loja-1', 'Filial 1 - Centro', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.shops WHERE legacy_code = 'loja-1'
);

UPDATE public.shops
SET name = 'Filial 2 - Shopping', is_active = true
WHERE legacy_code = 'loja-2';

INSERT INTO public.shops (legacy_code, name, is_active)
SELECT 'loja-2', 'Filial 2 - Shopping', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.shops WHERE legacy_code = 'loja-2'
);

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

CREATE OR REPLACE FUNCTION public.user_has_shop_access(check_shop_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  resolved_shop_id UUID;
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN
    RETURN TRUE;
  END IF;

  resolved_shop_id := public.resolve_shop_id(check_shop_id);

  IF resolved_shop_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_shop_access
    WHERE profile_id = auth.uid()
      AND shop_id = resolved_shop_id
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

-- Mantém a versão UUID explícita para tabelas novas.
CREATE OR REPLACE FUNCTION public.user_has_shop_access(check_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_shop_access
    WHERE profile_id = auth.uid()
      AND shop_id = check_shop_id
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

-- 2. Auditoria robusta para shop_id UUID ou textual
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  v_shop_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF (TG_OP = 'DELETE') THEN
    BEGIN
      v_shop_id := public.resolve_shop_id((OLD.shop_id)::TEXT);
    EXCEPTION WHEN OTHERS THEN
      v_shop_id := NULL;
    END;

    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, performed_by, shop_id)
    VALUES (TG_TABLE_NAME, OLD.id::VARCHAR, TG_OP, row_to_json(OLD)::JSONB, current_user_id, v_shop_id);
    RETURN OLD;
  END IF;

  BEGIN
    v_shop_id := public.resolve_shop_id((NEW.shop_id)::TEXT);
  EXCEPTION WHEN OTHERS THEN
    v_shop_id := NULL;
  END;

  IF (TG_OP = 'UPDATE') THEN
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

-- 3. Recria policies das tabelas legadas sem cast direto para UUID
DROP POLICY IF EXISTS "Usuários veem pacientes de suas filiais" ON public.patients;
CREATE POLICY "Usuários veem pacientes de suas filiais" ON public.patients
FOR SELECT USING (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários criam pacientes em suas filiais" ON public.patients;
CREATE POLICY "Usuários criam pacientes em suas filiais" ON public.patients
FOR INSERT WITH CHECK (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários atualizam pacientes de suas filiais" ON public.patients;
CREATE POLICY "Usuários atualizam pacientes de suas filiais" ON public.patients
FOR UPDATE USING (public.user_has_shop_access(shop_id::TEXT))
WITH CHECK (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários veem agendamentos de suas filiais" ON public.appointments;
CREATE POLICY "Usuários veem agendamentos de suas filiais" ON public.appointments
FOR SELECT USING (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários criam agendamentos em suas filiais" ON public.appointments;
CREATE POLICY "Usuários criam agendamentos em suas filiais" ON public.appointments
FOR INSERT WITH CHECK (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários atualizam agendamentos de suas filiais" ON public.appointments;
CREATE POLICY "Usuários atualizam agendamentos de suas filiais" ON public.appointments
FOR UPDATE USING (public.user_has_shop_access(shop_id::TEXT))
WITH CHECK (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários veem fila de suas filiais" ON public.waitlist;
CREATE POLICY "Usuários veem fila de suas filiais" ON public.waitlist
FOR SELECT USING (public.user_has_shop_access(shop_id::TEXT));

DROP POLICY IF EXISTS "Usuários gerenciam fila em suas filiais" ON public.waitlist;
CREATE POLICY "Usuários gerenciam fila em suas filiais" ON public.waitlist
FOR ALL USING (public.user_has_shop_access(shop_id::TEXT))
WITH CHECK (public.user_has_shop_access(shop_id::TEXT));

-- 4. Arquivo seguro para payloads legados da tabela patients
CREATE TABLE IF NOT EXISTS public.patient_legacy_payloads (
  patient_id TEXT PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  timeline JSONB,
  prescriptions JSONB,
  purchases JSONB,
  payments JSONB,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.patient_legacy_payloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins leem payloads legados" ON public.patient_legacy_payloads;
CREATE POLICY "Admins leem payloads legados" ON public.patient_legacy_payloads
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
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

-- Se os campos antigos ainda existirem em patients, arquiva e migra sem remover.
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'timeline'
  ) THEN
    INSERT INTO public.patient_timeline_events (
      patient_id, type, title, description, date, shop_id, legacy_source_id
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'prescriptions'
  ) THEN
    INSERT INTO public.prescriptions (
      patient_id, date, glasses_type, lens_type, od_sph, od_cyl, od_axis,
      os_sph, os_cyl, os_axis, addition, notes, shop_id, legacy_source_id
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

-- 5. Remove dados fictícios de teste do ambiente real
DELETE FROM public.waitlist
WHERE id LIKE 'wait-teste-%'
   OR patient_name LIKE '(TESTE)%';

DELETE FROM public.appointments
WHERE id LIKE 'app-teste-%'
   OR patient_id LIKE 'pat-teste-%'
   OR patient_name LIKE '(TESTE)%';

DELETE FROM public.patients
WHERE id LIKE 'pat-teste-%'
   OR name LIKE '(TESTE)%';

-- 6. Permissões de execução das funções usadas por RLS
REVOKE EXECUTE ON FUNCTION public.resolve_shop_id(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_shop_id(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_shop_id(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_shop_access(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_shop_access(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_shop_access(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_shop_access(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_shop_access(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_shop_access(UUID) TO authenticated;
