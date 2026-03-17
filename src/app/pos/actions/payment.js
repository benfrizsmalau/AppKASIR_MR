'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const outlet_id = cookieStore.get('active_outlet_id')?.value;
    return { tenant_id, outlet_id };
}

export async function processPayment({ orderId, cartData, paymentMethod, subtotal, taxAmount, grandTotal, cashTendered, changeAmount, customerId, customerName }) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id || !outlet_id) return { success: false, message: 'Invalid session' };

        const cookieStore = await cookies();
        const cashier_id = cookieStore.get('session_user_id')?.value;

        let finalOrderId = orderId;
        const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;

        // 1. Jika ini pembayaran langsung (Bukan dari Hold Bill) -> Buat Order Baru
        if (!finalOrderId) {
            const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
            const { data: order, error: orderErr } = await dbAdmin
                .from('orders')
                .insert({
                    tenant_id, outlet_id, cashier_id,
                    customer_id: customerId || null,
                    customer_name: customerName || null,
                    order_number: orderNumber,
                    order_type: 'Takeaway', // Default direct payment is takeaway/walk-in
                    subtotal,
                    dpp_total: subtotal, // Dasar Pengenaan Pajak
                    pbjt_total: taxAmount,
                    discount_total: 0,
                    grand_total: grandTotal,
                    status: 'Selesai',
                    is_credit: paymentMethod === 'Hutang'
                }).select('id').single();

            if (orderErr) throw orderErr;
            finalOrderId = order.id;

            // Insert items
            const orderItemsPayload = cartData.map(item => ({
                tenant_id, order_id: finalOrderId, menu_item_id: item.id,
                quantity: item.qty, unit_price: item.price, subtotal: item.price * item.qty
            }));

            const { error: itemsErr } = await dbAdmin.from('order_items').insert(orderItemsPayload);
            if (itemsErr) throw itemsErr;
        }

        // 2. Jika dari Hold Bill, Update status order jadi Selesai
        if (orderId) {
            const updatePayload = {
                status: 'Selesai',
                customer_id: customerId || null,
                customer_name: customerName || null,
                is_credit: paymentMethod === 'Hutang'
            };
            const { error: updErr } = await dbAdmin.from('orders').update(updatePayload).eq('id', finalOrderId);
            if (updErr) throw updErr;

            // Bebaskan meja jika order tersebut tadinya nyangkut di meja
            const { data: existingOrder } = await dbAdmin.from('orders').select('table_id, order_type').eq('id', finalOrderId).single();
            if (existingOrder && existingOrder.table_id && existingOrder.order_type === 'Dine-In') {
                await dbAdmin.from('tables').update({ status: 'Kosong' }).eq('id', existingOrder.table_id);
            }
        }

        // 3. Update Hutang Pelanggan jika menggunakan metode 'Hutang'
        if (paymentMethod === 'Hutang' && customerId) {
            // Ambil data pelanggan saat ini
            const { data: cust } = await dbAdmin.from('customers').select('current_debt').eq('id', customerId).single();
            const newDebt = Number(cust?.current_debt || 0) + grandTotal;

            await dbAdmin.from('customers').update({ current_debt: newDebt }).eq('id', customerId);
        }

        // 4. Update Stok Otomatis (Jika Track Stock diaktifkan)
        for (const item of cartData) {
            // Ambil info track_stock item
            const { data: menuInfo } = await dbAdmin.from('menu_items')
                .select('track_stock, current_stock, name')
                .eq('id', item.id)
                .single();

            if (menuInfo && menuInfo.track_stock) {
                const newStock = Number(menuInfo.current_stock || 0) - Number(item.qty);

                // Update Stok
                await dbAdmin.from('menu_items').update({ current_stock: newStock }).eq('id', item.id);

                // Log Inventory
                await dbAdmin.from('inventory_logs').insert({
                    tenant_id,
                    outlet_id,
                    menu_item_id: item.id,
                    type: 'Keluar',
                    quantity: Number(item.qty),
                    notes: `Penjualan (Order #${receiptNumber})`,
                    user_id: cashier_id
                });
            }
        }

        // 5. Catat Transaksi Pembayaran
        const paymentPayload = {
            tenant_id, outlet_id, order_id: finalOrderId,
            cashier_id: cashier_id,
            payment_method: paymentMethod, // 'Tunai', 'QRIS', 'Hutang', dll
            amount_paid: paymentMethod === 'Hutang' ? 0 : (paymentMethod === 'Tunai' ? cashTendered : grandTotal),
            amount_change: paymentMethod === 'Tunai' ? changeAmount : 0,
            reference_number: receiptNumber,
            status: paymentMethod === 'Hutang' ? 'Pending' : 'Lunas'
        };

        const { error: payErr } = await dbAdmin.from('payments').insert(paymentPayload);
        if (payErr) throw payErr;

        return { success: true, receiptNumber };

    } catch (err) {
        console.error('Payment Error:', err);
        return { success: false, message: 'Gagal memproses pembayaran.' };
    }
}
