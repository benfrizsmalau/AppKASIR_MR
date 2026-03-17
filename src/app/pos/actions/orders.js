'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { createAuditLog } from './audit';

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

export async function holdOrderSubmit({ cartData, tableId, orderType, itemsSubtotal, discountTotal, serviceChargeAmount, dppTotal, taxAmount, grandTotal, notes, customerId, customerName }) {
    try {
        const { tenant_id, outlet_id, user_id } = await getActiveContext();
        if (!tenant_id || !outlet_id || !user_id) return { success: false, message: 'Sesi Kasir tidak valid.' };

        const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

        const orderPayload = {
            tenant_id,
            outlet_id,
            cashier_id: user_id,
            table_id: tableId || null,
            customer_id: customerId || null,
            customer_name: customerName || null,
            order_number: orderNumber,
            order_type: orderType,
            subtotal: itemsSubtotal || 0,
            dpp_total: dppTotal || 0,
            pbjt_total: taxAmount || 0,
            discount_total: discountTotal || 0,
            service_charge_total: serviceChargeAmount || 0,
            grand_total: grandTotal,
            status: 'Baru',
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
            notes: item.itemNotes || item.notes || '',
            variation_label: item.variationLabels?.join(', ') || null
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

export async function cancelOrderItem(orderId, itemId, reason) {
    try {
        const { tenant_id, outlet_id, user_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Fetch the item data before cancelling (for audit)
        const { data: item, error: fetchErr } = await dbAdmin
            .from('order_items')
            .select('*, menu_items(name)')
            .eq('id', itemId)
            .eq('tenant_id', tenant_id)
            .single();

        if (fetchErr || !item) return { success: false, message: 'Item pesanan tidak ditemukan.' };

        // Mark item as cancelled
        const { error } = await dbAdmin
            .from('order_items')
            .update({ status: 'Dibatalkan', cancellation_reason: reason })
            .eq('id', itemId)
            .eq('tenant_id', tenant_id);

        if (error) throw error;

        // Audit log
        await createAuditLog({
            action: 'CANCEL_ITEM',
            entity_type: 'order_items',
            entity_id: itemId,
            old_data: { status: item.status, quantity: item.quantity },
            new_data: { status: 'Dibatalkan', cancellation_reason: reason },
            notes: `Batalkan item: ${item.menu_items?.name} (x${item.quantity}) dari order ${orderId}. Alasan: ${reason}`
        });

        // Recalculate order totals (subtract cancelled item's subtotal)
        const { data: remainingItems } = await dbAdmin
            .from('order_items')
            .select('subtotal')
            .eq('order_id', orderId)
            .eq('tenant_id', tenant_id)
            .neq('status', 'Dibatalkan');

        const newSubtotal = (remainingItems || []).reduce((sum, it) => sum + Number(it.subtotal), 0);

        await dbAdmin
            .from('orders')
            .update({ subtotal: newSubtotal, grand_total: newSubtotal })
            .eq('id', orderId)
            .eq('tenant_id', tenant_id);

        return { success: true, message: 'Item berhasil dibatalkan.' };
    } catch (err) {
        console.error('cancelOrderItem error:', err);
        return { success: false, message: 'Gagal membatalkan item.' };
    }
}

export async function cancelOrder(orderId, reason) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Fetch order to know table_id
        const { data: order, error: fetchErr } = await dbAdmin
            .from('orders')
            .select('id, order_number, table_id, status')
            .eq('id', orderId)
            .eq('tenant_id', tenant_id)
            .single();

        if (fetchErr || !order) return { success: false, message: 'Pesanan tidak ditemukan.' };
        if (order.status === 'Selesai') return { success: false, message: 'Pesanan sudah selesai, tidak bisa dibatalkan.' };

        const { error } = await dbAdmin
            .from('orders')
            .update({ status: 'Dibatalkan', notes: `[DIBATALKAN: ${reason}]` })
            .eq('id', orderId)
            .eq('tenant_id', tenant_id);

        if (error) throw error;

        // Free table if Dine-In
        if (order.table_id) {
            await dbAdmin.from('tables').update({ status: 'Kosong' }).eq('id', order.table_id).eq('tenant_id', tenant_id);
        }

        await createAuditLog({
            action: 'CANCEL_ORDER',
            entity_type: 'orders',
            entity_id: orderId,
            old_data: { status: order.status },
            new_data: { status: 'Dibatalkan' },
            notes: `Batalkan order ${order.order_number}. Alasan: ${reason}`
        });

        return { success: true, message: `Pesanan ${order.order_number} berhasil dibatalkan.` };
    } catch (err) {
        console.error('cancelOrder error:', err);
        return { success: false, message: 'Gagal membatalkan pesanan.' };
    }
}

export async function processRefund(orderId, reason) {
    try {
        const { tenant_id, outlet_id, user_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Fetch order to verify it's completed
        const { data: order, error: fetchErr } = await dbAdmin
            .from('orders')
            .select('id, order_number, grand_total, pbjt_total, subtotal, table_id, status, is_refunded')
            .eq('id', orderId)
            .eq('tenant_id', tenant_id)
            .single();

        if (fetchErr || !order) return { success: false, message: 'Pesanan tidak ditemukan.' };
        if (order.status !== 'Selesai') return { success: false, message: 'Hanya pesanan selesai yang bisa direfund.' };
        if (order.is_refunded) return { success: false, message: 'Pesanan ini sudah pernah direfund.' };

        // Mark order as refunded
        const { error } = await dbAdmin
            .from('orders')
            .update({
                is_refunded: true,
                refund_reason: reason,
                refunded_at: new Date().toISOString(),
                refunded_by: user_id,
            })
            .eq('id', orderId)
            .eq('tenant_id', tenant_id);

        if (error) throw error;

        // Audit log
        await createAuditLog({
            action: 'PROCESS_REFUND',
            entity_type: 'orders',
            entity_id: orderId,
            old_data: { status: order.status, grand_total: order.grand_total },
            new_data: { is_refunded: true, refund_reason: reason },
            notes: `Refund order ${order.order_number} (Rp ${Number(order.grand_total).toLocaleString('id-ID')}). Alasan: ${reason}`
        });

        return { success: true, message: `Refund untuk ${order.order_number} berhasil diproses.` };
    } catch (err) {
        console.error('processRefund error:', err);
        return { success: false, message: 'Gagal memproses refund.' };
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
