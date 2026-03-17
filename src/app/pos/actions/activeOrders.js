'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

async function getActiveContext() {
    const cookieStore = await cookies();
    const outlet_id = cookieStore.get('active_outlet_id')?.value;
    return { outlet_id };
}

export async function getActiveOrders() {
    try {
        const { outlet_id } = await getActiveContext();
        if (!outlet_id) return { success: false, message: 'Invalid session' };

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
             pbjt_total,
             notes,
             table_id,
             tables ( table_number ),
             order_items (
                 id, quantity, unit_price, subtotal, notes,
                 menu_item_id,
                 menu_items ( name )
             )
          `)
            .eq('outlet_id', outlet_id)
            .neq('status', 'Selesai')
            .neq('status', 'Dibatalkan')
            .order('created_at', { ascending: true }); // Terlama di atas (First in First Out)

        if (error) throw error;

        return { success: true, orders };
    } catch (err) {
        console.error('Error fetching active orders:', err);
        return { success: false, message: 'Gagal mengambil data pesanan aktif.' };
    }
}
