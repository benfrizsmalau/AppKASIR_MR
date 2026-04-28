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

        // 2. Update customer current_debt dengan filter tenant_id untuk keamanan
        // Gunakan pola read-then-update dengan validasi untuk meminimalkan race condition
        const { data: customer, error: custFetchErr } = await dbAdmin
            .from('customers')
            .select('current_debt, name')
            .eq('id', customer_id)
            .eq('tenant_id', tenant_id)
            .single();

        if (custFetchErr || !customer) throw new Error('Data pelanggan tidak ditemukan.');

        const currentDebt = Number(customer.current_debt || 0);
        // Hutang tidak boleh negatif (overpayment bisa terjadi, floor ke 0)
        const newDebt = Math.max(0, currentDebt - Number(amount));

        const { error: custErr } = await dbAdmin
            .from('customers')
            .update({ current_debt: newDebt })
            .eq('id', customer_id)
            .eq('tenant_id', tenant_id)
            // Optimistic lock: pastikan hutang belum berubah oleh proses lain
            .eq('current_debt', customer.current_debt);

        if (custErr) {
            // Jika update gagal karena current_debt sudah berubah (race condition)
            // coba sekali lagi dengan nilai terbaru
            const { data: freshCust } = await dbAdmin.from('customers').select('current_debt').eq('id', customer_id).eq('tenant_id', tenant_id).single();
            const retryDebt = Math.max(0, Number(freshCust?.current_debt || 0) - Number(amount));
            const { error: retryErr } = await dbAdmin.from('customers').update({ current_debt: retryDebt }).eq('id', customer_id).eq('tenant_id', tenant_id);
            if (retryErr) throw retryErr;
        }

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
