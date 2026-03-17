import { cookies } from 'next/headers';
import { dbAdmin } from '@/lib/supabase';

// Role hierarchy: higher index = more access
export const ROLES = ['Kasir', 'Supervisor', 'Manajer', 'Admin', 'Owner'];

// Pages accessible per role (minimum role required)
export const PAGE_PERMISSIONS = {
    '/pos': 'Kasir',
    '/pos/orders': 'Kasir',
    '/pos/kds': 'Kasir',
    '/pos/history': 'Kasir',
    '/pos/tables': 'Kasir',
    '/pos/customers': 'Supervisor',
    '/pos/menu': 'Supervisor',
    '/pos/inventory': 'Supervisor',
    '/pos/reports': 'Manajer',
    '/pengaturan': 'Admin',
    '/pengaturan/staff': 'Admin',
};

export function hasAccess(userRole, requiredRole) {
    const userIdx = ROLES.indexOf(userRole);
    const reqIdx = ROLES.indexOf(requiredRole);
    if (userIdx === -1 || reqIdx === -1) return false;
    return userIdx >= reqIdx;
}

export async function getSessionRole() {
    try {
        const cookieStore = await cookies();
        const user_id = cookieStore.get('session_user_id')?.value;
        const tenant_id = cookieStore.get('active_tenant_id')?.value;

        if (!user_id || !tenant_id) return null;

        const { data } = await dbAdmin
            .from('staff_users')
            .select('role')
            .eq('id', user_id)
            .eq('tenant_id', tenant_id)
            .single();

        return data?.role || null;
    } catch {
        return null;
    }
}

// Returns nav items filtered by role
export function getNavItemsForRole(role) {
    return Object.entries(PAGE_PERMISSIONS)
        .filter(([, minRole]) => hasAccess(role, minRole))
        .map(([path]) => path);
}
