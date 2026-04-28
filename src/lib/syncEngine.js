/**
 * Sync Engine — memproses antrian operasi offline ke server Supabase
 * Dipanggil secara otomatis ketika koneksi internet kembali.
 */
import db, { } from './db';

let isSyncing = false;

export async function processSyncQueue() {
    if (isSyncing) return { synced: 0, failed: 0 };
    isSyncing = true;

    let synced = 0;
    let failed = 0;

    try {
        const pending = await db.sync_queue
            .where('status').equals('pending')
            .sortBy('created_at');

        for (const item of pending) {
            try {
                const payload = JSON.parse(item.payload);
                let success = false;

                if (item.action === 'PROCESS_PAYMENT') {
                    success = await syncPayment(payload);
                } else if (item.action === 'HOLD_ORDER') {
                    success = await syncHoldOrder(payload);
                }

                if (success) {
                    await db.sync_queue.update(item.id, { status: 'done', synced_at: new Date().toISOString() });
                    await db.orders.update(payload.localOrderId || payload.orderId, { synced: 1 });
                    synced++;
                } else {
                    await db.sync_queue.update(item.id, { status: 'failed', error: 'Server returned failure' });
                    failed++;
                }
            } catch (err) {
                console.error(`Sync failed for queue item ${item.id}:`, err);
                await db.sync_queue.update(item.id, { status: 'failed', error: err.message });
                failed++;
            }
        }
    } finally {
        isSyncing = false;
    }

    return { synced, failed };
}

async function syncPayment(payload) {
    try {
        // Dynamic import agar tidak di-bundle sisi server
        const { processPayment } = await import('@/app/pos/actions/payment');
        const result = await processPayment({
            orderId: null, // Selalu buat order baru di server untuk offline orders
            cartData: payload.cartData,
            paymentMethod: payload.paymentMethod,
            mixedPayments: payload.mixedPayments,
            itemsSubtotal: payload.itemsSubtotal,
            discountTotal: payload.discountTotal,
            serviceChargeAmount: payload.serviceChargeAmount,
            dppTotal: payload.dppTotal,
            taxAmount: payload.taxAmount,
            grandTotal: payload.grandTotal,
            cashTendered: payload.cashTendered,
            changeAmount: payload.changeAmount,
            customerId: payload.customerId,
            customerName: payload.customerName,
        });
        return result.success;
    } catch (err) {
        console.error('syncPayment error:', err);
        return false;
    }
}

async function syncHoldOrder(payload) {
    try {
        // Jika order sudah dibayar secara offline, tidak perlu sync hold order
        // (akan di-sync oleh PROCESS_PAYMENT)
        const order = await db.orders.get(payload.orderId);
        if (order && order.status === 'Selesai') return true;

        const { holdOrderSubmit } = await import('@/app/pos/actions/orders');
        const result = await holdOrderSubmit({
            cartData: payload.cartData,
            tableId: payload.tableId,
            orderType: payload.orderType,
            itemsSubtotal: payload.itemsSubtotal,
            discountTotal: payload.discountTotal,
            serviceChargeAmount: payload.serviceChargeAmount,
            dppTotal: payload.dppTotal,
            taxAmount: payload.taxAmount,
            grandTotal: payload.grandTotal,
            notes: payload.notes,
            customerId: payload.customerId,
            customerName: payload.customerName,
        });
        return result.success;
    } catch (err) {
        console.error('syncHoldOrder error:', err);
        return false;
    }
}

export async function getPendingCount() {
    return await db.sync_queue.where('status').equals('pending').count();
}
