"use client";

import { useState, useRef } from "react";
import { Printer, Download, ArrowLeft, Lock, CheckCircle, AlertTriangle, Edit2, Save, X } from "lucide-react";
import { saveSPTPDNumber, lockMasaPajak } from "./actions";

const rp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const KLASIFIKASI_USAHA = [
    '1. Restoran', '2. Kafe / Kafetaria', '3. Rumah Makan / Warung Makan',
    '4. Kantin', '5. Siap Saji / Fast Food', '6. Katering', '7. Lainnya',
];

export default function SPTPDClient({ data }) {
    // Field yang dapat diedit sebelum cetak
    const [editMode, setEditMode] = useState(false);
    const [fields, setFields] = useState({
        pembayaranLainnya: data.pembayaranLainnya,
        kreditPajak: data.kreditPajak,
        sanksiAdministrasi: data.sanksiAdministrasi,
        catatanTambahan: '',
        klasifikasiUsaha: 0, // index pilihan
        lampiran: {
            sspd: false,
            rekapHarian: true,
            rekapStruk: true,
            laporanHarian: true,
            bukuBesar: true,
            lainnya: false,
        },
    });
    const [nomorBPKPD, setNomorBPKPD] = useState(data.nomorPenerimaanBPKPD || '');
    const [savingNomor, setSavingNomor] = useState(false);
    const [locking, setLocking] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Kalkulasi auto dari field yang bisa diedit
    const totalDPP = Number(data.pembayaranFnB) + Number(fields.pembayaranLainnya);
    const pajakTerutang = Math.round(totalDPP * (data.pbjtRate / 100));
    const pajakKurangLebih = pajakTerutang - Number(fields.kreditPajak);
    const jumlahHarusBayar = pajakKurangLebih + Number(fields.sanksiAdministrasi);

    const isTerlambat = data.sanksiAdministrasi > 0;

    const handlePrint = () => window.print();

    const handleSaveNomor = async () => {
        setSavingNomor(true);
        const res = await saveSPTPDNumber(data.year, data.month, nomorBPKPD);
        setSavingNomor(false);
        if (res.success) setSuccessMsg('Nomor penerimaan BPKPD berhasil disimpan.');
    };

    const handleLock = async () => {
        if (!confirm('Kunci masa pajak ini? Data tidak dapat diubah setelah dikunci.')) return;
        setLocking(true);
        const res = await lockMasaPajak(data.year, data.month);
        setLocking(false);
        if (res.success) setSuccessMsg('Masa pajak berhasil dikunci.');
    };

    const setField = (key, val) => setFields(f => ({ ...f, [key]: val }));

    return (
        <>
            {/* ===================== TOOLBAR (tidak ikut cetak) ===================== */}
            <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-primary-900 text-white px-6 py-3 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                    <a href="/pos/reports" className="flex items-center gap-2 text-accent-400 hover:text-accent-300 font-bold text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Kembali
                    </a>
                    <div className="w-px h-5 bg-white/20" />
                    <div>
                        <p className="font-black text-sm">SPTPD Pajak Restoran</p>
                        <p className="text-xs text-white/60">{data.masaPajakLabel} · {data.nomorSPTPD}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {data.isLocked && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-black">
                            <Lock className="w-3.5 h-3.5" /> DIKUNCI
                        </span>
                    )}
                    {!data.isLocked && (
                        <button
                            onClick={() => setEditMode(e => !e)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${editMode ? 'bg-accent-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                            {editMode ? <><Save className="w-4 h-4" /> Selesai Edit</> : <><Edit2 className="w-4 h-4" /> Edit Field</>}
                        </button>
                    )}
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg"
                    >
                        <Printer className="w-4 h-4" />
                        Cetak / Simpan PDF
                    </button>
                </div>
            </div>

            {/* Sukses notif */}
            {successMsg && (
                <div className="print:hidden fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-xl">
                    <CheckCircle className="w-4 h-4" /> {successMsg}
                    <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 ml-2" /></button>
                </div>
            )}

            {/* Peringatan terlambat */}
            {isTerlambat && (
                <div className="print:hidden fixed top-16 left-0 right-0 bg-red-500 text-white px-6 py-2 flex items-center gap-2 text-sm font-bold z-40">
                    <AlertTriangle className="w-4 h-4" />
                    Perhatian: SPTPD terlambat! Sanksi administrasi 2%/bulan telah dihitung otomatis.
                </div>
            )}

            {/* Panel tindakan (tidak ikut cetak) */}
            <div className="print:hidden max-w-4xl mx-auto mt-20 mb-4 px-4 flex flex-col sm:flex-row gap-4">
                {/* Catat Nomor BPKPD */}
                <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nomor Penerimaan BPKPD</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={nomorBPKPD}
                            onChange={e => setNomorBPKPD(e.target.value)}
                            disabled={data.isLocked}
                            placeholder="Isi setelah SPTPD diserahkan..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                        />
                        <button
                            onClick={handleSaveNomor}
                            disabled={savingNomor || data.isLocked || !nomorBPKPD}
                            className="px-4 py-2 bg-primary-900 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-primary-800 transition-colors"
                        >
                            {savingNomor ? '...' : 'Simpan'}
                        </button>
                    </div>
                </div>

                {/* Kunci Masa Pajak */}
                {!data.isLocked && (
                    <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kunci Masa Pajak</p>
                        <button
                            onClick={handleLock}
                            disabled={locking}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            <Lock className="w-4 h-4" />
                            {locking ? 'Mengunci...' : 'Kunci Setelah Diserahkan ke BPKPD'}
                        </button>
                        <p className="text-xs text-gray-400 mt-1">Data tidak dapat diubah setelah dikunci.</p>
                    </div>
                )}
            </div>

            {/* ===================== DOKUMEN SPTPD (ikut cetak) ===================== */}
            <div className="sptpd-wrap max-w-4xl mx-auto px-4 pb-16 print:pb-0 print:max-w-none print:px-0 print:mx-0">

                {/* ===== LEMBAR 1 — UNTUK BPKPD ===== */}
                <SPTPDLembar
                    label="LEMBAR 1 — BPKPD"
                    data={data}
                    fields={fields}
                    setField={setField}
                    editMode={editMode}
                    totalDPP={totalDPP}
                    pajakTerutang={pajakTerutang}
                    pajakKurangLebih={pajakKurangLebih}
                    jumlahHarusBayar={jumlahHarusBayar}
                    isTerlambat={isTerlambat}
                    isFirst={true}
                />

                {/* ===== LEMBAR 2 — ARSIP WP ===== */}
                <SPTPDLembar
                    label="LEMBAR 2 — ARSIP WAJIB PAJAK"
                    data={data}
                    fields={fields}
                    setField={setField}
                    editMode={false}
                    totalDPP={totalDPP}
                    pajakTerutang={pajakTerutang}
                    pajakKurangLebih={pajakKurangLebih}
                    jumlahHarusBayar={jumlahHarusBayar}
                    isTerlambat={isTerlambat}
                    isFirst={false}
                />

                {/* ===== LAMPIRAN: REKAPITULASI HARIAN ===== */}
                <LampiranRekapHarian data={data} />

                {/* ===== LAMPIRAN: BUKU BESAR PBJT ===== */}
                <LampiranBukuBesar data={data} />

                {/* ===== LAMPIRAN: DAFTAR STRUK ===== */}
                <LampiranStruk data={data} />
            </div>

            {/* CSS Print & Layout Optimization for F4 (HVS/Folio) */}
            <style>{`
                @media print {
                    @page { 
                        size: 215mm 330mm; 
                        margin: 8mm 15mm 8mm 15mm; 
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    body { 
                        background: white !important; 
                        font-family: 'Times New Roman', serif !important;
                        font-size: 9.5pt !important;
                        line-height: 1.2 !important;
                    }
                    .sptpd-wrap { margin: 0 !important; width: 100% !important; max-width: none !important; display: block !important; }
                    .sptpd-page { 
                        display: block;
                        break-after: page; 
                        page-break-after: always;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                    }
                    .sptpd-page:last-child { break-after: auto; page-break-after: auto; }
                    
                    /* Table stabilization */
                    table { page-break-inside: auto; border-collapse: collapse !important; width: 100% !important; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    
                    /* Element-specific compression for F4 */
                    .form-box { padding: 4px 6px !important; }
                    .kop-text { line-height: 1.1 !important; }
                    
                    .print-hidden, .no-print { display: none !important; }
                }

                @media screen {
                    .sptpd-page { 
                        box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15);
                        border-radius: 4px;
                        margin-bottom: 2rem;
                    }
                    .sptpd-wrap { margin-top: 1rem; }
                }
            `}</style>
        </>
    );
}

/* ===================================================================
   KOMPONEN: Lembar Formulir SPTPD (digunakan 2×)
=================================================================== */
function SPTPDLembar({ label, data, fields, setField, editMode, totalDPP, pajakTerutang, pajakKurangLebih, jumlahHarusBayar, isTerlambat, isFirst }) {
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    return (
        <div className="sptpd-page bg-white mt-6 print:mt-0 shadow-sm border border-gray-200 print:border-none p-10 print:px-2 print:py-0" style={{ fontFamily: "'Times New Roman', serif", fontSize: '10pt' }}>
            {/* Label lembar */}
            <div className="text-center py-0.5 bg-gray-50 print:bg-gray-50 border-b border-gray-300">
                <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">{label}</span>
            </div>

            <div className="p-5 print:p-2.5" style={{ border: '1.5px solid #000', margin: '0' }}>

                {/* KOP SURAT */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '60px', verticalAlign: 'middle', textAlign: 'center', padding: '1px' }}>
                                <div style={{ width: '50px', height: '50px', border: '1px solid #333', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6pt', fontWeight: 'bold' }}>LOGO</div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '1px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '11pt', lineHeight: '1.1' }}>PEMERINTAH KABUPATEN MAMBERAMO RAYA</div>
                                <div style={{ fontWeight: 'bold', fontSize: '10pt', lineHeight: '1.1' }}>BADAN PENGELOLAAN KEUANGAN DAN PENDAPATAN DAERAH</div>
                                <div style={{ fontSize: '8pt', color: '#333' }}>Jalan Poros Burmeso, Burmeso, Kabupaten Mamberamo Raya, Papua 99558</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <hr style={{ borderTop: '2.5px solid #000', margin: '1px 0 3px 0' }} />

                {/* JUDUL + Kepada */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3px' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '45%', verticalAlign: 'middle', textAlign: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>SURAT PEMBERITAHUAN PAJAK DAERAH</div>
                                <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>( SPTPD )</div>
                                <div style={{ fontWeight: 'bold', fontSize: '10pt', marginTop: '1px' }}>PAJAK RESTORAN</div>
                            </td>
                            <td style={{ width: '55%', border: '1.5px solid #000', padding: '4px 8px', verticalAlign: 'top' }}>
                                <div style={{ fontSize: '9pt' }}>Kepada Yth.</div>
                                <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>Kepala BPKPD Kabupaten Mamberamo Raya</div>
                                <div style={{ borderTop: '1px solid #ccc', marginTop: '3px', paddingTop: '3px', fontSize: '9pt' }}>
                                    <table style={{ width: '100%' }}>
                                        <tbody>
                                            <tr><td style={{ width: '60px' }}>Nama WP</td><td>:</td><td style={{ fontWeight: 'bold' }}>{data.namaWP}</td></tr>
                                            <tr><td>Alamat</td><td>:</td><td>{data.alamatWP}</td></tr>
                                            <tr><td>Masa</td><td>:</td><td style={{ fontWeight: 'bold' }}>{BULAN[data.month - 1]} / {data.year}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* BOX PERHATIAN */}
                <div style={{ border: '1.2px solid #000', padding: '3px 6px', marginBottom: '5px', fontSize: '8.5pt' }}>
                    <strong>Perhatian : </strong> 
                    1. Isi dengan HURUF CETAK. 
                    2. Diserahkan paling lambat <strong>tgl 15</strong> bulan berikutnya. 
                    3. Keterlambatan dikenakan sanksi administrasi sesuai PERDA.
                </div>

                {/* SEKSI I — IDENTITAS WP */}
                <SeksiHeader label="I. Identitas Wajib Pajak" />
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
                    <tbody>
                        <RowIdentitas label="a. Nama Wajib Pajak" value={data.namaWP} />
                        <RowIdentitas label="b. Alamat" value={data.alamatWP} />
                        <RowIdentitas label="c. Objek / Usaha" value={data.namaObjek} />
                        <RowIdentitas label="d. NPWPD" value={data.npwpd} />
                    </tbody>
                </table>

                {/* SEKSI II — DATA PAJAK */}
                <SeksiHeader label="II. Diisi Oleh Pengusaha Restoran" />

                {/* Klasifikasi usaha */}
                <div style={{ padding: '3px 6px', marginBottom: '3px', border: '1px solid #ddd', display: 'flex', gap: '6px', fontSize: '9pt' }}>
                    <strong>a. Klasifikasi:</strong> &nbsp;
                    {['Restoran', 'Kafe', 'Warung', 'Fast Food', 'Lainnya'].map((k, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <div style={{ width: '10px', height: '10px', border: '1px solid #000', textAlign: 'center', fontSize: '7pt', lineHeight: '8px' }}>{fields.klasifikasiUsaha === i ? 'X' : ''}</div>
                            {k}
                        </label>
                    ))}
                </div>

                {/* Field finansial */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <RowFinansial label="b. Pembayaran Makanan dan Minuman" value={data.pembayaranFnB} bold={false} />
                        <RowFinansialEdit label="c. Pembayaran Lain-lain" value={fields.pembayaranLainnya} editMode={editMode} onChange={v => setField('pembayaranLainnya', v)} bold={false} />
                        <RowFinansial label="d. Dasar Pengenaan Pajak (DPP) = b + c" value={totalDPP} bold={true} />
                        <RowFinansial label={`e. Pajak Terutang = ${data.pbjtRate}% × DPP`} value={pajakTerutang} bold={true} />
                        <RowFinansial label="g. Pajak Kurang / Lebih Bayar = e − f" value={pajakKurangLebih} bold={true} />
                        <RowFinansialEdit label="h. Sanksi Administrasi (Keterlambatan)" value={fields.sanksiAdministrasi} editMode={editMode} onChange={v => setField('sanksiAdministrasi', v)} bold={false} highlight={isTerlambat} />
                        <RowFinansial label="i. Jumlah Pajak Yang Harus Dibayar = g + h" value={jumlahHarusBayar} bold={true} highlight={true} />
                    </tbody>
                </table>

                {/* Lampiran */}
                <div style={{ marginTop: '5px', border: '1px solid #ddd', padding: '3px 6px', fontSize: '9pt' }}>
                    <strong>j. Lampiran: </strong>
                    rekap harian, rekap struk, laporan sistem AppKasir, buku besar PBJT.
                </div>

                {/* Tanda tangan */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', border: '1.2px solid #000' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '33%', border: '1.2px solid #000', padding: '5px', textAlign: 'center', verticalAlign: 'top', fontSize: '9pt' }}>
                                <div>Diterima Petugas,</div>
                                <div>Tgl ...../...../2026</div>
                                <div style={{ marginTop: '40px' }}>( ..................... )</div>
                                <div>NIP:</div>
                            </td>
                            <td style={{ width: '34%', border: '1.2px solid #000', padding: '5px', textAlign: 'center', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '8.5pt' }}>SPTPD-REST</div>
                                <div style={{ fontSize: '7.5pt', color: '#555' }}>{data.nomorSPTPD}</div>
                                <div style={{ marginTop: '40px', fontSize: '7.5pt' }}>Mamberamo Raya, {data.tanggalGenerate}</div>
                            </td>
                            <td style={{ width: '33%', border: '1.2px solid #000', padding: '5px', textAlign: 'center', verticalAlign: 'top', fontSize: '9pt' }}>
                                <div>Penanggung Pajak,</div>
                                <div style={{ marginTop: '40px' }}>( ..................... )</div>
                                <div>Nama Jelas / Cap Stempel</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

            </div>
        </div>
    );
}

/* ===================================================================
   LAMPIRAN 3 — REKAPITULASI HARIAN
=================================================================== */
function LampiranRekapHarian({ data }) {
    const total = data.rekapHarian.reduce((acc, r) => ({
        jumlahTransaksi: acc.jumlahTransaksi + r.jumlahTransaksi,
        totalPenjualan: acc.totalPenjualan + r.totalPenjualan,
        totalDPP: acc.totalDPP + r.totalDPP,
        totalPBJT: acc.totalPBJT + r.totalPBJT,
    }), { jumlahTransaksi: 0, totalPenjualan: 0, totalDPP: 0, totalPBJT: 0 });

    return (
        <div className="sptpd-page bg-white mt-6 print:mt-0 shadow-sm border border-gray-200 print:border-none p-8 print:p-0" style={{ fontFamily: "'Times New Roman', serif", fontSize: '10pt', border: '2px solid #000' }}>
            <LampiranHeader title="REKAPITULASI PENJUALAN HARIAN" data={data} lampiran="Lampiran b" />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                <thead>
                    <tr style={{ background: '#e8e8e8' }}>
                        <th style={thStyle}>No.</th>
                        <th style={thStyle}>Tanggal</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Jml Transaksi</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Total Penjualan (Rp)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>DPP (Rp)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>PBJT 10% (Rp)</th>
                    </tr>
                </thead>
                <tbody>
                    {data.rekapHarian.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Tidak ada data transaksi dalam masa pajak ini.</td></tr>
                    )}
                    {data.rekapHarian.map((r, i) => (
                        <tr key={r.tanggal} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                            <td style={tdStyle}>{i + 1}</td>
                            <td style={tdStyle}>{new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>{r.jumlahTransaksi}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{r.totalPenjualan.toLocaleString('id-ID')}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{r.totalDPP.toLocaleString('id-ID')}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{r.totalPBJT.toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                    <tr style={{ background: '#e8e8e8', fontWeight: 'bold' }}>
                        <td colSpan={2} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{total.jumlahTransaksi}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{total.totalPenjualan.toLocaleString('id-ID')}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{total.totalDPP.toLocaleString('id-ID')}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{total.totalPBJT.toLocaleString('id-ID')}</td>
                    </tr>
                </tbody>
            </table>
            <p style={{ marginTop: '8px', fontSize: '9pt', color: '#555' }}>* Data diambil dari sistem AppKasir — hanya transaksi berstatus Selesai.</p>
        </div>
    );
}

/* ===================================================================
   LAMPIRAN 4 — BUKU BESAR PBJT
=================================================================== */
function LampiranBukuBesar({ data }) {
    const total = data.jurnalPBJT.reduce((acc, j) => ({
        dpp: acc.dpp + j.dpp,
        pbjt: acc.pbjt + j.pbjt,
        total: acc.total + j.total,
    }), { dpp: 0, pbjt: 0, total: 0 });

    return (
        <div className="sptpd-page bg-white mt-6 print:mt-0 shadow-sm border border-gray-200 print:border-none p-8 print:p-0" style={{ fontFamily: "'Times New Roman', serif", fontSize: '10pt', border: '2px solid #000' }}>
            <LampiranHeader title="BUKU BESAR PBJT MASA PAJAK" data={data} lampiran="Lampiran e" />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                <thead>
                    <tr style={{ background: '#e8e8e8' }}>
                        <th style={thStyle}>No.</th>
                        <th style={thStyle}>Tanggal</th>
                        <th style={thStyle}>No. Struk</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>DPP (Rp)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>PBJT 10% (Rp)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Total Bayar (Rp)</th>
                    </tr>
                </thead>
                <tbody>
                    {data.jurnalPBJT.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Tidak ada jurnal PBJT dalam masa pajak ini.</td></tr>
                    )}
                    {data.jurnalPBJT.map((j, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                            <td style={tdStyle}>{i + 1}</td>
                            <td style={tdStyle}>{j.tanggal}</td>
                            <td style={tdStyle}>{j.nomor}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{j.dpp.toLocaleString('id-ID')}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{j.pbjt.toLocaleString('id-ID')}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{j.total.toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                    <tr style={{ background: '#e8e8e8' }}>
                        <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{total.dpp.toLocaleString('id-ID')}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{total.pbjt.toLocaleString('id-ID')}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{total.total.toLocaleString('id-ID')}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

/* ===================================================================
   LAMPIRAN 5 — REKAPITULASI STRUK
=================================================================== */
function LampiranStruk({ data }) {
    return (
        <div className="sptpd-page bg-white mt-6 print:mt-0 shadow-sm border border-gray-200 print:border-none p-8 print:p-0" style={{ fontFamily: "'Times New Roman', serif", fontSize: '10pt', border: '2px solid #000' }}>
            <LampiranHeader title="REKAPITULASI PENGGUNAAN BON / STRUK" data={data} lampiran="Lampiran c" />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                <thead>
                    <tr style={{ background: '#e8e8e8' }}>
                        <th style={thStyle}>No.</th>
                        <th style={thStyle}>No. Struk</th>
                        <th style={thStyle}>Tanggal</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Total (Rp)</th>
                    </tr>
                </thead>
                <tbody>
                    {data.daftarStruk.length === 0 && (
                        <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Tidak ada struk dalam masa pajak ini.</td></tr>
                    )}
                    {data.daftarStruk.map((s, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                            <td style={tdStyle}>{i + 1}</td>
                            <td style={tdStyle}>{s.nomor}</td>
                            <td style={tdStyle}>{s.tanggal}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{s.total.toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p style={{ marginTop: '8px', fontSize: '9pt', color: '#555' }}>
                Total {data.daftarStruk.length} struk — Masa Pajak {data.masaPajakLabel}
            </p>
        </div>
    );
}

/* ===================================================================
   KOMPONEN KECIL — Helper
=================================================================== */
function LampiranHeader({ title, data, lampiran }) {
    return (
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>{title}</div>
            <div style={{ fontSize: '10pt' }}>Masa Pajak: {data.masaPajakLabel} · {data.namaObjek}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '9pt', color: '#555' }}>
                <span>NPWPD: {data.npwpd}</span>
                <span>{lampiran} — SPTPD {data.nomorSPTPD}</span>
            </div>
        </div>
    );
}

function SeksiHeader({ label }) {
    return (
        <div style={{ background: '#e0e0e0', fontWeight: 'bold', padding: '3px 8px', marginBottom: '4px', marginTop: '8px', fontSize: '10pt', border: '1px solid #ccc' }}>
            {label}
        </div>
    );
}

function RowIdentitas({ label, value }) {
    return (
        <tr>
            <td style={{ padding: '3px 8px', width: '200px', fontSize: '10pt' }}>{label}</td>
            <td style={{ padding: '3px 4px', width: '10px', fontSize: '10pt' }}>:</td>
            <td style={{ padding: '3px 8px', borderBottom: '1px dotted #aaa', fontWeight: '600', fontSize: '10pt' }}>{value}</td>
        </tr>
    );
}

function RowFinansial({ label, value, bold, highlight }) {
    return (
        <tr style={{ background: highlight ? '#fffde7' : 'transparent' }}>
            <td style={{ padding: '4px 8px', fontSize: '10pt', fontWeight: bold ? 'bold' : 'normal' }}>{label}</td>
            <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: bold ? 'bold' : 'normal', fontSize: '10pt', minWidth: '180px', borderBottom: '1px solid #eee' }}>
                Rp {Number(value || 0).toLocaleString('id-ID')}
            </td>
        </tr>
    );
}

function RowFinansialEdit({ label, value, editMode, onChange, bold, highlight }) {
    return (
        <tr style={{ background: highlight ? '#fff3e0' : 'transparent' }}>
            <td style={{ padding: '4px 8px', fontSize: '10pt', fontWeight: bold ? 'bold' : 'normal' }}>{label}</td>
            <td style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                {editMode ? (
                    <input
                        type="number"
                        value={value}
                        onChange={e => onChange(Number(e.target.value))}
                        min={0}
                        style={{ width: '160px', textAlign: 'right', border: '1px solid #aaa', borderRadius: '4px', padding: '2px 6px', fontSize: '10pt' }}
                    />
                ) : (
                    <span style={{ fontWeight: bold ? 'bold' : 'normal', fontSize: '10pt' }}>
                        Rp {Number(value || 0).toLocaleString('id-ID')}
                    </span>
                )}
            </td>
        </tr>
    );
}

const thStyle = { padding: '5px 8px', border: '1px solid #ccc', textAlign: 'left', fontSize: '10pt', fontWeight: 'bold' };
const tdStyle = { padding: '3px 8px', border: '1px solid #ddd', fontSize: '10pt' };
