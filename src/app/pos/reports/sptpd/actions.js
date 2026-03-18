'use server';

import { dbAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

async function getActiveContext() {
    const cookieStore = await cookies();
    return {
        tenant_id: cookieStore.get('active_tenant_id')?.value,
        outlet_id: cookieStore.get('active_outlet_id')?.value,
    };
}

const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Hitung sanksi administrasi:
 * Terlambat jika hari ini > tanggal 15 bulan berikutnya setelah masa pajak.
 * Sanksi = 2% × pajak terutang per bulan keterlambatan.
 */
function hitungSanksi(year, month, pajakTerutang) {
    const batasTanggal = new Date(year, month, 15); // month = bulan berikutnya (0-indexed sudah +1)
    const today = new Date();
    if (today <= batasTanggal) return 0;

    // Hitung selisih bulan
    const diffMs = today - batasTanggal;
    const diffBulan = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30));
    return Math.round(pajakTerutang * 0.02 * diffBulan);
}

/**
 * Generate nomor SPTPD: SPTPD-REST-9408-[YYYY]-[MM]-[NNNN]
 */
function generateNomorSPTPD(year, month, urut = 1) {
    const mm = String(month).padStart(2, '0');
    const nn = String(urut).padStart(4, '0');
    return `SPTPD-REST-9408-${year}-${mm}-${nn}`;
}

/**
 * Ambil semua data yang diperlukan untuk generate SPTPD sebuah masa pajak.
 */
