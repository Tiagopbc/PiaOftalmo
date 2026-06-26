-- =====================================================================
-- MIGRAÇÃO FASE 5: PRONTUÁRIO CLÍNICO AVANÇADO E EXAMES
-- =====================================================================

-- 1. Criação da Tabela de Prontuários (Clinical Encounters)
CREATE TABLE IF NOT EXISTS public.clinical_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    
    -- Dados estruturados (JSONB para flexibilidade de novos campos)
    anamnesis JSONB DEFAULT '{}'::jsonb, -- { queixaPrincipal, historicoFamiliar, doencasSistemicas, medicamentos }
    visual_acuity JSONB DEFAULT '{}'::jsonb, -- { od_cc, od_sc, oe_cc, oe_sc }
    tonometry JSONB DEFAULT '{}'::jsonb, -- { od_pressure, oe_pressure, time }
    refraction JSONB DEFAULT '{}'::jsonb, -- { od_sph, od_cyl, od_axis, oe_sph, oe_cyl, oe_axis, add }
    diagnosis JSONB DEFAULT '{}'::jsonb, -- { cid, conduta, obs_gerais }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criação da Tabela de Exames Extras (Exams)
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES public.clinical_encounters(id) ON DELETE CASCADE, -- opcional
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    
    exam_type VARCHAR(100) NOT NULL, -- ex: 'Campo Visual', 'Topografia', 'Mapeamento de Retina'
    results TEXT,
    conclusion TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. RLS E POLÍTICAS DE SEGURANÇA
ALTER TABLE public.clinical_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- clinical_encounters
DROP POLICY IF EXISTS "Acesso Clinical Encounters da filial" ON public.clinical_encounters;
CREATE POLICY "Acesso Clinical Encounters da filial" ON public.clinical_encounters
    FOR ALL USING (public.user_has_shop_access(shop_id));

-- exams
DROP POLICY IF EXISTS "Acesso Exams da filial" ON public.exams;
CREATE POLICY "Acesso Exams da filial" ON public.exams
    FOR ALL USING (public.user_has_shop_access(shop_id));

-- 4. TRIGGERS DE AUDITORIA
DROP TRIGGER IF EXISTS tr_audit_clinical_encounters ON public.clinical_encounters;
CREATE TRIGGER tr_audit_clinical_encounters
    AFTER INSERT OR UPDATE OR DELETE ON public.clinical_encounters
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_exams ON public.exams;
CREATE TRIGGER tr_audit_exams
    AFTER INSERT OR UPDATE OR DELETE ON public.exams
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
