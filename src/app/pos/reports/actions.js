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
                staff_users!cashier_id (full_name),
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
        summary.totalOrders = orders.filter(o => o.status === 'Selesai').length;
        summary.totalCancelled = orders.filter(o => o.status === 'Dibatalkan').length;

        // Cashier breakdown
        const cashierMap = {};
        orders.filter(o => o.status === 'Selesai').forEach(ord => {
            const kasirName = ord.staff_users?.full_name || 'Tidak diketahui';
            if (!cashierMap[kasirName]) cashierMap[kasirName] = { name: kasirName, totalOrders: 0, totalSales: 0 };
            cashierMap[kasirName].totalOrders += 1;
            cashierMap[kasirName].totalSales += Number(ord.grand_total);
        });
        const cashierBreakdown = Object.values(cashierMap).sort((a, b) => b.totalSales - a.totalSales);

        // Payment method breakdown (from payments table)
        const paymentMap = {};
        orders.filter(o => o.status === 'Selesai').forEach(ord => {
            if (ord.payments && ord.payments.length > 0) {
                ord.payments.forEach(pay => {
                    const method = pay.payment_method || 'Lainnya';
                    if (!paymentMap[method]) paymentMap[method] = { method, count: 0, total: 0 };
                    paymentMap[method].count += 1;
                    paymentMap[method].total += Number(pay.amount || ord.grand_total);
                });
            } else if (ord.is_credit) {
                if (!paymentMap['Hutang']) paymentMap['Hutang'] = { method: 'Hutang', count: 0, total: 0 };
                paymentMap['Hutang'].count += 1;
                paymentMap['Hutang'].total += Number(ord.grand_total);
            }
        });
        const paymentBreakdown = Object.values(paymentMap).sort((a, b) => b.total - a.total);

        // Cancelled orders
        const cancelledOrders = orders.filter(o => o.status === 'Dibatalkan');

        return {
            success: true,
            summary,
            orders,
            debtPayments,
            topItems: sortedTop,
            cashierBreakdown,
            paymentBreakdown,
            cancelledOrders
        };

    } catch (err) {
        console.error('Error fetching sales report:', err);
        return { success: false, message: 'Gagal membuat laporan.' };
    }
}

export async function getShiftSummary(shiftDate) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const date = shiftDate || new Date().toISOString().split('T')[0];
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;

        const { data: orders, error } = await dbAdmin
            .from('orders')
            .select('grand_total, status, is_credit, payments(*), staff_users!cashier_id(full_name)')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .gte('created_at', start)
            .lte('created_at', end);

        if (error) throw error;

        const done = orders.filter(o => o.status === 'Selesai');
        const totalCash = done.reduce((sum, o) => {
            const cashPayment = (o.payments || []).filter(p => p.payment_method === 'Tunai');
            return sum + cashPayment.reduce((s, p) => s + Number(p.amount || 0), 0);
        }, 0);
        const totalNonCash = done.reduce((sum, o) => {
            const nonCash = (o.payments || []).filter(p => p.payment_method !== 'Tunai');
            return sum + nonCash.reduce((s, p) => s + Number(p.amount || 0), 0);
        }, 0);
        const totalCredit = done.filter(o => o.is_credit).reduce((sum, o) => sum + Number(o.grand_total), 0);

        // Debt payments today
        const { data: debtPay } = await dbAdmin
            .from('debt_payments')
            .select('amount_paid, payment_method')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .gte('created_at', start)
            .lte('created_at', end);

        const totalDebtCash = (debtPay || []).filter(d => d.payment_method === 'Tunai').reduce((sum, d) => sum + Number(d.amount_paid), 0);
        const totalDebtNonCash = (debtPay || []).filter(d => d.payment_method !== 'Tunai').reduce((sum, d) => sum + Number(d.amount_paid), 0);

        return {
            success: true,
            date,
            totalOrders: done.length,
            totalGross: done.reduce((s, o) => s + Number(o.grand_total), 0),
            totalCash,
            totalNonCash,
            totalCredit,
            totalDebtCash,
            totalDebtNonCash,
            totalCashInDrawer: totalCash + totalDebtCash,
        };
    } catch (err) {
        console.error('Shift summary error:', err);
        return { success: false, message: 'Gagal memuat data shift.' };
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

export async function getMasaPajakList() {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Get distinct year-months that have PBJT data
        const { data: orders, error } = await dbAdmin
            .from('orders')
            .select('created_at, pbjt_total, subtotal, grand_total')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .eq('status', 'Selesai')
            .gt('pbjt_total', 0)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get lock statuses
        const { data: locks } = await dbAdmin
            .from('pbjt_periods')
            .select('year, month, is_locked, locked_at, total_pbjt, total_dpp')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id);

        // Aggregate by month
        const monthMap = {};
        (orders || []).forEach(ord => {
            const d = new Date(ord.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) {
                monthMap[key] = { year: d.getFullYear(), month: d.getMonth() + 1, totalDPP: 0, totalPBJT: 0, txCount: 0 };
            }
            monthMap[key].totalDPP += Number(ord.subtotal);
            monthMap[key].totalPBJT += Number(ord.pbjt_total);
            monthMap[key].txCount += 1;
        });

        const lockMap = {};
        (locks || []).forEach(l => { lockMap[`${l.year}-${String(l.month).padStart(2, '0')}`] = l; });

        const masaPajakList = Object.entries(monthMap).map(([key, val]) => ({
            key,
            ...val,
            isLocked: lockMap[key]?.is_locked || false,
            lockedAt: lockMap[key]?.locked_at || null,
        })).sort((a, b) => b.key.localeCompare(a.key));

        return { success: true, data: masaPajakList };
    } catch (err) {
        console.error('Error fetching masa pajak list:', err);
        return { success: false, message: 'Gagal memuat daftar masa pajak.' };
    }
}

