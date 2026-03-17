const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
    const { data, error } = await supabase
        .from('staff_users')
        .select('full_name, pin_hash, role');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('--- Data PIN Staff ---');
    data.forEach(user => {
        console.log(`User: ${user.full_name}, Role: ${user.role}, PIN/Hash: ${user.pin_hash}`);
    });
}

checkUsers();
