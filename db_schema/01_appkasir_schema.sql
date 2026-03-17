-- ==============================================================================
-- APP KASIR POS ADV - DATABASE SCHEMA
-- Target Database: PostgreSQL (Supabase)
-- Architecture   : Multi-tenant (Single Schema, Shared Database)
-- Security       : Row-Level Security (RLS) enabled for tenant isolation
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
CREATE TYPE subscription_tier AS ENUM ('Starter', 'Pro', 'Enterprise');
CREATE TYPE subscription_status AS ENUM ('Aktif', 'Suspend', 'Trial', 'Nonaktif');
CREATE TYPE user_role AS ENUM ('Admin', 'Manajer', 'Kasir', 'Pramusaji');
CREATE TYPE order_status AS ENUM ('Baru', 'Dikirim ke Dapur', 'Sebagian Siap', 'Siap Saji', 'Disajikan', 'Menunggu Bayar', 'Selesai', 'Dibatalkan');
CREATE TYPE payment_method AS ENUM ('Tunai', 'QRIS', 'Debit/Kredit', 'Transfer Bank', 'E-Wallet', 'Voucher', 'Campuran');
CREATE TYPE table_status AS ENUM ('Kosong', 'Terisi', 'Tagihan', 'Tidak Aktif', 'Reserved');
CREATE TYPE pbjt_mode AS ENUM ('Inklusif', 'Eksklusif');

-- ==============================================================================
-- CORE TABLES (TENANT & USERS)
-- ==============================================================================

-- 3. TENANTS (Usaha/Bisnis yang berlangganan SaaS)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    subscription_plan subscription_tier DEFAULT 'Starter',
    status subscription_status DEFAULT 'Trial',
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. OUTLETS (Setiap tenant bisa memiliki lebih dari satu outlet)
CREATE TABLE public.outlets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    npwpd VARCHAR(50), -- NPWPD Pajak Daerah
    nib VARCHAR(50),
    logo_url TEXT,
    pbjt_active BOOLEAN DEFAULT false,
    pbjt_rate DECIMAL(5,2) DEFAULT 10.00,
    pbjt_mode pbjt_mode DEFAULT 'Eksklusif',
    service_charge_active BOOLEAN DEFAULT false,
    service_charge_rate DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. USERS (Karyawan/Staff)
CREATE TABLE public.staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES public.outlets(id), -- Jika null, berarti akses semua outlet (Admin Tenant)
    auth_id UUID UNIQUE, -- Terhubung dengan auth.users Supabase jika login via email/pwd (Admin/Manajer)
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    pin_hash VARCHAR(255), -- Berisi bcrypt hash untuk PIN Kasir (bukan plain text)
    email VARCHAR(255), -- Opsional untuk kasir, Wajib untuk admin
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- MASTER DATA (MENU & MEJA)
-- ==============================================================================

-- 6. MENU CATEGORIES
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    sequence_order INTEGER DEFAULT 0,
    is_pbjt_exempt BOOLEAN DEFAULT false, -- Apakah kategori ini dikecualikan dari pajak
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. MENU ITEMS
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15,2) NOT NULL,
    cost_price DECIMAL(15,2) DEFAULT 0,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'Tersedia' CHECK (status IN ('Tersedia', 'Habis', 'Nonaktif')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. MENU VARIATIONS / MODIFIERS
CREATE TABLE public.menu_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "Ukuran", "Level Pedas"
    options JSONB NOT NULL, -- Format: [{"name": "Small", "add_price": 0}, {"name": "Large", "add_price": 5000}]
    is_required BOOLEAN DEFAULT false
);

-- 9. TABLES (MEJA)
CREATE TABLE public.tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    area_name VARCHAR(100) DEFAULT 'Utama',
    capacity INTEGER DEFAULT 2,
    status table_status DEFAULT 'Kosong',
    pos_x INTEGER DEFAULT 0, -- Untuk visual mapper UI
    pos_y INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(outlet_id, table_number)
);

-- ==============================================================================
-- TRANSACTIONS (ORDERS & PAYMENTS)
-- ==============================================================================

-- 10. ORDERS (Pesanan)
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES public.staff_users(id),
    table_id UUID REFERENCES public.tables(id),
    order_number VARCHAR(50) NOT NULL,
    status order_status DEFAULT 'Baru',
    order_type VARCHAR(20) DEFAULT 'Dine-In' CHECK (order_type IN ('Dine-In', 'Takeaway', 'Delivery')),
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_total DECIMAL(15,2) DEFAULT 0,
    service_charge_total DECIMAL(15,2) DEFAULT 0,
    dpp_total DECIMAL(15,2) DEFAULT 0, -- Dasar Pengenaan Pajak
    pbjt_total DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) DEFAULT 0,
    customer_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ORDER ITEMS (Detail Pesanan per Menu)
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    selected_variations JSONB, -- Simpan snapshot variasi
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Baru' CHECK (status IN ('Baru', 'Dikirim', 'Dimasak', 'Siap', 'Selesai', 'Batal')),
    subtotal DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. PAYMENTS
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES public.staff_users(id),
    payment_method payment_method NOT NULL,
    amount_paid DECIMAL(15,2) NOT NULL,
    amount_change DECIMAL(15,2) DEFAULT 0,
    reference_number VARCHAR(100), -- Untuk QRIS / Transfer / EDC
    status VARCHAR(20) DEFAULT 'Lunas' CHECK (status IN ('Pending', 'Lunas', 'Gagal', 'Refund')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==============================================================================
-- ENABLE ROW-LEVEL SECURITY (RLS) FOR MULTI-TENANCY
-- ==============================================================================
-- Semua tabel utama wajib mengaktifkan RLS agar AppKasir aman

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Di dunia nyata, policy RLS akan memeriksa token JWT (`auth.jwt()->>'tenant_id'`).
-- Contoh kebijakan umum untuk User/Tablet (Kasir): Kasir hanya bisa membaca/menulis data yang tenant_id-nya miliknya.
