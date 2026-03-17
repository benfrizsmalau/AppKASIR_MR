-- ==============================================================================
-- APP KASIR POS ADV - DATABASE SCHEMA v1.5 (Advanced Features)
-- Target Database: PostgreSQL (Supabase)
-- Requires: 01_appkasir_schema.sql, 02_appkasir_addendum.sql,
--           03_appkasir_saas_billing.sql, 04_fix_payment_schema.sql
-- ==============================================================================
-- Covers:
--   - RBAC: Tambah role Supervisor & Owner pada enum user_role
--   - Orders: Kolom refund & pembatalan
--   - Order Items: Kolom pembatalan per item & label variasi
--   - Tables: Kolom order_type per meja
--   - Inventaris Bahan Baku: Tabel ingredients, stock_movements, recipes
--   - PBJT Buku Besar: Tabel pbjt_periods (locking masa pajak)
--   - Update constraint status order_items (tambah 'Dibatalkan')
-- ==============================================================================


-- ==============================================================================
-- BAGIAN 1: UPDATE ENUM user_role
-- Tambah nilai 'Supervisor' dan 'Owner' ke enum yang ada
-- ==============================================================================

DO $$
BEGIN
    -- Tambah 'Supervisor' jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'Supervisor'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'Supervisor';
        RAISE NOTICE 'Added Supervisor to user_role enum';
    ELSE
        RAISE NOTICE 'Supervisor already exists in user_role enum';
    END IF;

    -- Tambah 'Owner' jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'Owner'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'Owner';
        RAISE NOTICE 'Added Owner to user_role enum';
    ELSE
        RAISE NOTICE 'Owner already exists in user_role enum';
    END IF;
END $$;


-- ==============================================================================
-- BAGIAN 2: UPDATE TABEL orders
-- Tambah kolom untuk fitur Refund / Retur
-- ==============================================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS is_refunded       BOOLEAN                     DEFAULT false,
    ADD COLUMN IF NOT EXISTS refund_reason     TEXT,
    ADD COLUMN IF NOT EXISTS refunded_at       TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS refunded_by       UUID REFERENCES public.staff_users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.orders.is_refunded   IS 'True jika order ini telah di-refund/retur sebagian atau penuh';
COMMENT ON COLUMN public.orders.refund_reason IS 'Alasan refund yang diinput oleh kasir/supervisor';
COMMENT ON COLUMN public.orders.refunded_at   IS 'Waktu refund dilakukan';
COMMENT ON COLUMN public.orders.refunded_by   IS 'ID staff_user yang memproses refund';


-- ==============================================================================
-- BAGIAN 3: UPDATE TABEL order_items
-- Tambah kolom untuk pembatalan per item & snapshot label variasi
-- Perbarui constraint status agar mencakup 'Dibatalkan'
-- ==============================================================================

ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS variation_label     TEXT;

COMMENT ON COLUMN public.order_items.cancellation_reason IS 'Alasan pembatalan item (diisi saat status = Dibatalkan)';
COMMENT ON COLUMN public.order_items.variation_label     IS 'Snapshot teks variasi yang dipilih, cth: "Ukuran: Large, Suhu: Dingin"';

-- Update CHECK constraint pada order_items.status untuk menambahkan nilai 'Dibatalkan'
-- PostgreSQL tidak mendukung ALTER COLUMN ... SET CHECK secara langsung,
-- sehingga kita hapus constraint lama dan tambahkan yang baru.
DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    -- Cari nama constraint CHECK pada kolom status di tabel order_items
    SELECT conname INTO v_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%';

    IF v_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT %I', v_constraint_name);
        RAISE NOTICE 'Dropped constraint: %', v_constraint_name;
    END IF;
END $$;

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_status_check
    CHECK (status IN ('Baru', 'Dikirim', 'Dimasak', 'Siap', 'Selesai', 'Batal', 'Dibatalkan'));


-- ==============================================================================
-- BAGIAN 4: UPDATE TABEL tables
-- Tambah kolom order_type untuk meja (Dine-In / Takeaway / Delivery)
-- ==============================================================================

ALTER TABLE public.tables
    ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'Dine-In'
        CHECK (order_type IN ('Dine-In', 'Takeaway', 'Delivery'));

COMMENT ON COLUMN public.tables.order_type IS 'Jenis pesanan default untuk meja ini';


