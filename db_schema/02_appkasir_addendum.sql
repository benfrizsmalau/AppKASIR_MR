-- ==============================================================================
-- APP KASIR POS ADV - DATABASE SCHEMA ADDENDUM (v1.1)
-- Target Database: PostgreSQL (Supabase)
-- Focus: Customer Management, Credit, Inventory, and Tax Compliance
-- ==============================================================================

-- 1. ADDITIONAL ENUM TYPES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
        CREATE TYPE customer_type AS ENUM ('Personal', 'Instansi');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_log_type') THEN
        CREATE TYPE inventory_log_type AS ENUM ('Masuk', 'Keluar', 'Penyesuaian', 'Retur');
    END IF;
END $$;

-- 2. CUSTOMERS (Pelanggan & Manajemen Kredit)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type customer_type DEFAULT 'Personal',
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    npwpd VARCHAR(50), -- NPWPD Instansi (untuk pelaporan pajak daerah)
    contact_person VARCHAR(255), -- Khusus untuk Instansi
    credit_limit DECIMAL(15,2) DEFAULT 0, -- Plafon hutang
    current_debt DECIMAL(15,2) DEFAULT 0, -- Saldo hutang berjalan
    loyalty_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. UPDATING ORDERS (Integrating Customers & Tax)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ntpd VARCHAR(100), -- Nomor Transaksi Pendapatan Daerah (e-BPHTB/PBJT)
ADD COLUMN IF NOT EXISTS tax_reported_at TIMESTAMP WITH TIME ZONE;

-- 4. DEBT PAYMENTS (Pelunasan Hutang Pelanggan)
CREATE TABLE IF NOT EXISTS public.debt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount_paid DECIMAL(15,2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'Tunai',
    reference_number VARCHAR(100), -- No. Bukti Transfer / NTPD
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cashier_id UUID REFERENCES public.staff_users(id)
);

-- 5. UPDATING MENU ITEMS (Stock Management)
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_stock DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock DECIMAL(15,2) DEFAULT 0;

-- 6. INVENTORY LOGS (Kartu Stok)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    type inventory_log_type NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    reference_id UUID, -- Bisa ID order atau ID debt_payment jika retur
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.staff_users(id)
);

-- 7. AUDIT LOGS (Monitoring Perubahan Sensitif)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.staff_users(id),
    action VARCHAR(100) NOT NULL, -- e.g., 'UPDATE_CREDIT_LIMIT', 'VOID_TRANSACTION'
    entity_type VARCHAR(100), -- e.g., 'customers', 'orders'
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    notes TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ENABLE RLS FOR ADDENDUM TABLES
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. NOTIFICATION / SETTINGS (Optional based on PRD)
-- Fitur peringatan stok tipis atau hutang jatuh tempo bisa menggunakan query view.

-- 10. INDEXING FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON public.inventory_logs(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_logs(tenant_id);