export async function lockMasaPajak(year, month) {
    'use server';
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        const cookieStore = await cookies();
        const user_id = cookieStore.get('session_user_id')?.value;
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Get period totals from orders
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        const { data: orders } = await dbAdmin
            .from('orders')
            .select('subtotal, pbjt_total, grand_total')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .eq('status', 'Selesai')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const totalDPP = (orders || []).reduce((sum, o) => sum + Number(o.subtotal), 0);
        const totalPBJT = (orders || []).reduce((sum, o) => sum + Number(o.pbjt_total), 0);
        const totalGross = (orders || []).reduce((sum, o) => sum + Number(o.grand_total), 0);
        const txCount = (orders || []).length;

        const { error } = await dbAdmin
            .from('pbjt_periods')
            .upsert({
                tenant_id,
                outlet_id,
                year: Number(year),
                month: Number(month),
                is_locked: true,
                locked_at: new Date().toISOString(),
                locked_by_user_id: user_id,
                total_dpp: totalDPP,
                total_pbjt: totalPBJT,
                total_gross: totalGross,
                tx_count: txCount,
            }, { onConflict: 'tenant_id,outlet_id,year,month' });

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Error locking masa pajak:', err);
        return { success: false, message: 'Gagal mengunci masa pajak.' };
    }
}

export async function getPBJTMasaPajak(year, month) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        const [{ data: orders, error }, { data: lockData }] = await Promise.all([
            dbAdmin
                .from('orders')
                .select('created_at, order_number, subtotal, pbjt_total, grand_total, customer_name, order_type')
                .eq('tenant_id', tenant_id)
                .eq('outlet_id', outlet_id)
                .eq('status', 'Selesai')
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: true }),
            dbAdmin
                .from('pbjt_periods')
                .select('*')
                .eq('tenant_id', tenant_id)
                .eq('outlet_id', outlet_id)
                .eq('year', year)
                .eq('month', month)
                .maybeSingle(),
        ]);

        if (error) throw error;
        return { success: true, data: orders || [], lock: lockData };
    } catch (err) {
        console.error('Error fetching PBJT masa pajak:', err);
        return { success: false, message: 'Gagal memuat data masa pajak.' };
    }
}

export async function isMasaPajakLocked(year, month) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return false;

        const { data } = await dbAdmin
            .from('pbjt_periods')
            .select('is_locked')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .eq('year', year)
            .eq('month', month)
            .maybeSingle();

        return data?.is_locked || false;
    } catch {
        return false;
    }
}
