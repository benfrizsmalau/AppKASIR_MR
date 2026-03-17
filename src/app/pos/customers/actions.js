'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const user_id = cookieStore.get('session_user_id')?.value;

    return { tenant_id, user_id };
}

export async function getCustomers() {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { data: customers, error } = await dbAdmin
            .from('customers')
            .select('*')
            .eq('tenant_id', tenant_id)
            .order('name', { ascending: true });

        if (error) throw error;

        return { success: true, customers };
    } catch (err) {
        console.error('Error fetching customers:', err);
        return { success: false, message: 'Gagal mengambil data pelanggan.' };
    }
}

import { createAuditLog } from '../actions/audit';

export async function saveCustomer(formData) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Sesi tidak valid' };

        const id = formData.id;
        const data = {
            tenant_id,
            name: formData.name,
            phone: formData.phone,
            type: formData.type || 'Personal',
            npwpd: formData.npwpd || null,
            contact_person: formData.contact_person || null,
            address: formData.address || '',
            credit_limit: parseFloat(formData.credit_limit) || 0,
            is_active: formData.is_active !== undefined ? formData.is_active : true,
            updated_at: new Date().toISOString()
        };

        if (id) {
            const { error } = await dbAdmin.from('customers').update(data).eq('id', id).eq('tenant_id', tenant_id);
            if (error) throw error;
            await createAuditLog({ action: 'UPDATE', entity_type: 'customers', entity_id: id, new_data: data, notes: `Update customer: ${data.name}` });
        } else {
            const { data: newCust, error } = await dbAdmin.from('customers').insert(data).select().single();
            if (error) throw error;
            await createAuditLog({ action: 'CREATE', entity_type: 'customers', entity_id: newCust.id, new_data: data, notes: `Created customer: ${data.name}` });
        }
        revalidatePath('/pos/customers');
        return { success: true, message: id ? 'Pelanggan berhasil diperbarui.' : 'Pelanggan baru berhasil ditambahkan.' };
    } catch (err) {
        console.error('Error saving customer:', err);
        return { success: false, message: 'Gagal menyimpan data pelanggan.' };
    }
}

export async function deleteCustomer(id) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { error } = await dbAdmin
            .from('customers')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenant_id);

        if (error) throw error;

        revalidatePath('/pos/customers');
        return { success: true, message: 'Pelanggan berhasil dihapus.' };
    } catch (err) {
        console.error('Error deleting customer:', err);
        return { success: false, message: 'Gagal menghapus pelanggan.' };
    }
}
