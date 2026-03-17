'use server';

import bcrypt from 'bcryptjs';
import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function loginWithPin(userId, pin) {
    try {
        // 1. Ambil data user dari database berdasarkan ID
        const { data: user, error } = await dbAdmin
            .from('staff_users')
            .select('id, full_name, role, pin_hash, tenant_id, outlet_id')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return { success: false, message: 'Pengguna tidak ditemukan.' };
        }

        // 2. Verifikasi PIN menggunakan bcrypt
        const isMatch = await bcrypt.compare(pin, user.pin_hash);

        if (!isMatch) {
            return { success: false, message: 'PIN yang Anda masukkan salah.' };
        }

        // 3. Jika berhasil, simpan session ke cookie (Simulasi saja untuk saat ini, Next.js cookie/session)
        const cookieStore = await cookies();
        cookieStore.set('session_user_id', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 12, // 12 Jam (Sebaiknya bisa diatur dari setting PRD: Sesi Otomatis Habis)
            path: '/',
        });

        // Simpan context tenant & outlet untuk akses cepat POS
        cookieStore.set('active_tenant_id', user.tenant_id, { httpOnly: false, path: '/' });
        cookieStore.set('active_outlet_id', user.outlet_id, { httpOnly: false, path: '/' });

        return { success: true, user: { id: user.id, name: user.full_name, role: user.role } };

    } catch (err) {
        console.error('Login action error:', err);
        return { success: false, message: 'Terjadi kesalahan sistem.' };
    }
}

export async function getActiveStaffUsers() {
    // Karena kita perlu dropdown user di halaman login, ini adalah action untuk read
    // Idealnya di SaaS nyata, ini akan difilter berdasarkan tenant subdomain (host url).
    // Tapi karena ini local MVP, mari kita pull semua active user (atau limited ke tenant pertama)
    const { data: users, error } = await dbAdmin
        .from('staff_users')
        .select('id, full_name, role')
        .eq('is_active', true)
        .order('full_name');

    if (error) return [];
    return users;
}
