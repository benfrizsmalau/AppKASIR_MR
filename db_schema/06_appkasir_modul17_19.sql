-- ==============================================================================
-- APP KASIR POS ADV - DATABASE SCHEMA v1.6 (Modul 17, 18, 19)
-- Target Database: PostgreSQL (Supabase)
-- Requires: 01 → 02 → 03 → 04 → 05 dijalankan terlebih dahulu
-- ==============================================================================
-- Perubahan yang dicakup:
--   1. Index performa pada staff_users.email (kritis untuk login Owner)
--   2. Partial unique constraint email Owner/Admin (cegah duplikat registrasi)
--   3. RLS service_role policies untuk owner_sessions & tenant_invoices
--      (dibuat di schema 03 tapi tidak punya policy — diisi di sini)
--   4. Kolom email wajib/opsional — normalisasi komentar
-- ==============================================================================


-- ==============================================================================
-- BAGIAN 1: INDEX PERFORMA — staff_users.email
-- Login Owner melakukan query: .eq('email', ...).in('role', ['Owner','Admin'])
-- Tanpa index, ini full table scan pada setiap login.
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_users_email
    ON public.staff_users(email)
    WHERE email IS NOT NULL;

COMMENT ON INDEX public.idx_staff_users_email
    IS 'Index untuk mempercepat login Owner/Admin berdasarkan email';

-- Index gabungan: email + role — query login exact match
CREATE INDEX IF NOT EXISTS idx_staff_users_email_role
    ON public.staff_users(email, role)
    WHERE email IS NOT NULL;

COMMENT ON INDEX public.idx_staff_users_email_role
    IS 'Composite index untuk query login: WHERE email = $1 AND role IN (...)';


-- ==============================================================================
-- BAGIAN 2: PARTIAL UNIQUE CONSTRAINT — email pada role Owner & Admin
-- Mencegah email yang sama mendaftar ulang sebagai Owner/Admin.
-- Kasir (role Kasir/Supervisor/Manajer) tidak wajib punya email unik.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'staff_users'
          AND indexname = 'uq_staff_users_email_owner_admin'
    ) THEN
        CREATE UNIQUE INDEX uq_staff_users_email_owner_admin
            ON public.staff_users(email)
            WHERE email IS NOT NULL
              AND role IN ('Owner', 'Admin');

        RAISE NOTICE 'Created partial unique index on staff_users(email) for Owner/Admin roles';
    ELSE
        RAISE NOTICE 'Partial unique index uq_staff_users_email_owner_admin already exists';
    END IF;
END $$;

COMMENT ON INDEX public.uq_staff_users_email_owner_admin
    IS 'Email harus unik untuk role Owner dan Admin — mencegah duplikat registrasi portal pemilik';


-- ==============================================================================
-- BAGIAN 3: RLS SERVICE_ROLE POLICIES — owner_sessions & tenant_invoices
-- Tabel dibuat di schema 03 dengan ENABLE ROW LEVEL SECURITY,
-- tapi tidak ada policy. Service_role (dbAdmin) bypass RLS secara default
-- di Supabase, namun explicit policy lebih aman dan terdokumentasi.
-- ==============================================================================

-- owner_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'owner_sessions'
          AND policyname = 'service_role_all_owner_sessions'
    ) THEN
        CREATE POLICY "service_role_all_owner_sessions"
            ON public.owner_sessions FOR ALL
            TO service_role USING (true) WITH CHECK (true);
        RAISE NOTICE 'Created RLS policy for owner_sessions';
    END IF;
END $$;

-- tenant_invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'tenant_invoices'
          AND policyname = 'service_role_all_tenant_invoices'
    ) THEN
        CREATE POLICY "service_role_all_tenant_invoices"
            ON public.tenant_invoices FOR ALL
            TO service_role USING (true) WITH CHECK (true);
        RAISE NOTICE 'Created RLS policy for tenant_invoices';
    END IF;
END $$;


