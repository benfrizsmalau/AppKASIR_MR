const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
    const { data, error } = await supabase
        .from('staff_users')
        .select('id, full_name, role, is_active');
    
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }
    
    console.log('--- Daftar Staff ---');
    data.forEach(user => {
        console.log(`${user.full_name} (${user.role}) - ID: ${user.id} - Status: ${user.is_active ? 'Aktif' : 'Nonaktif'}`);
    });
}

checkUsers();