export async function getSPTPDData(year, month) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id || !outlet_id) return { success: false, message: 'Sesi tidak valid' };

        const yr = parseInt(year);
        const mn = parseInt(month);

        // 1. Data outlet (identitas WP)
        const { data: outlet, error: outletErr } = await dbAdmin
            .from('outlets')
            .select('id, name, address, phone, email, npwpd, pbjt_rate, pbjt_mode')
            .eq('id', outlet_id)
            .single();
        if (outletErr) throw outletErr;

        // 2. Data tenant (nama usaha)
        const { data: tenant, error: tenantErr } = await dbAdmin
            .from('tenants')
            .select('id, name')
            .eq('id', tenant_id)
            .single();
        if (tenantErr) throw tenantErr;

        // 3. Data masa pajak dari pbjt_periods
        const { data: masaPajak, error: mpErr } = await dbAdmin
            .from('pbjt_periods')
            .select('*')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .eq('year', yr)
            .eq('month', mn)
            .maybeSingle();
        if (mpErr) throw mpErr;

        // 4. Data orders harian dalam masa pajak (untuk rekapitulasi harian)
        const startDate = new Date(yr, mn - 1, 1).toISOString();
        const endDate = new Date(yr, mn, 0, 23, 59, 59).toISOString(); // hari terakhir bulan

        const { data: orders, error: ordersErr } = await dbAdmin
            .from('orders')
            .select('id, order_number, created_at, subtotal, dpp_total, pbjt_total, grand_total, status, is_credit, payments(payment_method, amount_paid)')
            .eq('tenant_id', tenant_id)
            .eq('outlet_id', outlet_id)
            .eq('status', 'Selesai')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: true });
        if (ordersErr) throw ordersErr;

        // 5. Rekapitulasi harian: group by tanggal
        const harianMap = {};
        orders.forEach(ord => {
            const tgl = new Date(ord.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
            if (!harianMap[tgl]) {
                harianMap[tgl] = { tanggal: tgl, jumlahTransaksi: 0, totalPenjualan: 0, totalDPP: 0, totalPBJT: 0, totalGrand: 0 };
            }
            harianMap[tgl].jumlahTransaksi++;
            harianMap[tgl].totalPenjualan += Number(ord.subtotal);
            harianMap[tgl].totalDPP += Number(ord.dpp_total);
            harianMap[tgl].totalPBJT += Number(ord.pbjt_total);
            harianMap[tgl].totalGrand += Number(ord.grand_total);
        });
        const rekapHarian = Object.values(harianMap).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

        // 6. Daftar nomor struk/bon
        const daftarStruk = orders.map(o => ({
            nomor: o.order_number,
            tanggal: new Date(o.created_at).toLocaleDateString('id-ID'),
            total: Number(o.grand_total),
        }));

        // 7. Hitung total dari orders (jika pbjt_periods belum ada)
        const totalFromOrders = orders.reduce((acc, o) => ({
            totalGross: acc.totalGross + Number(o.subtotal),
            totalDPP: acc.totalDPP + Number(o.dpp_total),
            totalPBJT: acc.totalPBJT + Number(o.pbjt_total),
            txCount: acc.txCount + 1,
        }), { totalGross: 0, totalDPP: 0, totalPBJT: 0, txCount: 0 });

        // Gunakan data pbjt_periods jika ada, fallback ke kalkulasi dari orders
        const totalGross = masaPajak ? Number(masaPajak.total_gross || masaPajak.total_dpp) : totalFromOrders.totalGross;
        const totalDPP = masaPajak ? Number(masaPajak.total_dpp) : totalFromOrders.totalDPP;
        const totalPBJT = masaPajak ? Number(masaPajak.total_pbjt) : totalFromOrders.totalPBJT;
        const txCount = masaPajak ? masaPajak.tx_count : totalFromOrders.txCount;

        // 8. Hitung sanksi otomatis
        const sanksiOtomatis = hitungSanksi(yr, mn, totalPBJT);

        // 9. Nomor SPTPD
        const nomorSPTPD = masaPajak?.sptpd_number || generateNomorSPTPD(yr, mn);

        // 10. Status masa pajak
        const statusMasaPajak = masaPajak
            ? (masaPajak.is_locked ? 'Dikunci' : 'Terbuka')
            : 'Belum Ada Data';

        return {
            success: true,
            data: {
                // Metadata
                nomorSPTPD,
                masaPajakLabel: `${MONTH_NAMES_ID[mn - 1]} ${yr}`,
                year: yr,
                month: mn,
                statusMasaPajak,
                isLocked: masaPajak?.is_locked || false,
                tanggalGenerate: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),

                // Identitas WP (dari outlet)
                namaWP: tenant.name,
                alamatWP: outlet.address || '-',
                namaObjek: outlet.name,
                alamatObjek: outlet.address || '-',
                npwpd: outlet.npwpd || '-',
                telepon: outlet.phone || '-',

                // Data finansial (dari pbjt_periods / kalkulasi orders)
                pembayaranFnB: totalGross,     // field b — bisa diedit
                pembayaranLainnya: 0,           // field c — bisa diedit
                totalDPP,                       // field d = b + c (auto)
                pajakTerutang: totalPBJT,       // field e = 10% × DPP (auto)
                kreditPajak: 0,                 // field f — bisa diedit
                pajakKurangLebih: totalPBJT,    // field g = e - f (auto)
                sanksiAdministrasi: sanksiOtomatis, // field h — bisa diedit
                jumlahPajakHarusBayar: totalPBJT + sanksiOtomatis, // field i = g + h (auto)

                // Detail
                txCount,
                pbjtRate: outlet.pbjt_rate || 10,
                pbjtMode: outlet.pbjt_mode || 'Eksklusif',

                // Lampiran
                rekapHarian,
                daftarStruk,
                jurnalPBJT: orders.map(o => ({
                    tanggal: new Date(o.created_at).toLocaleDateString('id-ID'),
                    nomor: o.order_number,
                    dpp: Number(o.dpp_total),
                    pbjt: Number(o.pbjt_total),
                    total: Number(o.grand_total),
                })),

                // Nomor penerimaan BPKPD (jika sudah disetor)
                nomorPenerimaanBPKPD: masaPajak?.sptpd_number || '',
            },
        };
    } catch (err) {
        console.error('getSPTPDData error:', err);
        return { success: false, message: err.message };
    }
}

/**
 * Simpan nomor penerimaan BPKPD ke pbjt_periods
 */
export async function saveSPTPDNumber(year, month, nomorBPKPD) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id || !outlet_id) return { success: false, message: 'Sesi tidak valid' };

        const { error } = await dbAdmin
            .from('pbjt_periods')
            .upsert({
                tenant_id,
                outlet_id,
                year: parseInt(year),
                month: parseInt(month),
                sptpd_number: nomorBPKPD,
                reported_at: new Date().toISOString(),
            }, { onConflict: 'tenant_id,outlet_id,year,month' });

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, message: err.message };
    }
}

/**
 * Kunci masa pajak setelah SPTPD diserahkan
 */
export async function lockMasaPajak(year, month, cookieUserId) {
    try {
        const { tenant_id, outlet_id } = await getActiveContext();
        if (!tenant_id || !outlet_id) return { success: false, message: 'Sesi tidak valid' };

        const cookieStore = await cookies();
        const userId = cookieUserId || cookieStore.get('session_user_id')?.value;

        const { error } = await dbAdmin
            .from('pbjt_periods')
            .upsert({
                tenant_id,
                outlet_id,
                year: parseInt(year),
                month: parseInt(month),
                is_locked: true,
                locked_at: new Date().toISOString(),
                locked_by_user_id: userId || null,
            }, { onConflict: 'tenant_id,outlet_id,year,month' });

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, message: err.message };
    }
}