-- ==============================================================================
-- BAGIAN 5: TABEL BARU — ingredients (Bahan Baku Inventaris)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ingredients (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id      UUID        NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    unit           VARCHAR(50)  NOT NULL,                        -- cth: "gram", "ml", "pcs", "kg"
    current_stock  DECIMAL(15,4) NOT NULL DEFAULT 0,
    min_stock      DECIMAL(15,4) NOT NULL DEFAULT 0,             -- ambang batas stok minimum (alert)
    cost_per_unit  DECIMAL(15,2) NOT NULL DEFAULT 0,             -- HPP per satuan
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.ingredients IS 'Bahan baku untuk sistem inventaris dan resep menu';
COMMENT ON COLUMN public.ingredients.current_stock IS 'Stok saat ini dalam satuan unit';
COMMENT ON COLUMN public.ingredients.min_stock     IS 'Stok minimum; di bawah nilai ini akan muncul alert';
COMMENT ON COLUMN public.ingredients.cost_per_unit IS 'Harga pokok per 1 satuan unit (untuk perhitungan HPP)';

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- BAGIAN 6: TABEL BARU — stock_movements (Mutasi Stok Bahan Baku)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id      UUID        NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    ingredient_id  UUID        NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    movement_type  VARCHAR(30) NOT NULL
        CHECK (movement_type IN ('Masuk', 'Keluar', 'Penyesuaian', 'Pemakaian', 'Retur')),
    quantity       DECIMAL(15,4) NOT NULL,                       -- positif = masuk, negatif = keluar
    reference_id   UUID,                                         -- ID order atau ID payment terkait
    notes          TEXT,
    created_by     UUID REFERENCES public.staff_users(id) ON DELETE SET NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.stock_movements IS 'Kartu stok / histori mutasi bahan baku';
COMMENT ON COLUMN public.stock_movements.movement_type IS 'Masuk=pembelian, Keluar=retur supplier, Pemakaian=auto-deduct saat bayar, Penyesuaian=stok opname';
COMMENT ON COLUMN public.stock_movements.quantity      IS 'Jumlah perubahan; positif=penambahan stok, negatif=pengurangan stok';
COMMENT ON COLUMN public.stock_movements.reference_id  IS 'UUID terkait: orders.id (Pemakaian), debt_payments.id (Retur), dsb';

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- BAGIAN 7: TABEL BARU — recipes (Resep Menu = Relasi Menu Item ke Bahan Baku)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.recipes (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    menu_item_id    UUID         NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    ingredient_id   UUID         NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    quantity_used   DECIMAL(15,4) NOT NULL DEFAULT 1,           -- jumlah bahan yang terpakai per 1 sajian
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (menu_item_id, ingredient_id)                        -- satu kombinasi menu + bahan hanya 1 baris
);

COMMENT ON TABLE public.recipes IS 'Resep: berapa banyak tiap bahan baku yang dipakai per 1 porsi menu item';
COMMENT ON COLUMN public.recipes.quantity_used IS 'Jumlah bahan (dalam satuan unit) yang dipakai untuk 1x menu item dipesan';

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- BAGIAN 8: TABEL BARU — pbjt_periods (Buku Besar & Locking Masa Pajak PBJT)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pbjt_periods (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id        UUID        NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    year             SMALLINT    NOT NULL,                       -- cth: 2025
    month            SMALLINT    NOT NULL CHECK (month BETWEEN 1 AND 12),
    is_locked        BOOLEAN     NOT NULL DEFAULT false,         -- true = masa pajak sudah dikunci/dilaporkan
    locked_at        TIMESTAMP WITH TIME ZONE,
    locked_by_user_id UUID REFERENCES public.staff_users(id) ON DELETE SET NULL,
    -- Rekap akumulasi (di-update saat lock atau via trigger/job)
    total_gross      DECIMAL(15,2) NOT NULL DEFAULT 0,           -- total omset bruto
    total_dpp        DECIMAL(15,2) NOT NULL DEFAULT 0,           -- total Dasar Pengenaan Pajak
    total_pbjt       DECIMAL(15,2) NOT NULL DEFAULT 0,           -- total PBJT terutang
    tx_count         INTEGER      NOT NULL DEFAULT 0,            -- jumlah transaksi dalam masa pajak
    -- Metadata pelaporan
    sptpd_number     VARCHAR(100),                               -- Nomor SPTPD saat dilaporkan
    reported_at      TIMESTAMP WITH TIME ZONE,
    notes            TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, outlet_id, year, month)                   -- satu entri per bulan per outlet
);

COMMENT ON TABLE public.pbjt_periods IS 'Buku Besar PBJT per masa pajak (bulan). Setelah dikunci, transaksi lama tidak bisa diubah.';
COMMENT ON COLUMN public.pbjt_periods.is_locked    IS 'True = masa pajak sudah dikunci; order lama pada periode ini tidak bisa dibatalkan';
COMMENT ON COLUMN public.pbjt_periods.total_gross  IS 'Akumulasi subtotal + service charge dalam periode ini';
COMMENT ON COLUMN public.pbjt_periods.total_dpp    IS 'Akumulasi DPP (Dasar Pengenaan Pajak) dalam periode ini';
COMMENT ON COLUMN public.pbjt_periods.total_pbjt   IS 'Akumulasi PBJT (10% dari DPP) dalam periode ini';
COMMENT ON COLUMN public.pbjt_periods.sptpd_number IS 'Nomor SPTPD yang diterbitkan oleh Bapenda saat pelaporan';

