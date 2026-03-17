'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getActiveTenant() {
    const cookieStore = await cookies();
    return cookieStore.get('active_tenant_id')?.value;
}

export async function getOutlets() {
    try {
        const tenant_id = await getActiveTenant();
        if (!tenant_id) return { success: false, message: 'Sesi tidak valid.' };

        const { data, error } = await dbAdmin
            .from('outlets')
            .select('*')
            .eq('tenant_id', tenant_id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, outlets: data };
    } catch (err) {
        console.error('Error fetching outlets:', err);
        return { success: false, message: 'Gagal memuat daftar cabang.' };
    }
}

export async function saveOutlet(formData) {
    try {
        const tenant_id = await getActiveTenant();
        if (!tenant_id) return { success: false, message: 'Sesi tidak valid.' };

        // Check plan limits
        const { data: tenant } = await dbAdmin.from('tenants').select('subscription_plan').eq('id', tenant_id).single();
        const { count } = await dbAdmin.from('outlets').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id);

        const limits = {
            'Starter': 1,
            'Pro': 3,
            'Enterprise': 999
        };

        if (!formData.id && count >= limits[tenant.subscription_plan]) {
            return {
                success: false,
                message: `Batas cabang untuk paket ${tenant.subscription_plan} telah tercapai (${limits[tenant.subscription_plan]} Cabang). Harap upgrade paket Anda.`
            };
        }

        const data = {
            tenant_id,
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            npwpd: formData.npwpd,
            nib: formData.nib,
            pbjt_active: formData.pbjt_active,
            pbjt_rate: parseFloat(formData.pbjt_rate || 10),
            pbjt_mode: formData.pbjt_mode || 'Eksklusif',
            service_charge_active: formData.service_charge_active,
            service_charge_rate: parseFloat(formData.service_charge_rate || 0),
            is_active: formData.is_active ?? true,
            updated_at: new Date().toISOString()
        };

        let result;
        if (formData.id) {
            result = await dbAdmin.from('outlets').update(data).eq('id', formData.id).eq('tenant_id', tenant_id);
        } else {
            result = await dbAdmin.from('outlets').insert([data]);
        }

        if (result.error) throw result.error;
        revalidatePath('/portal/cabang');
        revalidatePath('/portal'); // Dashboard metrics
        return { success: true };
    } catch (err) {
        console.error('Error saving outlet:', err);
        return { success: false, message: 'Gagal menyimpan data cabang.' };
    }
}

export async function toggleOutletStatus(id, currentStatus) {
    try {
        const tenant_id = await getActiveTenant();
        const { error } = await dbAdmin
            .from('outlets')
            .update({ is_active: !currentStatus })
            .eq('id', id)
            .eq('tenant_id', tenant_id);

        if (error) throw error;
        revalidatePath('/portal/cabang');
        return { success: true };
    } catch (err) {
        return { success: false, message: 'Gagal mengubah status cabang.' };
    }
}
