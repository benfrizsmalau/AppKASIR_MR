import { getIngredients, getRecipes } from './actions';
import InventoryClient from './components/InventoryClient';
import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getSessionRole, hasAccess } from '@/lib/rbac';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Inventaris | AppKasir' };

export default async function InventoryPage() {
    const role = await getSessionRole();
    if (!hasAccess(role, 'Supervisor')) redirect('/pos');
    const cookieStore = await cookies();
    const tenant_id = cookieStore.get('active_tenant_id')?.value;

    const [ingredientsRes, recipesRes] = await Promise.all([
        getIngredients(),
        getRecipes(),
    ]);

    // Fetch menu items for recipe creation
    let menuItems = [];
    if (tenant_id) {
        const { data } = await dbAdmin
            .from('menu_items')
            .select('id, name')
            .eq('tenant_id', tenant_id)
            .neq('status', 'Nonaktif')
            .order('name');
        menuItems = data || [];
    }

    return (
        <div className="flex-1 h-full overflow-hidden bg-gray-50 flex flex-col">
            <InventoryClient
                initialIngredients={ingredientsRes.success ? ingredientsRes.ingredients : []}
                initialRecipes={recipesRes.success ? recipesRes.recipes : []}
                menuItems={menuItems}
            />
        </div>
    );
}
