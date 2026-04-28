/**
 * Operasi POS Offline
 * Semua fungsi di sini adalah versi client-side (IndexedDB) dari server actions.
 * Dipanggil ketika tidak ada koneksi internet.
 */
import db from './db';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function localId() {
    return `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function receiptNumber() {
    return `RCP-${Date.now().toString().slice(-6)}`;
}

async function getSession() {
    return await db.session.get('current');
}

// ─── Cache POS Data (dipanggil saat online, agar tersedia offline) ────────────

export async function cachePOSData({ session, outletData, menuItems, categories, customers, tables }) {
    await db.transaction('rw', db.session, db.outlet, db.categories, db.menu_items, db.customers, db.tables, async () => {
        // Session
        await db.session.put({ id: 'current', ...session });

        // Outlet
        await db.outlet.put({ id: 'current', ...outletData });

        // Categories
        await db.categories.clear();
        await db.categories.bulkPut(categories);

        // Menu Items
        await db.menu_items.clear();
        await db.menu_items.bulkPut(menuItems);

        // Customers
        await db.customers.clear();
        await db.customers.bulkPut(customers);

        // Tables (jika ada)
        if (tables && tables.length > 0) {
            await db.tables.bulkPut(tables);
        }
    });
}

export async function cacheTables(tables) {
    if (!tables || tables.length === 0) return;
    await db.tables.bulkPut(tables);
}

// ─── Baca Data dari Cache ─────────────────────────────────────────────────────

export async function getOfflinePOSData() {
    const session = await db.session.get('current');
    const outlet = await db.outlet.get('current');
    const categories = await db.categories.toArray();
    const menuItems = await db.menu_items.where('status').notEqual('Nonaktif').toArray();
    const customers = await db.customers.toArray();

    if (!session || !outlet) return null;

    return { session, outletData: outlet, categories, menuItems, customers };
}

export async function getOfflineTables() {
    const session = await db.session.get('current');
    if (!session) return [];
    return await db.tables.where('outlet_id').equals(session.outlet_id).toArray();
}

// ─── Order Offline (Hold) ─────────────────────────────────────────────────────

export async function offlineHoldOrder({
    cartData, tableId, orderType, itemsSubtotal,
    discountTotal, serviceChargeAmount, dppTotal,
    taxAmount, grandTotal, notes, customerId, customerName
}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Sesi tidak ditemukan di cache.' };

    const orderId = localId();
    const orderNumber = `ORD-OFF-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const now = new Date().toISOString();

    // Simpan order ke IndexedDB
    await db.orders.put({
        id: orderId,
        tenant_id: session.tenant_id,
        outlet_id: session.outlet_id,
        cashier_id: session.user_id,
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
        notes: notes || '',
        status: 'Baru',
        synced: 0,
        created_at: now,
    });

    // Simpan order items
    const items = cartData.map(item => ({
        id: localId(),
        order_id: orderId,
        tenant_id: session.tenant_id,
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
        subtotal: item.price * item.qty,
        notes: item.itemNotes || item.notes || '',
        variation_label: item.variationLabels?.join(', ') || null,
        status: 'Baru',
    }));
    await db.order_items.bulkPut(items);

    // Update status meja jika Dine-In
    if (tableId && orderType === 'Dine-In') {
        await db.tables.update(tableId, { status: 'Terisi' });
    }

    // Tambah ke sync_queue
    await db.sync_queue.add({
        action: 'HOLD_ORDER',
        payload: JSON.stringify({ orderId, cartData, tableId, orderType, itemsSubtotal, discountTotal, serviceChargeAmount, dppTotal, taxAmount, grandTotal, notes, customerId, customerName }),
        local_order_id: orderId,
        status: 'pending',
        created_at: now,
    });

    return { success: true, orderId, orderNumber, isOffline: true };
}

// ─── Pembayaran Offline ───────────────────────────────────────────────────────

