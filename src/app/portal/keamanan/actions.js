'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getAuthContext() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('session_user_id')?.value;
    const tenantId = cookieStore.get('active_tenant_id')?.value;
    return { userId, tenantId };
}

export async function getSecurityData() {
    try {
        const { userId, tenantId } = await getAuthContext();
        if (!userId) return { success: false, message: 'Unauthorized' };

        // 1. Get User Security Info
        const { data: user, error: userErr } = await dbAdmin
            .from('staff_users')
            .select('two_factor_enabled, two_factor_secret, backup_codes')
            .eq('id', userId)
            .single();

        if (userErr) throw userErr;

        // 2. Get Active Sessions
        const { data: sessions, error: sessErr } = await dbAdmin
            .from('owner_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('last_active', { ascending: false });

        if (sessErr) throw sessErr;

        return {
            success: true,
            twoFactorEnabled: user.two_factor_enabled,
            sessions: sessions || []
        };
    } catch (err) {
        console.error('Security data fetch error:', err);
        return { success: false, message: 'Gagal memuat data keamanan.' };
    }
}

export async function toggleTwoFactor(enabled) {
    try {
        const { userId } = await getAuthContext();
        // In real app, you'd verify a code here before enabling
        const { error } = await dbAdmin
            .from('staff_users')
            .update({
                two_factor_enabled: enabled,
                two_factor_secret: enabled ? 'MOCK_SECRET_123' : null // Simulation
            })
            .eq('id', userId);

        if (error) throw error;
        revalidatePath('/portal/keamanan');
        return { success: true };
    } catch (err) {
        return { success: false, message: 'Gagal memperbarui pengaturan 2FA.' };
    }
}

export async function terminateSession(sessionId) {
    try {
        const { userId } = await getAuthContext();
        const { error } = await dbAdmin
            .from('owner_sessions')
            .update({ is_active: false })
            .eq('id', sessionId)
            .eq('user_id', userId);

        if (error) throw error;
        revalidatePath('/portal/keamanan');
        return { success: true };
    } catch (err) {
        return { success: false, message: 'Gagal menghentikan sesi.' };
    }
}
