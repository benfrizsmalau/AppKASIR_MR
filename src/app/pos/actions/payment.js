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

        // ── FASE VALIDASI (sebelum ada perubahan DB apapun) ───────────────────

        // Validasi credit limit hutang sebelum mulai
        if (paymentMethod === 'Hutang' && customerId) {
            const { data: cust } = await dbAdmin
                .from('customers')
                .select('current_debt, credit_limit, name')
                .eq('id', customerId)
                .eq('tenant_id', tenant_id)
                .single();

            if (!cust) return { success: false, message: 'Data pelanggan tidak ditemukan.' };

            const creditLimit = Number(cust.credit_limit || 0);
            const currentDebt = Number(cust.current_debt || 0);
            if (creditLimit > 0 && (currentDebt + grandTotal) > creditLimit) {
                return {
                    success: false,
                    message: `Transaksi ditolak. Batas kredit ${cust.name} adalah Rp ${creditLimit.toLocaleString('id-ID')}, sisa limit Rp ${(creditLimit - currentDebt).toLocaleString('id-ID')}.`
                };
            }
        }

        // ── FASE 1: ORDER & ITEMS (paling kritis — harus berhasil) ───────────

        // 1a. Jika pembayaran langsung (bukan dari Hold Bill) → Buat Order Baru
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

            const orderItemsPayload = cartData.map(item => ({
                tenant_id, order_id: finalOrderId, menu_item_id: item.id,
                quantity: item.qty, unit_price: item.price, subtotal: item.price * item.qty,
                notes: item.itemNotes || item.notes || '',
                variation_label: item.variationLabels?.join(', ') || null
            }));

            const { error: itemsErr } = await dbAdmin.from('order_items').insert(orderItemsPayload);
            if (itemsErr) throw itemsErr;
        }

        // 1b. Jika dari Hold Bill → Update status + bebaskan meja dulu
        if (orderId) {
            const { data: existingOrder } = await dbAdmin
                .from('orders')
                .select('table_id, order_type')
                .eq('id', finalOrderId)
                .eq('tenant_id', tenant_id)
                .single();

            const { error: updErr } = await dbAdmin
                .from('orders')
                .update({
                    status: 'Selesai',
                    customer_id: customerId || null,
                    customer_name: customerName || null,
                    is_credit: paymentMethod === 'Hutang'
                })
                .eq('id', finalOrderId)
                .eq('tenant_id', tenant_id);
            if (updErr) throw updErr;

            if (existingOrder?.table_id && existingOrder?.order_type === 'Dine-In') {
                await dbAdmin.from('tables').update({ status: 'Kosong' }).eq('id', existingOrder.table_id);
            }
        }

        // ── FASE 2: PAYMENT RECORD (kritis — harus berhasil) ─────────────────

        if (paymentMethod === 'Campuran' && mixedPayments?.length > 0) {
            const multiPayloads = mixedPayments
                .filter(p => parseFloat(p.amount) > 0)
                .map(p => ({
                    tenant_id, outlet_id, order_id: finalOrderId, cashier_id,
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
                tenant_id, outlet_id, order_id: finalOrderId, cashier_id,
                payment_method: paymentMethod,
                amount_paid: paymentMethod === 'Hutang' ? 0 : (paymentMethod === 'Tunai' ? cashTendered : grandTotal),
                amount_change: paymentMethod === 'Tunai' ? changeAmount : 0,
                reference_number: receiptNumber,
                status: paymentMethod === 'Hutang' ? 'Pending' : 'Lunas'
            };
            const { error: payErr } = await dbAdmin.from('payments').insert(paymentPayload);
            if (payErr) throw payErr;
        }

        // ── FASE 3: HUTANG (kritis jika metode Hutang) ───────────────────────

        if (paymentMethod === 'Hutang' && customerId) {
            const { data: cust } = await dbAdmin
                .from('customers')
                .select('current_debt')
                .eq('id', customerId)
                .eq('tenant_id', tenant_id)
                .single();
            const newDebt = Number(cust?.current_debt || 0) + grandTotal;
            await dbAdmin.from('customers')
                .update({ current_debt: newDebt })
                .eq('id', customerId)
                .eq('tenant_id', tenant_id);
        }

        // ── FASE 4: STOK MENU (non-kritis, error tidak batalkan pembayaran) ──

        try {
            // Kumpulkan item yang pakai track_stock DAN yang punya resep
            // untuk menentukan mana yang perlu deduksi mana
            const menuIds = cartData.map(i => i.id);
            const { data: menuInfos } = await dbAdmin
                .from('menu_items')
                .select('id, track_stock, current_stock')
                .in('id', menuIds)
                .eq('tenant_id', tenant_id);

            const { data: allRecipes } = await dbAdmin
                .from('recipes')
                .select('menu_item_id, ingredient_id, quantity_used')
                .in('menu_item_id', menuIds)
                .eq('tenant_id', tenant_id);

            // Set menu_item_id yang punya resep — hindari double-deduct
            const itemsWithRecipes = new Set((allRecipes || []).map(r => r.menu_item_id));

            for (const item of cartData) {
                const menuInfo = (menuInfos || []).find(m => m.id === item.id);

                // Deduct menu stock hanya jika track_stock=true DAN tidak punya resep
                // (Jika ada resep, deduksi dilakukan via ingredients di bawah)
                if (menuInfo?.track_stock && !itemsWithRecipes.has(item.id)) {
                    const newStock = Math.max(0, Number(menuInfo.current_stock || 0) - Number(item.qty));
                    await dbAdmin.from('menu_items').update({ current_stock: newStock }).eq('id', item.id).eq('tenant_id', tenant_id);
                    await dbAdmin.from('inventory_logs').insert({
                        tenant_id, outlet_id, menu_item_id: item.id,
                        type: 'Pemakaian',
                        quantity: Number(item.qty),
                        notes: `Penjualan (${receiptNumber})`,
                        user_id: cashier_id
                    });
                }
            }

            // Deduct ingredients via recipes
            for (const recipe of (allRecipes || [])) {
                const cartItem = cartData.find(i => i.id === recipe.menu_item_id);
                if (!cartItem) continue;

                const totalUsed = Number(recipe.quantity_used) * Number(cartItem.qty);
                const { data: ing } = await dbAdmin
                    .from('ingredients')
                    .select('current_stock')
                    .eq('id', recipe.ingredient_id)
                    .eq('tenant_id', tenant_id)
                    .single();

                if (ing) {
                    const newStock = Math.max(0, Number(ing.current_stock) - totalUsed);
                    await dbAdmin.from('ingredients').update({ current_stock: newStock }).eq('id', recipe.ingredient_id).eq('tenant_id', tenant_id);
                    await dbAdmin.from('stock_movements').insert([{
                        tenant_id, outlet_id,
                        ingredient_id: recipe.ingredient_id,
                        movement_type: 'Pemakaian',
                        quantity: totalUsed,
                        notes: `Penjualan (${receiptNumber})`,
                    }]);
                }
            }
        } catch (stockErr) {
            // Stok error tidak membatalkan transaksi yang sudah tercatat
            console.error('Stock deduction error (non-fatal, payment already recorded):', stockErr);
        }

        return { success: true, receiptNumber };

    } catch (err) {
        console.error('Payment Error:', err);
        return { success: false, message: 'Gagal memproses pembayaran.' };
    }
}
