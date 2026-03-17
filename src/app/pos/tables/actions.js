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

export async function getTables() {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id || !outlet_id) return { success: false };

        const { data, error } = await dbAdmin
            .from('tables')
            .select('*')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .order('table_number');

        if (error) throw error;
        return { success: true, tables: data };
    } catch (err) {
        return { success: false, message: 'Gagal ambil data meja.' };
    }
}

export async function saveTable(formData) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        const id = formData.id;
        const data = {
            tenant_id,
            outlet_id,
            table_number: formData.table_number,
            area_name: formData.area_name || 'Utama',
            capacity: parseInt(formData.capacity) || 2,
            pos_x: parseInt(formData.pos_x) || 0,
            pos_y: parseInt(formData.pos_y) || 0,
            status: formData.status || 'Kosong'
        };

        let res;
        if (id) {
            res = await dbAdmin.from('tables').update(data).eq('id', id);
        } else {
            res = await dbAdmin.from('tables').insert([data]);
        }

        if (res.error) throw res.error;
        revalidatePath('/pos/tables');
        return { success: true };
    } catch (err) {
        return { success: false, message: 'Gagal simpan meja.' };
    }
}

export async function updateTablePositions(positions) {
    // positions = [{id, pos_x, pos_y}]
    try {
        const { tenant_id } = await getActiveContext();

        // Supabase doesn't support bulk update with different values easily without RPC
        // For MVP, we do individual updates or a single RPC if available.
        // Let's do a loop for now (max tables usually < 50)
        for (const p of positions) {
            await dbAdmin.from('tables').update({ pos_x: p.pos_x, pos_y: p.pos_y }).eq('id', p.id).eq('tenant_id', tenant_id);
        }

        revalidatePath('/pos/tables');
        return { success: true };
    } catch (err) {
        return { success: false };
    }
}

export async function deleteTable(id) {
    try {
        const { tenant_id } = await getActiveContext();
        const { error } = await dbAdmin.from('tables').delete().eq('id', id).eq('tenant_id', tenant_id);
        if (error) throw error;
        revalidatePath('/pos/tables');
        return { success: true };
    } catch (err) {
        return { success: false };
    }
}
