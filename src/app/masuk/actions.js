'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function processOwnerSignIn(email, password) {
    try {
        // Find owner (Role = Admin and email match)
        const { data: user, error } = await dbAdmin
            .from('staff_users')
            .select('id, tenant_id, outlet_id, full_name, role, pin_hash')
            .eq('email', email)
            .in('role', ['Admin', 'Owner'])
            .single();

        if (error || !user) {
            return { success: false, message: 'Email tidak ditemukan atau Anda bukan pemilik.' };
        }

        // Compare password using bcrypt
        const isMatch = await bcrypt.compare(password, user.pin_hash);
        if (!isMatch) {
            return { success: false, message: 'Kata sandi salah.' };
        }

        // Fetch tenant status
        const { data: tenant } = await dbAdmin
            .from('tenants')
            .select('status, name, subdomain')
            .eq('id', user.tenant_id)
            .single();

        if (tenant?.status === 'Suspend' || tenant?.status === 'Nonaktif') {
            return { success: false, message: `Akun Usaha (${tenant.name}) ditangguhkan. Hubungi CS AppKasir.` };
        }

        // Login successful. Set cookies.
        const cookieStore = await cookies();
        cookieStore.set('session_user_id', user.id, { path: '/', httpOnly: true });
        cookieStore.set('active_tenant_id', user.tenant_id, { path: '/', httpOnly: true });
        if (user.outlet_id) cookieStore.set('active_outlet_id', user.outlet_id, { path: '/', httpOnly: true });

        // Redirect URL logic
        return {
            success: true,
            redirectUrl: '/portal',
            message: `Selamat datang, ${user.full_name}`
        };

    } catch (err) {
        console.error('Sign In Error:', err);
        return { success: false, message: 'Terjadi kesalahan sistem.' };
    }
}
