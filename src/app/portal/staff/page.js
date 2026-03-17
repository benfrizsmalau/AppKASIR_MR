import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import StaffClient from './components/StaffClient';
import { redirect } from 'next/navigation';

export const metadata = {
    title: "Kelola Staff & PIN | AppKasir Portal",
};

export default async function StaffPage() {
    const cookieStore = await cookies();
    const tenantId = cookieStore.get('active_tenant_id')?.value;

    if (!tenantId) {
        redirect('/masuk');
    }

    // Fetch initial staff list
    const { data: staff, error } = await dbAdmin
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
        .eq('tenant_id', tenantId)
        .order('role', { ascending: true });

    // Fetch outlets for selection
    const { data: outlets } = await dbAdmin
        .from('outlets')
        .select('id, name')
        .eq('tenant_id', tenantId);

    return (
        <div className="p-10">
            <StaffClient initialStaff={staff || []} outlets={outlets || []} />
        </div>
    );
}