-- ==============================================================================
-- BAGIAN 4: NORMALISASI KOLOM staff_users
-- Pastikan kolom-kolom yang digunakan kode baru sudah ada:
--   - email        → ada di schema 01
--   - is_active    → ada di schema 01
--   - updated_at   → ada di schema 01
--   - two_factor_enabled, two_factor_secret, backup_codes → ada di schema 03
-- Tidak ada kolom baru yang perlu ditambahkan.
-- Hanya memastikan komentar dan default value sudah benar.
-- ==============================================================================

-- Pastikan email bisa di-query untuk lookup login
-- (Sudah ada di schema 01, ini hanya dokumentasi)
COMMENT ON COLUMN public.staff_users.email
    IS 'Email login — wajib unik untuk role Owner & Admin; opsional untuk Kasir/Supervisor/Manajer';

COMMENT ON COLUMN public.staff_users.pin_hash
    IS 'Untuk Kasir: bcrypt hash dari PIN 4-6 digit. Untuk Owner/Admin: bcrypt hash dari kata sandi panjang';

COMMENT ON COLUMN public.staff_users.two_factor_enabled
    IS 'True jika Owner mengaktifkan 2FA via aplikasi Authenticator';


-- ==============================================================================
-- BAGIAN 5: INDEX TAMBAHAN — tenants.subdomain (untuk cek ketersediaan)
-- Fungsi checkSubdomain() melakukan .eq('subdomain', ...) setiap kali
-- ada input di form pendaftaran. Tanpa index = full table scan.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_subdomain
    ON public.tenants(subdomain);

COMMENT ON INDEX public.uq_tenants_subdomain
    IS 'Subdomain harus unik per platform — digunakan saat cek ketersediaan real-time di /daftar';

CREATE INDEX IF NOT EXISTS idx_tenants_status
    ON public.tenants(status);

COMMENT ON INDEX public.idx_tenants_status
    IS 'Index untuk filter tenant berdasarkan status saat login portal pemilik';


-- ==============================================================================
-- VERIFIKASI — Jalankan setelah migrasi untuk memastikan semua terbuat
-- ==============================================================================
/*
-- Cek index pada staff_users:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'staff_users'
  AND indexname IN (
    'idx_staff_users_email',
    'idx_staff_users_email_role',
    'uq_staff_users_email_owner_admin'
  );

-- Cek index pada tenants:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tenants'
  AND indexname IN ('uq_tenants_subdomain', 'idx_tenants_status');

-- Cek RLS policies:
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('owner_sessions', 'tenant_invoices')
ORDER BY tablename, policyname;

-- Cek user_role enum sudah punya Owner:
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'user_role'
ORDER BY enumsortorder;
-- Hasil yang diharapkan: Admin, Manajer, Kasir, Pramusaji, Supervisor, Owner
*/

-- ==============================================================================
-- CHECKLIST TABEL YANG DIGUNAKAN MODUL 17-19 (Status Coverage)
-- ==============================================================================
/*
MODUL 17 (Pendaftaran):
  [✅] tenants          — schema 01
  [✅] outlets           — schema 01
  [✅] staff_users       — schema 01 (email, pin_hash, is_active, role)
  [✅] user_role 'Owner' — schema 05
  [✅] idx_staff_email   — schema 06 (BARU)
  [✅] uq_email_owner    — schema 06 (BARU)
  [✅] uq_subdomain      — schema 06 (BARU)

MODUL 18 (Sign-In Pemilik):
  [✅] staff_users.email + role lookup  — schema 01 + index 06
  [✅] tenants.status                   — schema 01
  [✅] owner_sessions                   — schema 03
  [✅] RLS policy owner_sessions        — schema 06 (BARU)
  [✅] staff_users.two_factor_enabled   — schema 03
  [✅] staff_users.two_factor_secret    — schema 03

MODUL 19 (Langganan):
  [✅] tenant_invoices                  — schema 03
  [✅] RLS policy tenant_invoices       — schema 06 (BARU)
  [✅] tenants.subscription_plan        — schema 01
  [✅] tenants.trial_ends_at            — schema 01

PORTAL KEAMANAN (changePassword):
  [✅] staff_users.pin_hash             — schema 01
  [✅] staff_users.updated_at           — schema 01
*/
-- ==============================================================================
-- END OF MIGRATION 06
-- ==============================================================================
