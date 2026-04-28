'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function createAuditLog({ action, entity_type, entity_id, old_data, new_data, notes }) {
    try {
        const cookieStore = await cookies();
        const tenant_id = cookieStore.get('active_tenant_id')?.value;
        const outlet_id = cookieStore.get('active_outlet_id')?.value;
        const user_id = cookieStore.get('session_user_id')?.value;

        if (!tenant_id) return;

        await dbAdmin.from('audit_logs').insert([{
            tenant_id,
            outlet_id,
            user_id,
            action,
            entity_type,
            entity_id,
            old_data,
            new_data,
            notes,
            ip_address: '0.0.0.0' // Simplification
        }]);

    } catch (err) {
        console.error('Audit log error:', err);
    }
}
