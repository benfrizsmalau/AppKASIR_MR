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
        cookieStore.delete('active_tenant_id');
        cookieStore.delete('active_outlet_id');
        return { success: true };
    } catch (err) {
        return { success: false };
    }
}

export async function sendPasswordReset(email) {
    // Placeholder — pada versi produksi terhubung ke email service (SendGrid/SES)
    try {
        const { data: user } = await dbAdmin
            .from('staff_users')
            .select('id, full_name')
            .eq('email', email.toLowerCase().trim())
            .in('role', OWNER_ROLES)
            .maybeSingle();

        // Selalu return success agar tidak membocorkan apakah email terdaftar
        return { success: true, message: 'Jika email terdaftar, instruksi reset akan dikirim ke inbox Anda.' };
    } catch (err) {
        return { success: true, message: 'Jika email terdaftar, instruksi reset akan dikirim ke inbox Anda.' };
    }
}
