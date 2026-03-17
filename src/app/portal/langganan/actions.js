'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function getInvoices() {
    try {
        const cookieStore = await cookies();
        const tenantId = cookieStore.get('active_tenant_id')?.value;
        if (!tenantId) return { success: false, message: 'Unauthorized' };

        const { data, error } = await dbAdmin
            .from('tenant_invoices')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('issued_at', { ascending: false });

        if (error) throw error;
        return { success: true, invoices: data };
    } catch (err) {
        return { success: false, message: 'Gagal mengambil data tagihan.' };
    }
}