ALTER TABLE public.pbjt_periods ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- BAGIAN 9: UPDATE menu_variations — JSONB format baru
-- Schema lama: options format {"name": "Small", "add_price": 0}
-- Format baru (digunakan VariationModal): {"label": "Small", "price_adjustment": 0}
-- Kolom struktur tetap sama (options JSONB), hanya komentar diperbarui.
-- ==============================================================================

COMMENT ON COLUMN public.menu_variations.options IS
    'Array JSON pilihan variasi. Format: [{"label": "Small", "price_adjustment": 0}, {"label": "Large", "price_adjustment": 5000}]';


-- ==============================================================================
-- BAGIAN 10: INDEXES — Performa Query
-- ==============================================================================

-- Ingredients
CREATE INDEX IF NOT EXISTS idx_ingredients_tenant_outlet
    ON public.ingredients(tenant_id, outlet_id);

CREATE INDEX IF NOT EXISTS idx_ingredients_stock
    ON public.ingredients(tenant_id, outlet_id, current_stock);

-- Stock Movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient
    ON public.stock_movements(ingredient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_outlet
    ON public.stock_movements(tenant_id, outlet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
    ON public.stock_movements(reference_id) WHERE reference_id IS NOT NULL;

-- Recipes
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item
    ON public.recipes(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_recipes_ingredient
    ON public.recipes(ingredient_id);

CREATE INDEX IF NOT EXISTS idx_recipes_tenant
    ON public.recipes(tenant_id);

-- PBJT Periods
CREATE INDEX IF NOT EXISTS idx_pbjt_periods_tenant_outlet
    ON public.pbjt_periods(tenant_id, outlet_id);

CREATE INDEX IF NOT EXISTS idx_pbjt_periods_year_month
    ON public.pbjt_periods(tenant_id, outlet_id, year, month);

CREATE INDEX IF NOT EXISTS idx_pbjt_periods_locked
    ON public.pbjt_periods(tenant_id, outlet_id, is_locked);

-- Orders — refund lookup
CREATE INDEX IF NOT EXISTS idx_orders_refunded
    ON public.orders(tenant_id, outlet_id, is_refunded)
    WHERE is_refunded = true;

-- Order Items — pembatalan lookup
CREATE INDEX IF NOT EXISTS idx_order_items_cancelled
    ON public.order_items(order_id, status)
    WHERE status = 'Dibatalkan';


-- ==============================================================================
-- BAGIAN 11: RLS POLICIES (Bypass untuk service_role)
-- Service role digunakan oleh server-side Next.js (supabase admin client).
-- Kasir PIN login tidak menggunakan JWT Supabase auth, sehingga
-- RLS policy utama cukup allow service_role saja.
-- ==============================================================================

-- ingredients
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ingredients' AND policyname = 'service_role_all_ingredients'
    ) THEN
        CREATE POLICY "service_role_all_ingredients"
            ON public.ingredients FOR ALL
            TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- stock_movements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'stock_movements' AND policyname = 'service_role_all_stock_movements'
    ) THEN
        CREATE POLICY "service_role_all_stock_movements"
            ON public.stock_movements FOR ALL
            TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- recipes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'recipes' AND policyname = 'service_role_all_recipes'
    ) THEN
        CREATE POLICY "service_role_all_recipes"
            ON public.recipes FOR ALL
            TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- pbjt_periods
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'pbjt_periods' AND policyname = 'service_role_all_pbjt_periods'
    ) THEN
        CREATE POLICY "service_role_all_pbjt_periods"
            ON public.pbjt_periods FOR ALL
            TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;


-- ==============================================================================
-- BAGIAN 12: TRIGGER — auto-update updated_at
-- ==============================================================================

-- Fungsi trigger universal (buat sekali jika belum ada)
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger untuk ingredients
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_ingredients_updated_at'
    ) THEN
        CREATE TRIGGER trg_ingredients_updated_at
            BEFORE UPDATE ON public.ingredients
            FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
    END IF;
END $$;

-- Trigger untuk pbjt_periods
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_pbjt_periods_updated_at'
    ) THEN
        CREATE TRIGGER trg_pbjt_periods_updated_at
            BEFORE UPDATE ON public.pbjt_periods
            FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
    END IF;
END $$;


-- ==============================================================================
-- VERIFIKASI
-- Jalankan query berikut setelah migrasi untuk memastikan semua tabel dibuat:
-- ==============================================================================
/*
SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ingredients', 'stock_movements', 'recipes', 'pbjt_periods')
ORDER BY table_name;

-- Pastikan kolom baru ada:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN ('is_refunded', 'refund_reason', 'refunded_at', 'refunded_by');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'order_items'
  AND column_name IN ('cancellation_reason', 'variation_label');

-- Pastikan enum user_role sudah punya Supervisor dan Owner:
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'user_role'
ORDER BY enumsortorder;
*/
-- ==============================================================================
-- END OF MIGRATION 05
-- ==============================================================================
