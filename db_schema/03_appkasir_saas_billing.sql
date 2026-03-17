-- ==============================================================================
-- APP KASIR POS ADV - DATABASE SCHEMA ADDENDUM SAAS (v1.2)
-- Target Database: PostgreSQL (Supabase)
-- Focus: SaaS Billing, Invoices, Owner Sessions, and 2FA Security
-- Memenuhi Kebutuhan PRD Addendum ADD-002 (Modul 18 & 19)
-- ==============================================================================

-- 1. ENUM TYPES UNTUK BILLING
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('Unpaid', 'Paid', 'Failed', 'Cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
        CREATE TYPE billing_cycle AS ENUM ('Bulanan', 'Tahunan');
    END IF;
END $$;

-- 2. TENANT INVOICES (Histori Tagihan Berlangganan)
-- Menyimpan riwayat tagihan dari AppKasir ke Pemilik Usaha (Tenant)
CREATE TABLE IF NOT EXISTS public.tenant_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL, -- e.g., INV-AK-202603-001
    plan_name subscription_tier NOT NULL,
    billing_cycle billing_cycle DEFAULT 'Bulanan',
    amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0, -- PPN 11%
    total_amount DECIMAL(15,2) NOT NULL,
    status invoice_status DEFAULT 'Unpaid',
    payment_method VARCHAR(50), -- e.g., 'Credit Card', 'Virtual Account'
    payment_reference VARCHAR(255), -- ID dari Payment Gateway (Midtrans/Xendit)
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. OWNER SESSIONS (Keamanan Login & Manajemen Perangkat Aktif)
-- Mendukung PRD Modul 18 untuk fitur "Keluarkan Perangkat Lain"
CREATE TABLE IF NOT EXISTS public.owner_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.staff_users(id) ON DELETE CASCADE,
    device_name VARCHAR(255), -- e.g., 'Chrome on Windows', 'Safari on iPhone'
    ip_address VARCHAR(45),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. UPDATE STAFF_USERS (Penambahan 2FA & Security Level)
ALTER TABLE public.staff_users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255), -- TOTP Secret
ADD COLUMN IF NOT EXISTS backup_codes JSONB; -- Kumpulan kode backup darurat

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_sessions ENABLE ROW LEVEL SECURITY;

-- 6. INDEKS UNTUK PERFORMA
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.tenant_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.tenant_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.owner_sessions(user_id);
