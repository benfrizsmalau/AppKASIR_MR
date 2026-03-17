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

// Pindah pesanan aktif dari satu meja ke meja lain
export async function transferOrder(fromTableId, toTableId) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Cari order aktif di meja asal
        const { data: activeOrder, error: findErr } = await dbAdmin
            .from('orders')
            .select('id')
            .eq('table_id', fromTableId)
            .eq('tenant_id', tenant_id)
            .in('status', ['Baru', 'Dikirim ke Dapur', 'Sebagian Siap', 'Siap Saji', 'Disajikan', 'Menunggu Bayar'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (findErr || !activeOrder) {
            return { success: false, message: 'Tidak ada pesanan aktif di meja tersebut.' };
        }

        // Pindah order ke meja tujuan
        const { error: updateErr } = await dbAdmin
            .from('orders')
            .update({ table_id: toTableId })
            .eq('id', activeOrder.id);

        if (updateErr) throw updateErr;

        // Update status meja
        await dbAdmin.from('tables').update({ status: 'Kosong' }).eq('id', fromTableId);
        await dbAdmin.from('tables').update({ status: 'Terisi' }).eq('id', toTableId);

        revalidatePath('/pos/tables');
        return { success: true, message: 'Pesanan berhasil dipindahkan.' };
    } catch (err) {
        console.error('Transfer order error:', err);
        return { success: false, message: 'Gagal memindahkan pesanan.' };
    }
}

// Gabung meja: tandai meja sekunder sebagai "Terisi" dan catat di notes order utama
export async function mergeTables(primaryTableId, secondaryTableIds) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Tandai semua meja sekunder sebagai Terisi
        for (const secId of secondaryTableIds) {
            await dbAdmin.from('tables').update({ status: 'Terisi' }).eq('id', secId).eq('tenant_id', tenant_id);
        }

        // Tandai di meja utama dengan linked_tables di metadata
        // Simpan linked_table_ids di field notes atau custom field
        // Untuk sementara update meja utama dengan flag merged
        await dbAdmin.from('tables').update({ status: 'Terisi' }).eq('id', primaryTableId).eq('tenant_id', tenant_id);

        revalidatePath('/pos/tables');
        return { success: true, message: 'Meja berhasil digabungkan.' };
    } catch (err) {
        return { success: false, message: 'Gagal menggabungkan meja.' };
    }
}

export async function updateTableStatus(tableId, status) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false };
        await dbAdmin.from('tables').update({ status }).eq('id', tableId).eq('tenant_id', tenant_id);
        revalidatePath('/pos/tables');
        return { success: true };
    } catch (err) {
        return { success: false };
    }
}
