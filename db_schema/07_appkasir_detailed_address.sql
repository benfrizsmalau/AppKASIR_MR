-- ==============================================================================
-- APP KASIR POS ADV - DATABASE SCHEMA v1.7
-- Target Database: PostgreSQL (Supabase)
-- Requires: 01 → 02 → 03 → 04 → 05 → 06 dijalankan terlebih dahulu
-- ==============================================================================
-- Penambahan detail alamat lengkap pada tabel outlets
-- ==============================================================================

ALTER TABLE public.outlets
ADD COLUMN IF NOT EXISTS village VARCHAR(255),        -- Kelurahan
ADD COLUMN IF NOT EXISTS district VARCHAR(255),       -- Kecamatan
ADD COLUMN IF NOT EXISTS regency VARCHAR(255),        -- Kabupaten / Kota
ADD COLUMN IF NOT EXISTS province VARCHAR(255),       -- Provinsi
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);      -- Kode Pos

-- Update komentar kolom
COMMENT ON COLUMN public.outlets.address IS 'Alamat Jalan / Detail Lokasi';
COMMENT ON COLUMN public.outlets.village IS 'Detail Kelurahan / Desa';
COMMENT ON COLUMN public.outlets.district IS 'Detail Kecamatan';
COMMENT ON COLUMN public.outlets.regency IS 'Detail Kabupaten atau Kota Madya';
COMMENT ON COLUMN public.outlets.province IS 'Detail Provinsi';
COMMENT ON COLUMN public.outlets.postal_code IS 'Kode Pos Wilayah';

-- ==============================================================================
-- END OF MIGRATION 07
-- ==============================================================================
