-- =====================================================================
-- MIGRAÇÃO FASE 4: CONTROLE DE ESTOQUE (INVENTORY)
-- =====================================================================

-- 1. Criação da Tabela de Itens de Estoque (inventory_items)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    category VARCHAR(50) NOT NULL, -- e.g., 'Armação', 'Lente', 'Lente de Contato', 'Outros'
    brand VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criação da Tabela de Transações de Estoque (inventory_transactions)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'IN' (Entrada), 'OUT' (Saída/Venda), 'ADJUST' (Ajuste)
    quantity INTEGER NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT
);

-- 3. Habilitar RLS nas novas tabelas
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS (Segurança)
DROP POLICY IF EXISTS "Acesso Inventory Items da filial" ON public.inventory_items;
CREATE POLICY "Acesso Inventory Items da filial" ON public.inventory_items
    FOR ALL USING (public.user_has_shop_access(shop_id));

DROP POLICY IF EXISTS "Acesso Inventory Transactions da filial" ON public.inventory_transactions;
CREATE POLICY "Acesso Inventory Transactions da filial" ON public.inventory_transactions
    FOR ALL USING (public.user_has_shop_access(shop_id));

-- 5. Triggers de Auditoria
DROP TRIGGER IF EXISTS tr_audit_inventory_items ON public.inventory_items;
CREATE TRIGGER tr_audit_inventory_items
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_audit_inventory_transactions ON public.inventory_transactions;
CREATE TRIGGER tr_audit_inventory_transactions
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
