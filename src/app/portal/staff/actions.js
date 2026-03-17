'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    return { tenant_id };
}

export async function getStaffList() {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { data, error } = await dbAdmin
            .from('staff_users')
            .select(`
                id,
                full_name,
                role,
                email,
                is_active,
                created_at,
                outlet_id,
                outlets (name)
            `)
            .eq('tenant_id', tenant_id)
            .order('role', { ascending: true });

        if (error) throw error;
        return { success: true, staff: data };
    } catch (err) {
        console.error('Error fetching staff:', err);
        return { success: false, message: 'Gagal memuat daftar staff.' };
    }
}

export async function saveStaff(formData) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { id, full_name, role, email, pin, outlet_id, is_active } = formData;

        let data = {
            tenant_id,
            full_name,
            role,
            email: email || null,
            outlet_id: outlet_id || null,
            is_active: is_active ?? true
        };

        // If PIN is provided, hash it
        if (pin && pin.trim().length > 0) {
            data.pin_hash = await bcrypt.hash(pin, 10);
        }

        let result;
        if (id) {
            result = await dbAdmin.from('staff_users').update(data).eq('id', id).eq('tenant_id', tenant_id);
        } else {
            // New user must have a PIN
            if (!pin) return { success: false, message: 'PIN/Password wajib diisi untuk staff baru.' };
            result = await dbAdmin.from('staff_users').insert([data]);
        }

        if (result.error) throw result.error;

        revalidatePath('/portal/staff');
        return { success: true };
    } catch (err) {
        console.error('Error saving staff:', err);
        return { success: false, message: 'Gagal menyimpan data staff.' };
    }
}

export async function toggleStaffStatus(id, currentStatus) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { error } = await dbAdmin
            .from('staff_users')
            .update({ is_active: !currentStatus })
            .eq('id', id)
            .eq('tenant_id', tenant_id);

        if (error) throw error;
        revalidatePath('/portal/staff');
        return { success: true };
    } catch (err) {
        return { success: false, message: 'Gagal mengubah status staff.' };
    }
}
