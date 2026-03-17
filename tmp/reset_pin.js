const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetPin(fullName, newPin) {
    console.log(`Mencoba mereset PIN untuk: ${fullName}`);
    
    // 1. Cari user
    const { data: user, error: findError } = await supabase
        .from('staff_users')
        .select('id')
        .eq('full_name', fullName)
        .single();

    if (findError || !user) {
        console.error('User tidak ditemukan atau terjadi kesalahan:', findError?.message || 'Tidak ditemukan');
        return;
    }

    // 2. Hash PIN baru
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPin, salt);

    // 3. Update database
    const { error: updateError } = await supabase
        .from('staff_users')
        .update({ pin_hash: hash })
        .eq('id', user.id);

    if (updateError) {
        console.error('Gagal memperbarui PIN:', updateError.message);
    } else {
        console.log(`✅ PIN untuk ${fullName} berhasil diubah ke: ${newPin}`);
    }
}

// Ambil argument dari command line
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Penggunaan: node reset_pin.js "Nama Lengkap" "PIN_BARU"');
} else {
    resetPin(args[0], args[1]);
}