export async function offlineProcessPayment({
    orderId, cartData, paymentMethod, mixedPayments,
    itemsSubtotal, discountTotal, serviceChargeAmount,
    dppTotal, taxAmount, grandTotal, cashTendered,
    changeAmount, customerId, customerName
}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Sesi tidak ditemukan di cache.' };

    const receiptNum = receiptNumber();
    const now = new Date().toISOString();
    let finalOrderId = orderId;

    // Jika tidak ada orderId (pembayaran langsung tanpa hold)
    if (!finalOrderId) {
        finalOrderId = localId();
        const orderNumber = `ORD-OFF-${Date.now().toString(36).toUpperCase().slice(-6)}`;

        await db.orders.put({
            id: finalOrderId,
            tenant_id: session.tenant_id,
            outlet_id: session.outlet_id,
            cashier_id: session.user_id,
            customer_id: customerId || null,
            customer_name: customerName || null,
            order_number: orderNumber,
            order_type: 'Takeaway',
            subtotal: itemsSubtotal || grandTotal,
            dpp_total: dppTotal || grandTotal,
            pbjt_total: taxAmount || 0,
            discount_total: discountTotal || 0,
            service_charge_total: serviceChargeAmount || 0,
            grand_total: grandTotal,
            status: 'Selesai',
            is_credit: paymentMethod === 'Hutang',
            synced: 0,
            created_at: now,
        });

        const items = cartData.map(item => ({
            id: localId(),
            order_id: finalOrderId,
            tenant_id: session.tenant_id,
            menu_item_id: item.id,
            menu_item_name: item.name,
            quantity: item.qty,
            unit_price: item.price,
            subtotal: item.price * item.qty,
            notes: item.itemNotes || item.notes || '',
            variation_label: item.variationLabels?.join(', ') || null,
        }));
        await db.order_items.bulkPut(items);
    } else {
        // Update order yang sudah ada (Hold → Selesai)
        await db.orders.update(finalOrderId, {
            status: 'Selesai',
            customer_id: customerId || null,
            customer_name: customerName || null,
            is_credit: paymentMethod === 'Hutang',
        });

        // Bebaskan meja
        const order = await db.orders.get(finalOrderId);
        if (order?.table_id && order?.order_type === 'Dine-In') {
            await db.tables.update(order.table_id, { status: 'Kosong' });
        }
    }

    // Simpan pembayaran
    const paymentId = localId();
    await db.payments.put({
        id: paymentId,
        order_id: finalOrderId,
        tenant_id: session.tenant_id,
        outlet_id: session.outlet_id,
        cashier_id: session.user_id,
        payment_method: paymentMethod,
        mixed_payments: mixedPayments ? JSON.stringify(mixedPayments) : null,
        amount_paid: paymentMethod === 'Hutang' ? 0 : (paymentMethod === 'Tunai' ? cashTendered : grandTotal),
        amount_change: paymentMethod === 'Tunai' ? changeAmount : 0,
        grand_total: grandTotal,
        reference_number: receiptNum,
        status: paymentMethod === 'Hutang' ? 'Pending' : 'Lunas',
        synced: 0,
        created_at: now,
    });

    // Update hutang pelanggan secara lokal
    if (paymentMethod === 'Hutang' && customerId) {
        const customer = await db.customers.get(customerId);
        if (customer) {
            const newDebt = Number(customer.current_debt || 0) + grandTotal;
            await db.customers.update(customerId, { current_debt: newDebt });
        }
    }

    // Tambah ke sync_queue (data lengkap untuk replay ke server)
    await db.sync_queue.add({
        action: 'PROCESS_PAYMENT',
        payload: JSON.stringify({
            orderId: orderId || null, // null jika order baru
            localOrderId: finalOrderId,
            cartData, paymentMethod, mixedPayments,
            itemsSubtotal, discountTotal, serviceChargeAmount,
            dppTotal, taxAmount, grandTotal, cashTendered,
            changeAmount, customerId, customerName,
        }),
        local_order_id: finalOrderId,
        status: 'pending',
        created_at: now,
    });

    return { success: true, receiptNumber: receiptNum, isOffline: true };
}

// ─── Laporan dari Cache Lokal ─────────────────────────────────────────────────

export async function getOfflineOrders({ startDate, endDate } = {}) {
    let orders = await db.orders.where('status').equals('Selesai').toArray();

    if (startDate) {
        orders = orders.filter(o => o.created_at >= startDate);
    }
    if (endDate) {
        orders = orders.filter(o => o.created_at <= endDate);
    }

    return orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function countPendingSync() {
    return await db.sync_queue.where('status').equals('pending').count();
}
