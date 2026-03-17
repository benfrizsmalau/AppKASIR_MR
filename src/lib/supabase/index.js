import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dbAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Fungsi utilitas untuk eksekusi file SQL melalui admin klien (hanya untuk setup awal)
// karena rpc('exec_sql') terkadang di-disable karena security risk, 
// kita akan buat backend script sementara untuk mengeksekusi ini jika dimungkinkan.
