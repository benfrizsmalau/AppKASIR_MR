-- ==============================================================================
-- FIX: SYNC PAYMENT METHODS & SCHEMA UPDATES
-- Run this in Supabase SQL Editor to fix the "Gagal memproses pembayaran" error.
-- ==============================================================================

-- 1. Update payment_method ENUM with missing values
-- Note: We use DO block because ALTER TYPE ADD VALUE cannot run inside a transaction.
-- But in Supabase SQL editor, it's usually fine. To be safe, we check if they exist.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'payment_method' AND e.enumlabel = 'Hutang') THEN
        ALTER TYPE payment_method ADD VALUE 'Hutang';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'payment_method' AND e.enumlabel = 'Debit') THEN
        ALTER TYPE payment_method ADD VALUE 'Debit';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'payment_method' AND e.enumlabel = 'Kredit') THEN
        ALTER TYPE payment_method ADD VALUE 'Kredit';
    END IF;
END $$;

-- 2. Ensure outlet_id exists in tables that were updated in addendum
-- (If you haven't run the latest addendum updates)

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_logs' AND column_name='outlet_id') THEN
        ALTER TABLE public.inventory_logs ADD COLUMN outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='outlet_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='debt_payments' AND column_name='outlet_id') THEN
        ALTER TABLE public.debt_payments ADD COLUMN outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Ensure order table has necessary columns for tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='dpp_total') THEN
        ALTER TABLE public.orders ADD COLUMN dpp_total DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='is_credit') THEN
        ALTER TABLE public.orders ADD COLUMN is_credit BOOLEAN DEFAULT false;
    END IF;
END $$;
