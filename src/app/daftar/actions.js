'use server';

import { dbAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

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
        const { data } = await dbAdmin
            .from('staff_users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        return { exists: !!data };
    } catch (err) {
        return { exists: false };
    }
}

export async function proceedRegistration(payload) {
    try {
        const { name, email, phone, password, businessName, businessType, province, city, subdomain } = payload;

        // Validasi email belum terdaftar
        const { exists } = await checkEmailExists(email);
        if (exists) {
            return { success: false, message: 'Email sudah terdaftar. Gunakan email lain atau masuk ke akun Anda.' };
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
            // Subdomain conflict
            if (tenantErr.code === '23505') {
                return { success: false, message: 'Subdomain sudah digunakan. Pilih subdomain lain.' };
            }
            throw tenantErr;
        }

        // 2. Buat Outlet Utama
        const { data: outlet, error: outletErr } = await dbAdmin.from('outlets').insert({
            tenant_id: tenant.id,
            name: `${businessName} - Pusat`,
            phone: phone,
            email: email,
            pbjt_active: true,
            pbjt_rate: 10,
            pbjt_mode: 'Eksklusif',
        }).select().single();

        if (outletErr) throw outletErr;

        // 3. Buat akun Owner (role: Owner, password di-hash)
        const { error: userErr } = await dbAdmin.from('staff_users').insert({
            tenant_id: tenant.id,
            outlet_id: outlet.id,
            full_name: name,
            email: email,
            role: 'Owner',
            is_active: true,
            pin_hash: hashedPassword,
        });

        if (userErr) throw userErr;

        return {
            success: true,
            tenant_id: tenant.id,
            outlet_id: outlet.id,
            message: 'Akun berhasil dibuat! Silakan masuk.'
        };

    } catch (err) {
        console.error('Registration Error:', err);
        return { success: false, message: 'Gagal melakukan pendaftaran. Periksa kembali data Anda.' };
    }
}
