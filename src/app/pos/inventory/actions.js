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

// ─── Bahan Baku (Ingredients) ─────────────────────────────────────────────────

export async function getIngredients() {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { data, error } = await dbAdmin
            .from('ingredients')
            .select('*')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .order('name');

        if (error) throw error;
        return { success: true, ingredients: data };
    } catch (err) {
        console.error('getIngredients error:', err);
        return { success: false, message: 'Gagal memuat bahan baku.' };
    }
}

export async function saveIngredient(formData) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const payload = {
            tenant_id,
            outlet_id,
            name: formData.name,
            unit: formData.unit || 'pcs',
            current_stock: parseFloat(formData.current_stock) || 0,
            min_stock: parseFloat(formData.min_stock) || 0,
            cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        };

        let res;
        if (formData.id) {
            res = await dbAdmin.from('ingredients').update(payload).eq('id', formData.id).eq('tenant_id', tenant_id);
        } else {
            res = await dbAdmin.from('ingredients').insert([payload]);
        }

        if (res.error) throw res.error;
        revalidatePath('/pos/inventory');
        return { success: true };
    } catch (err) {
        console.error('saveIngredient error:', err);
        return { success: false, message: 'Gagal simpan bahan baku.' };
    }
}

export async function deleteIngredient(id) {
    try {
        const { tenant_id } = await getActiveContext();
        const { error } = await dbAdmin.from('ingredients').delete().eq('id', id).eq('tenant_id', tenant_id);
        if (error) throw error;
        revalidatePath('/pos/inventory');
        return { success: true };
    } catch (err) {
        return { success: false, message: 'Gagal hapus bahan baku.' };
    }
}

export async function adjustStock(ingredientId, adjustment, notes) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        // Fetch current stock
        const { data: ing } = await dbAdmin.from('ingredients').select('current_stock').eq('id', ingredientId).single();
        const newStock = Number(ing.current_stock) + adjustment;

        const { error } = await dbAdmin
            .from('ingredients')
            .update({ current_stock: Math.max(0, newStock) })
            .eq('id', ingredientId)
            .eq('tenant_id', tenant_id);

        if (error) throw error;

        // Log stock adjustment
        await dbAdmin.from('stock_movements').insert([{
            tenant_id,
            outlet_id,
            ingredient_id: ingredientId,
            movement_type: adjustment > 0 ? 'Masuk' : 'Keluar',
            quantity: Math.abs(adjustment),
            notes: notes || 'Penyesuaian manual',
        }]);

        revalidatePath('/pos/inventory');
        return { success: true };
    } catch (err) {
        console.error('adjustStock error:', err);
        return { success: false, message: 'Gagal sesuaikan stok.' };
    }
}

// ─── Resep (Recipes) ──────────────────────────────────────────────────────────

export async function getRecipes() {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const { data, error } = await dbAdmin
            .from('recipes')
            .select(`
                *,
                menu_items (id, name),
                ingredients (id, name, unit, current_stock, min_stock)
            `)
            .eq('tenant_id', tenant_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, recipes: data };
    } catch (err) {
        console.error('getRecipes error:', err);
        return { success: false, message: 'Gagal memuat resep.' };
    }
}

export async function saveRecipe(formData) {
    try {
        const { tenant_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const payload = {
            tenant_id,
            menu_item_id: formData.menu_item_id,
            ingredient_id: formData.ingredient_id,
            quantity_used: parseFloat(formData.quantity_used) || 0,
        };

        let res;
        if (formData.id) {
            res = await dbAdmin.from('recipes').update(payload).eq('id', formData.id).eq('tenant_id', tenant_id);
        } else {
            res = await dbAdmin.from('recipes').insert([payload]);
        }

        if (res.error) throw res.error;
        revalidatePath('/pos/inventory');
        return { success: true };
    } catch (err) {
        console.error('saveRecipe error:', err);
        return { success: false, message: 'Gagal simpan resep.' };
    }
}

export async function deleteRecipe(id) {
    try {
        const { tenant_id } = await getActiveContext();
        const { error } = await dbAdmin.from('recipes').delete().eq('id', id).eq('tenant_id', tenant_id);
        if (error) throw error;
        revalidatePath('/pos/inventory');
        return { success: true };
    } catch (err) {
        return { success: false, message: 'Gagal hapus resep.' };
    }
}

// ─── Stock Movements Log ──────────────────────────────────────────────────────

export async function getStockMovements(ingredientId) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id) return { success: false, message: 'Invalid session' };

        const query = dbAdmin
            .from('stock_movements')
            .select('*, ingredients(name, unit)')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (ingredientId) query.eq('ingredient_id', ingredientId);

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, movements: data };
    } catch (err) {
        return { success: false, message: 'Gagal memuat riwayat stok.' };
    }
}
