require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // Gunakan admin key untuk bypass RLS
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function seed() {
    console.log('🌱 Memulai proses seeding data...');

    try {
        // 1. Buat Tenant Demo
        const { data: tenant, error: tenantErr } = await supabase
            .from('tenants')
            .insert({
                name: 'Demo AppKasir Tenant',
                subdomain: 'demo',
                status: 'Aktif',
            })
            .select()
            .single();

        if (tenantErr) throw tenantErr;
        console.log('✅ Tenant berhasil dibuat (Tenant ID:', tenant.id, ')');

        // 2. Buat Outlet Demo
        const { data: outlet, error: outletErr } = await supabase
            .from('outlets')
            .insert({
                tenant_id: tenant.id,
                name: 'Cabang Utama Jakarta',
                address: 'Jl. Sudirman No. 1, Jakarta Pusat',
                pbjt_active: true,
                pbjt_rate: 10,
                pbjt_mode: 'Eksklusif'
            })
            .select()
            .single();

        if (outletErr) throw outletErr;
        console.log('✅ Outlet berhasil dibuat (Outlet ID:', outlet.id, ')');

        // 3. Buat Pengguna (Manajer & Kasir)
        const pinKasir = '123456';
        const pinManajer = '654321';

        // Hash PIN
        const hashKasir = bcrypt.hashSync(pinKasir, 10);
        const hashManajer = bcrypt.hashSync(pinManajer, 10);

        const { data: users, error: userErr } = await supabase
            .from('staff_users')
            .insert([
                {
                    tenant_id: tenant.id,
                    outlet_id: outlet.id,
                    full_name: 'Budi (Kasir 1)',
                    role: 'Kasir',
                    pin_hash: hashKasir
                },
                {
                    tenant_id: tenant.id,
                    outlet_id: outlet.id,
                    full_name: 'Siti (Manajer)',
                    role: 'Manajer',
                    pin_hash: hashManajer
                }
            ])
            .select();

        if (userErr) throw userErr;
        console.log('✅ User Kasir (PIN: 123456) & Manajer (PIN: 654321) berhasil dibuat.');

        // 4. Buat Kategori Menu
        const { data: cats, error: catErr } = await supabase
            .from('categories')
            .insert([
                { tenant_id: tenant.id, name: 'Makanan Utama', sequence_order: 1 },
                { tenant_id: tenant.id, name: 'Minuman', sequence_order: 2 }
            ])
            .select();

        if (catErr) throw catErr;

        // 5. Buat Item Menu
        const { data: menus, error: menuErr } = await supabase
            .from('menu_items')
            .insert([
                { tenant_id: tenant.id, category_id: cats[0].id, name: 'Nasi Goreng Spesial', price: 35000 },
                { tenant_id: tenant.id, category_id: cats[0].id, name: 'Mie Goreng Seafood', price: 40000 },
                { tenant_id: tenant.id, category_id: cats[1].id, name: 'Es Teh Manis', price: 10000 },
                { tenant_id: tenant.id, category_id: cats[1].id, name: 'Kopi Susu Aren', price: 25000 }
            ])
            .select();

        if (menuErr) throw menuErr;
        console.log('✅', menus.length, 'Item Menu berhasil dibuat.');

        // 6. Buat Meja
        const { error: mejaErr } = await supabase
            .from('tables')
            .insert([
                { tenant_id: tenant.id, outlet_id: outlet.id, table_number: '1', capacity: 2 },
                { tenant_id: tenant.id, outlet_id: outlet.id, table_number: '2', capacity: 4 },
                { tenant_id: tenant.id, outlet_id: outlet.id, table_number: '3', capacity: 4 },
                { tenant_id: tenant.id, outlet_id: outlet.id, table_number: '4', capacity: 6 }
            ]);

        if (mejaErr) throw mejaErr;
        console.log('✅ 4 Meja Kosong berhasil dibuat.');

        console.log('\n🎉 Proses seeding SUKSES! Aplikasi siap digunakan dengan data percobaan.');

    } catch (error) {
        console.error('❌ Terjadi kesalahan saat seeding:', error);
    }
}

seed();
