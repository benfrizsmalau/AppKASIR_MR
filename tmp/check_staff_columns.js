const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'staff_users' });
    if (error) {
        // If RPC doesn't exist, try a simple select
        console.log("RPC failed, trying select * limit 1");
        const { data: sample, error: err2 } = await supabase.from('staff_users').select('*').limit(1);
        if (err2) {
            console.error(err2);
        } else {
            console.log("Columns:", Object.keys(sample[0] || {}));
        }
    } else {
        console.log(data);
    }
}

checkColumns();
