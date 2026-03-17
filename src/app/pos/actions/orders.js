'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Helper function to get current active context
async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const outlet_id = cookieStore.get('active_outlet_id')?.value;
    const user_id = cookieStore.get('session_user_id')?.value;

    return { tenant_id, outlet_id, user_id };
}

export async function getTablesData() {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id || !outlet_id) return { success: false, message: 'Invalid session' };

        const { data: tables, error } = await dbAdmin
            .from('tables')
            .select('id, table_number, status, capacity')
            .eq('outlet_id', outlet_id)
            .order('table_number');

        if (error) throw error;
        return { success: true, tables };
    } catch (err) {
        console.error('Error fetching tables:', err);
        return { success: false, message: 'Gagal mengambil data meja.' };
    }
}

export async function holdOrderSubmit({ cartData, tableId, orderType, subtotal, taxAmount, grandTotal, notes, customerId, customerName }) {
    try {
        const { tenant_id, outlet_id, user_id } = await getActiveContext();
        if (!tenant_id || !outlet_id || !user_id) return { success: false, message: 'Sesi Kasir tidak valid.' };

        // 1. Generate Order Number (Simple logic for MVP: #ORD-TIMESTAMP)
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

        // 2. Insert into Orders Table
        const orderPayload = {
            tenant_id,
            outlet_id,
            cashier_id: user_id,
            table_id: tableId || null,
            customer_id: customerId || null,
            customer_name: customerName || null,
            order_number: orderNumber,
            order_type: orderType, // 'Dine-In', 'Takeaway', 'Delivery'
            subtotal,
            dpp_total: subtotal,
            pbjt_total: taxAmount,
            discount_total: 0,
            grand_total: grandTotal,
            status: 'Baru', // Match ENUM: 'Baru', 'Dikirim ke Dapur', etc.
            notes
        };

        const { data: order, error: orderErr } = await dbAdmin
            .from('orders')
            .insert(orderPayload)
            .select('id, order_number')
            .single();

        if (orderErr) throw orderErr;

        // 3. Prepare Order Items
        const orderItemsPayload = cartData.map(item => ({
            tenant_id,
            order_id: order.id,
            menu_item_id: item.id,
            quantity: item.qty,
            unit_price: item.price,
            subtotal: item.price * item.qty,
            notes: item.notes || ''
        }));

        // 4. Insert Order Items
        const { error: itemsErr } = await dbAdmin
            .from('order_items')
            .insert(orderItemsPayload);

        if (itemsErr) throw itemsErr;

        // 5. Update Table Status to 'Terisi' if it's Dine-In
        if (tableId && orderType === 'Dine-In') {
            await dbAdmin.from('tables').update({ status: 'Terisi' }).eq('id', tableId);
        }

        return { success: true, orderId: order.id, orderNumber: order.order_number };

    } catch (err) {
        console.error('Error holding order:', err);
        return { success: false, message: 'Gagal menyimpan pesanan (Hold).' };
    }
}

export async function updateOrderStatus(orderId, status) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { error } = await dbAdmin
            .from('orders')
            .update({ status })
            .eq('id', orderId)
            .eq('tenant_id', tenant_id);

        if (error) throw error;
        return { success: true, message: `Status pesanan diperbarui menjadi ${status}` };
    } catch (err) {
        console.error('Error updating order status:', err);
        return { success: false, message: 'Gagal memperbarui status pesanan.' };
    }
}
