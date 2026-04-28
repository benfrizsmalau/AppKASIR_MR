import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Test koneksi ke Supabase
    let dbTest = 'not tested';
    try {
        const db = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data, error } = await db.from('staff_users').select('id').limit(1);
        dbTest = error ? `ERROR: ${error.message} (code: ${error.code})` : `OK - found ${data?.length ?? 0} row(s)`;
    } catch (e) {
        dbTest = `EXCEPTION: ${e.message}`;
    }

    return NextResponse.json({
        env: {
            SUPABASE_URL: url ? `${url.slice(0, 30)}...` : 'MISSING',
            ANON_KEY: anonKey ? `${anonKey.slice(0, 20)}...` : 'MISSING',
            SERVICE_KEY: serviceKey ? `${serviceKey.slice(0, 20)}...${serviceKey.slice(-6)}` : 'MISSING',
            SERVICE_KEY_LENGTH: serviceKey?.length ?? 0,
        },
        db_connection: dbTest,
        node_env: process.env.NODE_ENV,
    });
}
