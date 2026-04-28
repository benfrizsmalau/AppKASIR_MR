'use server';

import { dbAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function checkSubdomain(subdomain) {
    try {
        const { data } = await dbAdmin
            .from('tenants')
            .select('id')
            .eq('subdomain', subdomain)
            .maybeSingle();

        if (data) return { available: false };
        return { available: true };
    } catch (err) {
        return { available: true };
    }
}

export async function checkEmailExists(email) {
    try {
        // Hanya cek email untuk role Owner/Admin agar Kasir dengan email sama
        // tidak memblokir registrasi usaha baru yang sah
        const { data } = await dbAdmin
            .from('staff_users')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .in('role', ['Owner', 'Admin'])
            .maybeSingle();

        return { exists: !!data };
    } catch (err) {
        return { exists: false };
    }
}

export async function proceedRegistration(payload) {
    let createdTenantId = null;
    let createdOutletId = null;

    try {
        const {
            name, email, phone, password, businessName, businessType, subdomain,
            address, village, district, regency, province, postalCode
        } = payload;

        // Validasi email belum terdaftar (filter Owner/Admin saja)
        const { data: existingUser } = await dbAdmin
            .from('staff_users')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .in('role', ['Owner', 'Admin'])
            .maybeSingle();

        if (existingUser) {
            return { success: false, message: 'Email sudah terdaftar. Gunakan email lain atau masuk ke akun Anda.' };
        }

        // Validasi password minimal 8 karakter
        if (!password || password.length < 8) {
            return { success: false, message: 'Kata sandi minimal 8 karakter.' };
        }

        // Hash password dengan bcrypt (10 rounds)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Buat Tenant — Versi Gratis: status Aktif, plan Starter
        const { data: tenant, error: tenantErr } = await dbAdmin.from('tenants').insert({
            name: businessName,
            subdomain: subdomain,
            subscription_plan: 'Starter',
            status: 'Aktif',
        }).select().single();

        if (tenantErr) {
            if (tenantErr.code === '23505') {
                return { success: false, message: 'Subdomain sudah digunakan. Pilih subdomain lain.' };
            }
            throw tenantErr;
        }
        createdTenantId = tenant.id;

        // 2. Buat Outlet Utama
        const { data: outlet, error: outletErr } = await dbAdmin.from('outlets').insert({
            tenant_id: tenant.id,
            name: `${businessName} - Pusat`,
            phone: phone,
            email: email,
            address: address,
            village: village,
            district: district,
            regency: regency,
            province: province,
            postal_code: postalCode,
            pbjt_active: true,
            pbjt_rate: 10,
            pbjt_mode: 'Eksklusif',
        }).select().single();

        if (outletErr) throw outletErr;
        createdOutletId = outlet.id;

        // 3. Buat akun Owner (role: Owner, password di-hash)
        const { error: userErr } = await dbAdmin.from('staff_users').insert({
            tenant_id: tenant.id,
            outlet_id: outlet.id,
            full_name: name,
            email: email.toLowerCase().trim(),
            role: 'Owner',
            is_active: true,
            pin_hash: hashedPassword,
        });

        if (userErr) throw userErr;

        // Set identification cookies — httpOnly untuk keamanan
        const cookieStore = await cookies();
        cookieStore.set('active_tenant_id', tenant.id, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30
        });
        cookieStore.set('active_outlet_id', outlet.id, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30
        });

        return {
            success: true,
            tenant_id: tenant.id,
            outlet_id: outlet.id,
            message: 'Akun berhasil dibuat! Silakan masuk.'
        };

    } catch (err) {
        console.error('Registration Error:', err);

        // Cleanup: hapus data yang sudah terbuat jika proses gagal di tengah jalan
        try {
            if (createdOutletId) {
                await dbAdmin.from('outlets').delete().eq('id', createdOutletId);
            }
            if (createdTenantId) {
                await dbAdmin.from('tenants').delete().eq('id', createdTenantId);
            }
        } catch (cleanupErr) {
            console.error('Cleanup Error after failed registration:', cleanupErr);
        }

        return { success: false, message: 'Gagal melakukan pendaftaran. Periksa kembali data Anda.' };
    }
}
