const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function hashAllPins() {
    console.log('📖 Membaca data staff...');
    const { data: users, error: fetchError } = await supabase
        .from('staff_users')
        .select('id, full_name, pin_hash');

    if (fetchError) {
        console.error('Error fetching users:', fetchError.message);
        return;
    }

    console.log(`Ditemukan ${users.length} user. Mulai hashing...`);

    for (const user of users) {
        // Cek apakah sudah ter-hash (bcrypt dimulai dengan $2)
        if (user.pin_hash && user.pin_hash.startsWith('$2')) {
            console.log(`[SKIP] ${user.full_name} sudah ter-hash.`);
            continue;
        }

        console.log(`[HASH] Mengenkripsi PIN untuk ${user.full_name}...`);
        const salt = bcrypt.genSaltSync(10);
        const hashedPin = bcrypt.hashSync(user.pin_hash || '123456', salt);

        const { error: updateError } = await supabase
            .from('staff_users')
            .update({ pin_hash: hashedPin })
            .eq('id', user.id);

        if (updateError) {
            console.error(`❌ Gagal update ${user.full_name}:`, updateError.message);
        } else {
            console.log(`✅ ${user.full_name} berhasil diperbarui.`);
        }
    }

    console.log('🎉 Selesai!');
}

hashAllPins();
