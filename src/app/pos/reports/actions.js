'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const outlet_id = cookieStore.get('active_outlet_id')?.value;

    return { tenant_id, outlet_id };
}

export async function getSalesReport(startDate, endDate) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Default to today if no dates provided
        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        // 1. Fetch Orders in range
        const { data: orders, error: ordersErr } = await dbAdmin
            .from('orders')
            .select(`
                *,
                staff_users (full_name),
                payments (*)
            `)
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
            .order('created_at', { ascending: false });

        if (ordersErr) throw ordersErr;

        // 2. Fetch Top Selling Items
        // Note: Complex aggregations often better via SQL functions in Supabase, but for now we'll aggregate here or via a simple select
        const { data: topItems, error: itemsErr } = await dbAdmin
            .from('order_items')
            .select(`
                quantity,
                subtotal,
                menu_items (name)
            `)
            .eq('tenant_id', tenant_id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

        if (itemsErr) throw itemsErr;

        // 3. Fetch Debt Payments in range (for Cash Flow)
        const { data: debtPayments, error: debtErr } = await dbAdmin
            .from('debt_payments')
            .select('*')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

        if (debtErr) throw debtErr;

        // Aggregate Top Items
        const aggregatedMeta = {};
        topItems.forEach(ti => {
            const name = ti.menu_items?.name || 'Unknown';
            if (!aggregatedMeta[name]) {
                aggregatedMeta[name] = { name, totalQty: 0, totalSales: 0 };
            }
            aggregatedMeta[name].totalQty += Number(ti.quantity);
            aggregatedMeta[name].totalSales += Number(ti.subtotal);
        });

        const sortedTop = Object.values(aggregatedMeta).sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);

        // 4. Totals
        const summary = orders.reduce((acc, ord) => {
            if (ord.status === 'Selesai') {
                acc.totalSales += Number(ord.grand_total);
                acc.totalTax += Number(ord.pbjt_total || 0);
                acc.totalOrders += 1;
                if (ord.is_credit) acc.totalCredit += Number(ord.grand_total);
            }
            return acc;
        }, { totalSales: 0, totalTax: 0, totalOrders: 0, totalCredit: 0 });

        // Add Debt Collection to summary
        summary.totalDebtPaid = debtPayments.reduce((sum, dp) => sum + Number(dp.amount_paid), 0);
        summary.totalCashIn = summary.totalSales - summary.totalCredit + summary.totalDebtPaid;

        return {
            success: true,
            summary,
            orders,
            debtPayments, // Pass this to UI as well
            topItems: sortedTop
        };

    } catch (err) {
        console.error('Error fetching sales report:', err);
        return { success: false, message: 'Gagal membuat laporan.' };
    }
}

export async function getCreditReport() {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { data, error } = await dbAdmin
            .from('customers')
            .select('*')
            .eq('tenant_id', tenant_id)
            .gt('current_debt', 0)
            .order('current_debt', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        return { success: false, message: 'Gagal memuat piutang.' };
    }
}

export async function getPBJTLedger(startDate, endDate) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const { data, error } = await dbAdmin
            .from('orders')
            .select('created_at, order_number, subtotal, pbjt_total, grand_total, customer_name, order_type')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .eq('status', 'Selesai')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error('Error fetching PBJT ledger:', err);
        return { success: false, message: 'Gagal mengambil data buku besar PBJT.' };
    }
}
