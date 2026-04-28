'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const outlet_id = cookieStore.get('active_outlet_id')?.value;
    return { tenant_id, outlet_id };
}

export async function getActiveOrders() {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id || !outlet_id) return { success: false, message: 'Invalid session' };

        const { data: orders, error } = await dbAdmin
            .from('orders')
            .select(`
             id, 
             order_number, 
             order_type, 
             grand_total, 
             status, 
             created_at,
             subtotal,
             dpp_total,
             pbjt_total,
             service_charge_total,
             discount_total,
             notes,
             customer_id,
             customers ( id, name, type, credit_limit, current_debt ),
             table_id,
             tables ( table_number ),
             order_items (
                 id, quantity, unit_price, subtotal, notes,
                 menu_item_id,
                 menu_items ( name )
             )
          `)
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .neq('status', 'Selesai')
            .neq('status', 'Dibatalkan')
            .order('created_at', { ascending: true }); // Terlama di atas (First in First Out)

        if (error) throw error;

        // Fetch Outlet Data
        const { data: outlet } = await dbAdmin
            .from('outlets')
            .select('name, address, phone, npwpd, pbjt_active, pbjt_rate, pbjt_mode')
            .eq('id', outlet_id)
            .single();

        return { success: true, orders, outlet };
    } catch (err) {
        console.error('Error fetching active orders:', err);
        return { success: false, message: 'Gagal mengambil data pesanan aktif.' };
    }
}
