'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Helper function to get current active tenant and outlet from cookies
async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const outlet_id = cookieStore.get('active_outlet_id')?.value;

    return { tenant_id, outlet_id };
}

export async function getPOSData() {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();

        if (!tenant_id || !outlet_id) {
            return { success: false, message: 'Sesi Kasir tidak valid.' };
        }

        // 1. Fetch Categories
        const { data: categories, error: catErr } = await dbAdmin
            .from('categories')
            .select('id, name')
            .eq('tenant_id', tenant_id)
            .order('sequence_order');

        if (catErr) throw catErr;

        // 2. Fetch Menu Items (With Joins to Category)
        const { data: menuItems, error: menuErr } = await dbAdmin
            .from('menu_items')
            .select('id, name, price, status, image_url, category_id, categories(name)')
            .eq('tenant_id', tenant_id)
            .neq('status', 'Nonaktif');

        if (menuErr) throw menuErr;

        // Format menu items to match UI expectations
        const formattedMenu = menuItems.map(item => ({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            status: item.status,
            image_url: item.image_url,
            category: item.categories?.name || 'Lainnya'
        }));

        // 3. Fetch Outlet Data (For Tax Rules & Print Header)
        const { data: outlet, error: outletErr } = await dbAdmin
            .from('outlets')
            .select('name, address, phone, npwpd, pbjt_active, pbjt_rate, pbjt_mode')
            .eq('id', outlet_id)
            .single();

        if (outletErr) throw outletErr;

        // 4. Fetch Customers (For selection)
        const { data: customers, error: custErr } = await dbAdmin
            .from('customers')
            .select('id, name, type, credit_limit, current_debt')
            .eq('tenant_id', tenant_id)
            .eq('is_active', true)
            .order('name');

        if (custErr) throw custErr;

        // 5. Fetch Active User Details
        const cookieStore = await cookies();
        const user_id = cookieStore.get('session_user_id')?.value;
        let userName = 'Kasir';

        if (user_id) {
            const { data: user } = await dbAdmin.from('staff_users').select('full_name, role').eq('id', user_id).single();
            if (user) userName = `${user.full_name} (${user.role})`;
        }

        // Extract category names array starting with 'Semua'
        const categoryNames = ['Semua', ...categories.map(c => c.name)];

        return {
            success: true,
            categories: categoryNames,
            menuItems: formattedMenu,
            customers: customers || [],
            outletData: {
                name: outlet.name,
                address: outlet.address,
                phone: outlet.phone,
                npwpd: outlet.npwpd,
                pbjtActive: outlet.pbjt_active,
                pbjtRate: Number(outlet.pbjt_rate) / 100, // convert 10 to 0.1
                pbjtMode: outlet.pbjt_mode
            },
            userName: userName
        };

    } catch (err) {
        console.error('Error fetching POS Data:', err);
        return { success: false, message: 'Gagal mengambil data dari server.' };
    }
}
