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

        const { data: staff, error } = await dbAdmin
            .from('staff_users')
            .select('id, full_name, pin_hash, role, is_active, created_at')
            .eq('tenant_id', tenant_id)
            .order('full_name', { ascending: true });

        if (error) throw error;

        // Map database fields to UI field names
        const formattedStaff = staff.map(s => ({
            id: s.id,
            name: s.full_name,
            pin: '', // Jangan kirim hash ke UI untuk keamanan dan kemudahan edit
            access_role: s.role,
            is_active: s.is_active,
            created_at: s.created_at
        }));

        return { success: true, staff: formattedStaff };
    } catch (err) {
        console.error('Error fetching staff list:', err);
        return { success: false, message: 'Gagal mengambil data pengguna.' };
    }
}

export async function saveStaff(formData) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const id = formData.id;
        
        // Data dasar
        const data = {
            tenant_id,
            full_name: formData.name,
            role: formData.access_role || 'Kasir',
            is_active: formData.is_active !== undefined ? formData.is_active : true,
            updated_at: new Date().toISOString()
        };

        // Hanya update PIN jika diisi (untuk edit) atau jika user baru
        if (formData.pin) {
            const salt = await bcrypt.genSalt(10);
            data.pin_hash = await bcrypt.hash(formData.pin, salt);
        } else if (!id) {
            return { success: false, message: 'PIN wajib diisi untuk pengguna baru.' };
        }

        if (id) {
            const { error } = await dbAdmin.from('staff_users').update(data).eq('id', id).eq('tenant_id', tenant_id);
            if (error) throw error;
        } else {
            const { error } = await dbAdmin.from('staff_users').insert(data);
            if (error) throw error;
        }

        revalidatePath('/pengaturan/staff');
        return { success: true, message: id ? 'Pengguna berhasil diperbarui.' : 'Pengguna baru berhasil ditambahkan.' };
    } catch (err) {
        console.error('Error saving staff:', err);
        return { success: false, message: 'Gagal menyimpan data pengguna.' };
    }
}

export async function deleteStaff(id) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { error } = await dbAdmin
            .from('staff_users')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenant_id);

        if (error) throw error;

        revalidatePath('/pengaturan/staff');
        return { success: true, message: 'Pengguna berhasil dihapus.' };
    } catch (err) {
        console.error('Error deleting staff:', err);
        return { success: false, message: 'Gagal menghapus pengguna.' };
    }
}
