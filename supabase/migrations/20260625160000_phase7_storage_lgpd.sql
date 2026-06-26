-- ==========================================
-- PHASE 7: UPLOADS E LGPD (Storage)
-- ==========================================

-- 1. Habilitar a extensão pgcrypto se ainda não estiver (para UUIDs)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criar a tabela de Metadados de Anexos
CREATE TABLE IF NOT EXISTS public.patient_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    size_bytes BIGINT,
    is_confidential BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (LGPD) para a Tabela

-- Leitura (SELECT): Permite ver se tem acesso à loja E (não for sigiloso OU o usuário for admin/médico)
DROP POLICY IF EXISTS "Acesso LGPD leitura anexos" ON public.patient_attachments;
CREATE POLICY "Acesso LGPD leitura anexos" ON public.patient_attachments
FOR SELECT USING (
    public.user_has_shop_access(shop_id) AND 
    (
        is_confidential = false OR 
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'medico')
    )
);

-- Inserção (INSERT): Qualquer usuário com acesso à loja pode anexar
DROP POLICY IF EXISTS "Inserir anexos" ON public.patient_attachments;
CREATE POLICY "Inserir anexos" ON public.patient_attachments
FOR INSERT WITH CHECK (
    public.user_has_shop_access(shop_id)
);

-- Deleção (DELETE): Segue a mesma regra do SELECT (recepção não apaga sigilosos)
DROP POLICY IF EXISTS "Deletar anexos" ON public.patient_attachments;
CREATE POLICY "Deletar anexos" ON public.patient_attachments
FOR DELETE USING (
    public.user_has_shop_access(shop_id) AND 
    (
        is_confidential = false OR 
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'medico')
    )
);

-- 4. Criar o Bucket no Storage do Supabase
-- Nota: O bucket é privado (public = false). 
-- O acesso ao download do arquivo físico se dará via "Signed URLs" geradas pelo frontend.
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Permitir INSERT físico de arquivos no Storage para usuários autenticados
DROP POLICY IF EXISTS "Permitir upload no bucket patient-documents" ON storage.objects;
CREATE POLICY "Permitir upload no bucket patient-documents" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'patient-documents'
);

-- Permitir SELECT (Download direto se tiver Signed URL ou token válido)
DROP POLICY IF EXISTS "Permitir download do bucket patient-documents" ON storage.objects;
CREATE POLICY "Permitir download do bucket patient-documents" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'patient-documents'
    AND EXISTS (
        SELECT 1
        FROM public.patient_attachments pa
        WHERE pa.storage_path = storage.objects.name
          AND public.user_has_shop_access(pa.shop_id)
          AND (
              pa.is_confidential = false
              OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'medico')
          )
    )
);

DROP POLICY IF EXISTS "Permitir exclusao do bucket patient-documents" ON storage.objects;
CREATE POLICY "Permitir exclusao do bucket patient-documents" ON storage.objects
FOR DELETE TO authenticated USING (
    bucket_id = 'patient-documents'
    AND EXISTS (
        SELECT 1
        FROM public.patient_attachments pa
        WHERE pa.storage_path = storage.objects.name
          AND public.user_has_shop_access(pa.shop_id)
          AND (
              pa.is_confidential = false
              OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'medico')
          )
    )
);
