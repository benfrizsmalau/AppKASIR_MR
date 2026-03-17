'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

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

export async function changePassword(oldPassword, newPassword) {
    try {
        const { userId } = await getAuthContext();
        if (!userId) return { success: false, message: 'Sesi tidak valid. Silakan login ulang.' };

        if (!newPassword || newPassword.length < 8) {
            return { success: false, message: 'Kata sandi baru minimal 8 karakter.' };
        }

        // Ambil hash saat ini
        const { data: user, error: fetchErr } = await dbAdmin
            .from('staff_users')
            .select('pin_hash')
            .eq('id', userId)
            .single();

        if (fetchErr || !user) return { success: false, message: 'Pengguna tidak ditemukan.' };

        // Verifikasi kata sandi lama
        const isMatch = await bcrypt.compare(oldPassword, user.pin_hash);
        if (!isMatch) return { success: false, message: 'Kata sandi lama tidak cocok.' };

        // Hash kata sandi baru
        const newHash = await bcrypt.hash(newPassword, 10);

        const { error: updateErr } = await dbAdmin
            .from('staff_users')
            .update({ pin_hash: newHash, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (updateErr) throw updateErr;

        revalidatePath('/portal/keamanan');
        return { success: true, message: 'Kata sandi berhasil diperbarui.' };
    } catch (err) {
        console.error('Change password error:', err);
        return { success: false, message: 'Gagal memperbarui kata sandi.' };
    }
}

export async function getOwnerProfile() {
    try {
        const { userId } = await getAuthContext();
        if (!userId) return { success: false };

        const { data: user } = await dbAdmin
            .from('staff_users')
            .select('full_name, email, role, created_at')
            .eq('id', userId)
            .single();

        return { success: true, user };
    } catch (err) {
        return { success: false };
    }
}
