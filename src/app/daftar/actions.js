'use server';

import { dbAdmin } from '@/lib/supabase';

export async function checkSubdomain(subdomain) {
    try {
        const { data, error } = await dbAdmin
            .from('tenants')
            .select('id')
            .eq('subdomain', subdomain)
            .single();

        if (data) return { available: false };
        return { available: true };
    } catch (err) {
        // If error implies not found, it's available
        return { available: true };
    }
}

export async function proceedRegistration(payload) {
    try {
        const { plan, duration, name, email, phone, password, businessName, businessType, province, city, subdomain } = payload;

        // 1. Create Tenant
        const { data: tenant, error: tenantErr } = await dbAdmin.from('tenants').insert({
            name: businessName,
            subdomain: subdomain,
            subscription_plan: plan === 'Starter' ? 'Starter' : plan === 'Pro' ? 'Pro' : 'Enterprise',
            status: 'Aktif', // Auto active for MVP
        }).select().single();

        if (tenantErr) throw tenantErr;

        // 2. Create Default Outlet
        const { data: outlet, error: outletErr } = await dbAdmin.from('outlets').insert({
            tenant_id: tenant.id,
            name: `${businessName} - Pusat`,
            phone: phone,
            email: email,
            pbjt_active: true,
            pbjt_rate: 10,
            pbjt_mode: 'Eksklusif'
        }).select().single();

        if (outletErr) throw outletErr;

        // 3. Create Owner (Admin)
        // Simulate password storage for MVP in pin_hash column (Normally handled by Supabase Auth)
        const { error: userErr } = await dbAdmin.from('staff_users').insert({
            tenant_id: tenant.id,
            outlet_id: outlet.id,
            full_name: name,
            email: email,
            role: 'Admin',
            pin_hash: password // In real world, hash this and use supabase auth
        });

        if (userErr) throw userErr;

        return { success: true, tenant_id: tenant.id, outlet_id: outlet.id, message: 'Pendaftaran berhasil!' };

    } catch (err) {
        console.error('Registration Error:', err);
        return { success: false, message: 'Gagal melakukan pendaftaran. Silakan coba lagi.' };
    }
}
