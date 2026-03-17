const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
    console.log('Memulai fetch data...');
    try {
        const { data, error } = await supabase
            .from('staff_users')
            .select('id, full_name, role, is_active')
            .limit(10);
        
        if (error) {
            console.error('Error fetching users:', error);
            return;
        }
        
        console.log('--- Daftar Staff ---');
        if (data.length === 0) {
            console.log('Tidak ada staff ditemukan.');
        }
        data.forEach(user => {
            console.log(`${user.full_name} (${user.role}) - Status: ${user.is_active ? 'Aktif' : 'Nonaktif'}`);
        });
    } catch (e) {
        console.error('Catch error:', e);
    }
}

checkUsers().then(() => console.log('Selesai.'));
