import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import HistoryClient from './HistoryClient';

export default async function HistoryPage() {
    const cookieStore = await cookies();
    const outlet_id = cookieStore.get('active_outlet_id')?.value;

    // Fetch riwayat transaksi hari ini
    const today = new Date().toISOString().split('T')[0];

    // As in MVP, we fetch directly on server load.
    const { data: records, error } = await dbAdmin
        .from('orders')
        .select(`
             id, 
             order_number, 
             order_type, 
             grand_total, 
             status, 
             customer_name,
             is_credit,
             created_at,
             staff_users ( full_name ),
             payments ( payment_method, status )
        `)
        .eq('outlet_id', outlet_id)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .order('created_at', { ascending: false });

    return <HistoryClient initialRecords={records || []} error={error} />;
}
