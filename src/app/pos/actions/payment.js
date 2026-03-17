'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const outlet_id = cookieStore.get('active_outlet_id')?.value;
    return { tenant_id, outlet_id };
}

export async function processPayment({ orderId, cartData, paymentMethod, mixedPayments, itemsSubtotal, discountTotal, serviceChargeAmount, dppTotal, taxAmount, grandTotal, cashTendered, changeAmount, customerId, customerName }) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id || !outlet_id) return { success: false, message: 'Invalid session' };

        const cookieStore = await cookies();
        const cashier_id = cookieStore.get('session_user_id')?.value;

        let finalOrderId = orderId;
        const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;

        // 1. Jika pembayaran langsung (bukan dari Hold Bill) → Buat Order Baru
        if (!finalOrderId) {
            const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
            const { data: order, error: orderErr } = await dbAdmin
                .from('orders')
                .insert({
                    tenant_id, outlet_id, cashier_id,
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
                    is_credit: paymentMethod === 'Hutang'
                }).select('id').single();

            if (orderErr) throw orderErr;
            finalOrderId = order.id;

            // Insert items
            const orderItemsPayload = cartData.map(item => ({
                tenant_id, order_id: finalOrderId, menu_item_id: item.id,
                quantity: item.qty, unit_price: item.price, subtotal: item.price * item.qty,
                notes: item.itemNotes || item.notes || '',
                variation_label: item.variationLabels?.join(', ') || null
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

        // 4b. Auto-deduct Ingredients via Recipes
        try {
            for (const item of cartData) {
                const { data: recipeItems } = await dbAdmin
                    .from('recipes')
                    .select('ingredient_id, quantity_used')
                    .eq('menu_item_id', item.id)
                    .eq('tenant_id', tenant_id);

                if (recipeItems && recipeItems.length > 0) {
                    for (const recipe of recipeItems) {
                        const totalUsed = Number(recipe.quantity_used) * Number(item.qty);
                        // Fetch current stock
                        const { data: ing } = await dbAdmin.from('ingredients').select('current_stock').eq('id', recipe.ingredient_id).single();
                        if (ing) {
                            const newStock = Math.max(0, Number(ing.current_stock) - totalUsed);
                            await dbAdmin.from('ingredients').update({ current_stock: newStock }).eq('id', recipe.ingredient_id);
                            // Log movement
                            await dbAdmin.from('stock_movements').insert([{
                                tenant_id, outlet_id,
                                ingredient_id: recipe.ingredient_id,
                                movement_type: 'Keluar',
                                quantity: totalUsed,
                                notes: `Penjualan order ${receiptNumber}`,
                            }]);
                        }
                    }
                }
            }
        } catch (recipeErr) {
            console.error('Recipe auto-deduct error (non-fatal):', recipeErr);
        }

        // 5. Catat Transaksi Pembayaran
        if (paymentMethod === 'Campuran' && mixedPayments?.length > 0) {
            // Insert satu record per metode pembayaran
            const multiPayloads = mixedPayments
                .filter(p => parseFloat(p.amount) > 0)
                .map(p => ({
                    tenant_id, outlet_id, order_id: finalOrderId,
                    cashier_id,
                    payment_method: p.method,
                    amount_paid: parseFloat(p.amount),
                    amount_change: 0,
                    reference_number: receiptNumber,
                    status: 'Lunas'
                }));
            const { error: multiPayErr } = await dbAdmin.from('payments').insert(multiPayloads);
            if (multiPayErr) throw multiPayErr;
        } else {
            const paymentPayload = {
                tenant_id, outlet_id, order_id: finalOrderId,
                cashier_id,
                payment_method: paymentMethod,
                amount_paid: paymentMethod === 'Hutang' ? 0 : (paymentMethod === 'Tunai' ? cashTendered : grandTotal),
                amount_change: paymentMethod === 'Tunai' ? changeAmount : 0,
                reference_number: receiptNumber,
                status: paymentMethod === 'Hutang' ? 'Pending' : 'Lunas'
            };
            const { error: payErr } = await dbAdmin.from('payments').insert(paymentPayload);
            if (payErr) throw payErr;
        }

        return { success: true, receiptNumber };

    } catch (err) {
        console.error('Payment Error:', err);
        return { success: false, message: 'Gagal memproses pembayaran.' };
    }
}
