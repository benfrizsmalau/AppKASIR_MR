const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
    console.log('--- SETTING UP SUPABASE STORAGE ---');

    // 1. Create the bucket
    const { data: bucket, error: bucketErr } = await supabase
        .storage
        .createBucket('menu-images', {
            public: true,
            fileSizeLimit: 1024 * 1024 * 2, // 2MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        });

    if (bucketErr) {
        if (bucketErr.message.includes('already exists')) {
            console.log('Bucket "menu-images" already exists.');
        } else {
            console.error('Error creating bucket:', bucketErr);
            return;
        }
    } else {
        console.log('Bucket "menu-images" created successfully.');
    }

    // 2. Set up RLS Policies for the bucket (via RPC if possible, or just let user know)
    // Note: Creating storage policies via JS client is limited. Usually done via SQL.
    // I will try to run SQL to ensure policies are set.

    console.log('--- STORAGE SETUP COMPLETE ---');
}

setupStorage();
