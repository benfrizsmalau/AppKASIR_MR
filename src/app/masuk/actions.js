'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

// Role yang diizinkan masuk ke Portal Pemilik
const OWNER_ROLES = ['Owner', 'Admin'];

export async function processOwnerSignIn(email, password) {
    try {
        if (!email || !password) {
            return { success: false, message: 'Email dan kata sandi wajib diisi.' };
        }

        // Cari akun berdasarkan email (Owner atau Admin)
        const { data: user, error } = await dbAdmin
            .from('staff_users')
            .select('id, tenant_id, outlet_id, full_name, role, pin_hash, is_active')
            .eq('email', email.toLowerCase().trim())
            .in('role', OWNER_ROLES)
            .maybeSingle();

        // Gunakan pesan generik agar tidak membocorkan info (cegah user enumeration)
        if (!user) {
            return { success: false, message: 'Email atau kata sandi salah.' };
        }

        if (!user.is_active) {
            return { success: false, message: 'Akun Anda dinonaktifkan. Hubungi administrator.' };
        }

        // Verifikasi password dengan bcrypt
        const isMatch = await bcrypt.compare(password, user.pin_hash);
        if (!isMatch) {
            return { success: false, message: 'Email atau kata sandi salah.' };
        }

        // Cek status tenant
        const { data: tenant } = await dbAdmin
            .from('tenants')
            .select('id, status, name, subdomain, subscription_plan')
            .eq('id', user.tenant_id)
            .single();

        if (!tenant) {
            return { success: false, message: 'Data usaha tidak ditemukan. Hubungi support.' };
        }

        if (tenant.status === 'Suspend' || tenant.status === 'Nonaktif') {
            return { success: false, message: `Akun usaha "${tenant.name}" ditangguhkan. Hubungi AppKasir Support.` };
        }

        // Login berhasil — set session cookies
        const cookieStore = await cookies();
        cookieStore.set('session_user_id', user.id, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 hari
        });
        cookieStore.set('active_tenant_id', user.tenant_id, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
        });
        if (user.outlet_id) {
            cookieStore.set('active_outlet_id', user.outlet_id, {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            });
        }

        return {
            success: true,
            redirectUrl: '/portal',
            userName: user.full_name,
            message: `Selamat datang kembali, ${user.full_name}!`,
        };

    } catch (err) {
        console.error('Sign In Error:', err);
        return { success: false, message: 'Terjadi kesalahan sistem. Coba lagi nanti.' };
    }
}

export async function processOwnerSignOut() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete('session_user_id');
        // Identitas toko tetap disimpan agar login staff tetap muncul
        return { success: true };
    } catch (err) {
        return { success: false };
    }
}

export async function resetPassword(email, newPassword) {
    try {
        if (!email || !newPassword) {
            return { success: false, message: 'Email dan kata sandi baru wajib diisi.' };
        }

        if (newPassword.length < 6) {
            return { success: false, message: 'Kata sandi minimal 6 karakter.' };
        }

        // Cek apakah email terdaftar sebagai Owner/Admin
        const { data: user, error } = await dbAdmin
            .from('staff_users')
            .select('id, full_name')
            .eq('email', email.toLowerCase().trim())
            .in('role', OWNER_ROLES)
            .maybeSingle();

        if (error || !user) {
            return { success: false, message: 'Email tidak ditemukan atau bukan akun pemilik.' };
        }

        // Hash password baru
        const newHash = await bcrypt.hash(newPassword, 10);

        // Update password di database
        const { error: updateError } = await dbAdmin
            .from('staff_users')
            .update({ pin_hash: newHash })
            .eq('id', user.id);

        if (updateError) {
            return { success: false, message: 'Gagal memperbarui kata sandi. Coba lagi.' };
        }

        return { success: true, message: `Kata sandi berhasil diperbarui. Silakan masuk kembali.` };
    } catch (err) {
        console.error('Reset Password Error:', err);
        return { success: false, message: 'Terjadi kesalahan sistem. Coba lagi nanti.' };
    }
}
