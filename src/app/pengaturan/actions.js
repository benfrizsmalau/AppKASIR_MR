'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const outlet_id = cookieStore.get('active_outlet_id')?.value;

    return { tenant_id, outlet_id };
}

export async function getOutletSettings() {
    try {
        const { outlet_id } = await getActiveContext();
        if (!outlet_id) return { success: false, message: 'Invalid session' };

        const { data: outlet, error } = await dbAdmin
            .from('outlets')
            .select('*')
            .eq('id', outlet_id)
            .single();

        if (error) throw error;
        return { success: true, settings: outlet };
    } catch (err) {
        console.error('Error fetching settings:', err);
        return { success: false, message: 'Gagal mengambil pengaturan.' };
    }
}

export async function updateOutletSettings(formData) {
    try {
        const { outlet_id } = await getActiveContext();
        if (!outlet_id) return { success: false, message: 'Invalid session' };

        const updateData = {
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            npwpd: formData.npwpd,
            pbjt_active: formData.pbjt_active,
            pbjt_rate: parseFloat(formData.pbjt_rate) || 10,
            pbjt_mode: formData.pbjt_mode || 'Eksklusif',
            service_charge_active: formData.service_charge_active || false,
            service_charge_rate: parseFloat(formData.service_charge_rate) || 0,
            updated_at: new Date().toISOString()
        };

        const { error } = await dbAdmin
            .from('outlets')
            .update(updateData)
            .eq('id', outlet_id);

        if (error) throw error;

        revalidatePath('/pengaturan');
        return { success: true, message: 'Pengaturan berhasil diperbarui.' };
    } catch (err) {
        console.error('Error updating settings:', err);
        return { success: false, message: 'Gagal memperbarui pengaturan.' };
    }
}
