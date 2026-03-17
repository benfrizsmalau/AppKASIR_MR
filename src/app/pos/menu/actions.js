'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getActiveContext() {
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;
    const outlet_id = cookieStore.get('active_outlet_id')?.value;
    const user_id = cookieStore.get('session_user_id')?.value;

    return { tenant_id, outlet_id, user_id };
}

// STORAGE UPLOAD
export async function uploadMenuImage(formData) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const file = formData.get('file');
        if (!file) return { success: false, message: 'No file provided' };

        const fileExt = file.name.split('.').pop();
        const fileName = `${tenant_id}/${Date.now()}.${fileExt}`;
        const filePath = `menu-items/${fileName}`;

        const { data, error } = await dbAdmin
            .storage
            .from('menu-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = dbAdmin
            .storage
            .from('menu-images')
            .getPublicUrl(filePath);

        return { success: true, publicUrl };
    } catch (err) {
        console.error('Upload error:', err);
        return { success: false, message: 'Gagal mengupload gambar.' };
    }
}

// CATEGORIES
export async function getCategories() {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { data, error } = await dbAdmin
            .from('categories')
            .select('*')
            .eq('tenant_id', tenant_id)
            .order('sequence_order', { ascending: true });

        if (error) throw error;
        return { success: true, categories: data };
    } catch (err) {
        console.error('Error fetching categories:', err);
        return { success: false, message: 'Gagal mengambil kategori.' };
    }
}

export async function saveCategory(formData) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const id = formData.id;
        const data = {
            tenant_id,
            name: formData.name,
            icon: formData.icon || 'Package',
            sequence_order: parseInt(formData.sequence_order) || 0,
            is_pbjt_exempt: formData.is_pbjt_exempt || false
        };

        let result;
        if (id) {
            result = await dbAdmin.from('categories').update(data).eq('id', id).eq('tenant_id', tenant_id);
        } else {
            result = await dbAdmin.from('categories').insert([data]);
        }

        if (result.error) throw result.error;
        revalidatePath('/pos/menu');
        return { success: true };
    } catch (err) {
        return { success: false, message: 'Gagal menyimpan kategori.' };
    }
}

// MENU ITEMS
export async function getMenuItems() {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { data, error } = await dbAdmin
            .from('menu_items')
            .select('*, categories(name)')
            .eq('tenant_id', tenant_id)
            .order('name', { ascending: true });

        if (error) throw error;
        return { success: true, menuItems: data };
    } catch (err) {
        console.error('Error fetching menu items:', err);
        return { success: false, message: 'Gagal mengambil data menu.' };
    }
}

export async function saveMenuItem(formData) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const id = formData.id;
        const data = {
            tenant_id,
            category_id: formData.category_id,
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            cost_price: parseFloat(formData.cost_price) || 0,
            image_url: formData.image_url,
            status: formData.status || 'Tersedia',
            track_stock: formData.track_stock || false,
            current_stock: parseFloat(formData.current_stock) || 0,
            min_stock: parseFloat(formData.min_stock) || 0,
            updated_at: new Date().toISOString()
        };

        let result;
        if (id) {
            result = await dbAdmin.from('menu_items').update(data).eq('id', id).eq('tenant_id', tenant_id);
        } else {
            result = await dbAdmin.from('menu_items').insert([data]);
        }

        if (result.error) throw result.error;
        revalidatePath('/pos/menu');
        return { success: true };
    } catch (err) {
        return { success: false, message: 'Gagal menyimpan menu item.' };
    }
}

// STOCK ADJUSTMENT
export async function adjustStock({ menuItemId, type, quantity, notes }) {
    try {
        const { tenant_id, user_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // 1. Get current stock
        const { data: item } = await dbAdmin.from('menu_items').select('current_stock').eq('id', menuItemId).single();
        let newStock = Number(item.current_stock);

        if (type === 'Masuk') newStock += Number(quantity);
        else if (type === 'Keluar' || type === 'Retur') newStock -= Number(quantity);
        else if (type === 'Penyesuaian') newStock = Number(quantity);

        // 2. Update Menu Item
        const { error: updErr } = await dbAdmin.from('menu_items').update({ current_stock: newStock }).eq('id', menuItemId);
        if (updErr) throw updErr;

        // 3. Log to inventory_logs
        const { error: logErr } = await dbAdmin.from('inventory_logs').insert([{
            tenant_id,
            outlet_id,
            menu_item_id: menuItemId,
            type,
            quantity: Number(quantity),
            notes,
            user_id
        }]);

        if (logErr) throw logErr;

        revalidatePath('/pos/menu');
        return { success: true };
    } catch (err) {
        console.error('Stock adjustment error:', err);
        return { success: false, message: 'Gagal menyesuaikan stok.' };
    }
}

export async function getInventoryLogs() {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { data, error } = await dbAdmin
            .from('inventory_logs')
            .select('*, menu_items(name), staff_users!user_id(full_name)')
            .eq('tenant_id', tenant_id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return { success: true, logs: data };
    } catch (err) {
        console.error('Error fetching inventory logs:', err);
        return { success: false, message: 'Gagal mengambil riwayat stok.' };
    }
}

// DELETE ACTIONS
export async function deleteMenuItem(id) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Note: In a real app, check if item has order history first OR use soft delete.
        // For MVP, we allow deletion if RLS allows.
        const { error } = await dbAdmin
            .from('menu_items')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenant_id);

        if (error) throw error;
        revalidatePath('/pos/menu');
        return { success: true };
    } catch (err) {
        console.error('Error deleting menu item:', err);
        return { success: false, message: 'Gagal menghapus menu item. Item mungkin sudah terikat dengan transaksi.' };
    }
}

export async function deleteCategory(id) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { error } = await dbAdmin
            .from('categories')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenant_id);

        if (error) throw error;
        revalidatePath('/pos/menu');
        return { success: true };
    } catch (err) {
        console.error('Error deleting category:', err);
        return { success: false, message: 'Gagal menghapus kategori. Pastikan tidak ada menu yang menggunakan kategori ini.' };
    }
}
