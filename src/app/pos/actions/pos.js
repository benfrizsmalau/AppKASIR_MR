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

        // 2b. Fetch Variations for all menu items
        const menuItemIds = menuItems.map(m => m.id);
        let variationsMap = {};
        if (menuItemIds.length > 0) {
            const { data: variations } = await dbAdmin
                .from('menu_variations')
                .select('*')
                .in('menu_item_id', menuItemIds);
            if (variations) {
                variations.forEach(v => {
                    if (!variationsMap[v.menu_item_id]) variationsMap[v.menu_item_id] = [];
                    variationsMap[v.menu_item_id].push(v);
                });
            }
        }

        // Format menu items to match UI expectations
        const formattedMenu = menuItems.map(item => ({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            status: item.status,
            image_url: item.image_url,
            category: item.categories?.name || 'Lainnya',
            variations: variationsMap[item.id] || []
        }));

        // 3. Fetch Outlet Data (For Tax Rules & Print Header)
        const { data: outlet, error: outletErr } = await dbAdmin
            .from('outlets')
            .select('name, address, village, district, regency, province, postal_code, phone, email, npwpd, pbjt_active, pbjt_rate, pbjt_mode, service_charge_active, service_charge_rate')
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

        // Profile completeness check
        const REQUIRED_FIELDS = ['name', 'address', 'regency', 'province', 'phone', 'email', 'npwpd'];
        const profileComplete = REQUIRED_FIELDS.every(f => outlet?.[f] && String(outlet[f]).trim().length > 0);
        const missingFields = REQUIRED_FIELDS.filter(f => !outlet?.[f] || String(outlet[f]).trim().length === 0);

        return {
            success: true,
            categories: categoryNames,
            menuItems: formattedMenu,
            customers: customers || [],
            outletData: {
                name: outlet.name,
                address: outlet.address,
                village: outlet.village,
                district: outlet.district,
                regency: outlet.regency,
                province: outlet.province,
                postalCode: outlet.postal_code,
                phone: outlet.phone,
                npwpd: outlet.npwpd,
                pbjtActive: outlet.pbjt_active,
                pbjtRate: Number(outlet.pbjt_rate) / 100,
                pbjtMode: outlet.pbjt_mode,
                serviceChargeActive: outlet.service_charge_active || false,
                serviceChargeRate: Number(outlet.service_charge_rate || 0) / 100
            },
            profileComplete,
            missingFields,
            userName: userName
        };

    } catch (err) {
        console.error('Error fetching POS Data:', err);
        return { success: false, message: 'Gagal mengambil data dari server.' };
    }
}
