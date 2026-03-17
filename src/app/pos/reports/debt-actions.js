'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '../actions/audit';

async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const outlet_id = cookieStore.get('active_outlet_id')?.value;
    const user_id = cookieStore.get('session_user_id')?.value;

    return { tenant_id, outlet_id, user_id };
}

export async function processDebtPayment({ customer_id, amount, payment_method, reference_number, notes }) {
    try {
        const { tenant_id, outlet_id, user_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // 1. Record the payment
        const { data: payment, error: payErr } = await dbAdmin
            .from('debt_payments')
            .insert([{
                tenant_id,
                outlet_id,
                customer_id,
                amount_paid: amount,
                payment_method,
                reference_number,
                notes,
                cashier_id: user_id
            }])
            .select()
            .single();

        if (payErr) throw payErr;

        // 2. Update customer current_debt
        const { data: customer } = await dbAdmin.from('customers').select('current_debt, name').eq('id', customer_id).single();
        const newDebt = Number(customer.current_debt || 0) - Number(amount);

        const { error: custErr } = await dbAdmin
            .from('customers')
            .update({ current_debt: newDebt })
            .eq('id', customer_id);

        if (custErr) throw custErr;

        // 3. Mark corresponding payment records as Lunas (FIFO approach) for THIS CUSTOMER
        // This helps the "Riwayat Transaksi" status to change correctly.
        let remainingAmount = Number(amount);

        // Fetch all credit order IDs for this customer
        const { data: customerOrders } = await dbAdmin
            .from('orders')
            .select('id')
            .eq('customer_id', customer_id)
            .eq('tenant_id', tenant_id);

        const orderIds = customerOrders?.map(o => o.id) || [];

        if (orderIds.length > 0) {
            // HEALING: Check for orders that are credit but have NO payment records
            for (const orderId of orderIds) {
                const { data: existingPay } = await dbAdmin
                    .from('payments')
                    .select('id')
                    .eq('order_id', orderId)
                    .maybeSingle();

                if (!existingPay) {
                    console.log(`Healing: Creating missing payment record for Order ${orderId}`);
                    const { data: ord } = await dbAdmin.from('orders').select('grand_total, outlet_id').eq('id', orderId).single();
                    await dbAdmin.from('payments').insert([{
                        tenant_id,
                        outlet_id: ord.outlet_id,
                        order_id: orderId,
                        payment_method: 'Hutang',
                        amount_paid: 0,
                        status: 'Pending'
                    }]);
                }
            }

            // Fetch pending payments specifically for this customer's orders
            const { data: pendingPayments, error: fetchErr } = await dbAdmin
                .from('payments')
                .select(`
                    id, 
                    amount_paid, 
                    order_id,
                    orders (grand_total, order_number)
                `)
                .in('order_id', orderIds)
                .eq('payment_method', 'Hutang')
                .eq('status', 'Pending')
                .order('created_at', { ascending: true });

            if (fetchErr) console.error('Error fetching pending payments:', fetchErr);

            if (pendingPayments && pendingPayments.length > 0) {
                for (const p of pendingPayments) {
                    if (remainingAmount <= 0) break;

                    const orderTotal = Number(p.orders?.grand_total || 0);

                    if (remainingAmount >= orderTotal) {
                        const { error: updErr } = await dbAdmin.from('payments').update({
                            status: 'Lunas',
                            amount_paid: orderTotal
                        }).eq('id', p.id);

                        if (updErr) console.error(`Error updating payment ${p.id}:`, updErr);
                        else remainingAmount -= orderTotal;
                    } else if (remainingAmount > 0) {
                        // Partial payment: update amount_paid but keep status 'Pending'
                        const { error: updErr } = await dbAdmin.from('payments').update({
                            amount_paid: Number(p.amount_paid || 0) + remainingAmount
                        }).eq('id', p.id);

                        if (updErr) console.error(`Error partial updating payment ${p.id}:`, updErr);
                        else remainingAmount = 0;
                    }
                }
            }
        }

        // 4. Audit Log
        await createAuditLog({
            action: 'DEBT_PAYMENT',
            entity_type: 'customers',
            entity_id: customer_id,
            new_data: { amount, payment_id: payment.id },
            notes: `Debt payment of Rp ${amount.toLocaleString('id-ID')} for ${customer.name}`
        });

        revalidatePath('/pos/reports');
        revalidatePath('/pos/history');
        revalidatePath('/pos/customers');
        return { success: true, message: 'Pembayaran piutang berhasil dicatat.' };

    } catch (err) {
        console.error('Error processing debt payment:', err);
        return { success: false, message: 'Gagal mencatat pembayaran.' };
    }
}
