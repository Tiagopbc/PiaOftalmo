-- ============================================================================
-- UNIDADES / FILIAIS: cadastro administrativo simples e sem custos extras
-- ============================================================================

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS cep VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS shops_set_updated_at ON public.shops;
CREATE TRIGGER shops_set_updated_at
BEFORE UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Admins criam lojas" ON public.shops;
CREATE POLICY "Admins criam lojas" ON public.shops
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  )
);

DROP POLICY IF EXISTS "Admins atualizam lojas" ON public.shops;
CREATE POLICY "Admins atualizam lojas" ON public.shops
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  )
);

GRANT SELECT, INSERT, UPDATE ON public.shops TO authenticated;
REVOKE DELETE ON public.shops FROM authenticated, anon, public;
