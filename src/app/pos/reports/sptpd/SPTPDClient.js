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

            {/* CSS Print */}
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 20mm 20mm 20mm 25mm; }
                    body { background: white !important; }
                    .sptpd-page { page-break-after: always; }
                    .sptpd-page:last-child { page-break-after: avoid; }
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
        <div className="sptpd-page bg-white mt-6 print:mt-0 shadow-sm border border-gray-200 print:border-none print:shadow-none" style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt', lineHeight: '1.5' }}>
            {/* Label lembar */}
            <div className="text-center py-1 bg-gray-100 print:bg-gray-100 border-b border-gray-300">
                <span className="text-xs font-bold tracking-widest text-gray-600 uppercase">{label}</span>
            </div>

            <div className="p-8 print:p-0" style={{ border: '2px solid #000', margin: '0' }}>

                {/* KOP SURAT */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '80px', verticalAlign: 'middle', textAlign: 'center', padding: '4px' }}>
                                {/* Logo placeholder */}
                                <div style={{ width: '70px', height: '70px', border: '2px solid #555', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt', textAlign: 'center', fontWeight: 'bold', color: '#555' }}>
                                    LOGO<br/>KAB.
                                </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '4px', verticalAlign: 'middle' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>PEMERINTAH KABUPATEN MAMBERAMO RAYA</div>
                                <div style={{ fontWeight: 'bold', fontSize: '11pt', marginTop: '2px' }}>BADAN PENGELOLAAN KEUANGAN DAN PENDAPATAN DAERAH</div>
                                <div style={{ fontSize: '10pt', marginTop: '2px' }}>Jalan Poros Burmeso, Burmeso, Kabupaten Mamberamo Raya, Papua 99558</div>
                                <div style={{ fontSize: '10pt' }}>Telepon: (0984) 21001 · Faksimile: (0984) 21002</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <hr style={{ borderTop: '3px solid #000', margin: '0 0 6px 0' }} />
                <hr style={{ borderTop: '1px solid #000', margin: '0 0 8px 0' }} />

                {/* JUDUL + Kepada */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '45%', verticalAlign: 'top', padding: '4px 8px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '13pt', textAlign: 'center' }}>SURAT PEMBERITAHUAN PAJAK DAERAH</div>
                                <div style={{ fontWeight: 'bold', fontSize: '13pt', textAlign: 'center' }}>( SPTPD )</div>
                                <div style={{ fontWeight: 'bold', fontSize: '12pt', textAlign: 'center', marginTop: '4px' }}>PAJAK RESTORAN</div>
                            </td>
                            <td style={{ width: '55%', border: '1px solid #000', padding: '6px 10px', verticalAlign: 'top' }}>
                                <div>Kepada Yth.</div>
                                <div style={{ fontWeight: 'bold' }}>Kepala BPKPD Kabupaten Mamberamo Raya</div>
                                <div style={{ borderTop: '1px solid #aaa', marginTop: '6px', paddingTop: '6px' }}>
                                    <table style={{ width: '100%' }}>
                                        <tbody>
                                            <tr><td>Nama WP</td><td>:</td><td style={{ fontWeight: 'bold' }}>{data.namaWP}</td></tr>
                                            <tr><td>Alamat</td><td>:</td><td>{data.alamatWP}</td></tr>
                                            <tr><td style={{ paddingTop: '4px' }}>Masa Pajak</td><td>:</td><td style={{ fontWeight: 'bold' }}>{BULAN[data.month - 1]} / {data.year}</td></tr>
                                            <tr><td>di</td><td>:</td><td>Mamberamo Raya</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* BOX PERHATIAN */}
                <div style={{ border: '1px solid #000', padding: '6px 10px', marginBottom: '8px', fontSize: '10pt' }}>
                    <strong>Perhatian :</strong>
                    <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        <li>Formulir diisi dalam rangkap 2 dan ditulis dengan huruf CETAK.</li>
                        <li>Beri nomor pada kotak yang tersedia sesuai jawaban yang diberikan.</li>
                        <li>Setelah diisi dan ditandatangani, harap diserahkan kepada BPKPD Kabupaten Mamberamo Raya paling lambat <strong>tanggal 15 bulan berikutnya</strong>.</li>
                        <li>Keterlambatan penyerahan SPTPD dikenakan sanksi sesuai Peraturan Daerah yang berlaku.</li>
                    </ol>
                </div>

                {/* SEKSI I — IDENTITAS WP */}
                <SeksiHeader label="I. Identitas Wajib Pajak" />
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                    <tbody>
                        <RowIdentitas label="a. Nama Wajib Pajak" value={data.namaWP} />
                        <RowIdentitas label="b. Alamat" value={data.alamatWP} />
                        <RowIdentitas label="c. Nama Objek / Usaha" value={data.namaObjek} />
                        <RowIdentitas label="d. Alamat Objek / Usaha" value={data.alamatObjek} />
                        <RowIdentitas label="e. NPWPD" value={data.npwpd} />
                    </tbody>
                </table>

                {/* SEKSI II — DATA PAJAK */}
                <SeksiHeader label="II. Diisi Oleh Pengusaha Restoran" />

                {/* Klasifikasi usaha */}
                <div style={{ padding: '4px 8px', marginBottom: '4px', border: '1px solid #ddd', display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '10pt' }}>
                    <strong>a.</strong> Klasifikasi Usaha: &nbsp;
                    {['Restoran', 'Kafe / Kafetaria', 'Rumah Makan / Warung', 'Kantin', 'Siap Saji', 'Katering', 'Lainnya'].map((k, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: editMode ? 'pointer' : 'default' }}>
                            <input
                                type="radio"
                                name={`klasifikasi-${label}`}
                                checked={fields.klasifikasiUsaha === i}
                                onChange={() => editMode && setField('klasifikasiUsaha', i)}
                                readOnly={!editMode}
                                style={{ accentColor: '#1e3a5f' }}
                            />
                            {i + 1}. {k}
                        </label>
                    ))}
                </div>

                {/* Field finansial */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <RowFinansial label="b. Pembayaran Makanan dan Minuman" value={data.pembayaranFnB} bold={false} />
                        <RowFinansialEdit
                            label="c. Pembayaran Lain-lain (minuman beralkohol, rokok, dll.)"
                            value={fields.pembayaranLainnya}
                            editMode={editMode}
                            onChange={v => setField('pembayaranLainnya', v)}
                            bold={false}
                        />
                        <RowFinansial label="d. Dasar Pengenaan Pajak (DPP) = b + c" value={totalDPP} bold={true} />
                        <RowFinansial label={`e. Pajak Terutang = ${data.pbjtRate}% × DPP`} value={pajakTerutang} bold={true} />
                        <RowFinansialEdit
                            label="f. Kredit Pajak / Setoran Masa Lalu"
                            value={fields.kreditPajak}
                            editMode={editMode}
                            onChange={v => setField('kreditPajak', v)}
                            bold={false}
                        />
                        <RowFinansial label="g. Pajak Kurang / Lebih Bayar = e − f" value={pajakKurangLebih} bold={true} />
                        <RowFinansialEdit
                            label="h. Sanksi Administrasi (jika terlambat)"
                            value={fields.sanksiAdministrasi}
                            editMode={editMode}
                            onChange={v => setField('sanksiAdministrasi', v)}
                            bold={false}
                            highlight={isTerlambat}
                        />
                        <RowFinansial label="i. Jumlah Pajak Yang Harus Dibayar = g + h" value={jumlahHarusBayar} bold={true} highlight={true} />
                    </tbody>
                </table>

                {/* Lampiran */}
                <div style={{ marginTop: '8px', border: '1px solid #ddd', padding: '6px 10px', fontSize: '10pt' }}>
                    <strong>j. Data Pendukung / Lampiran</strong>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
                        <thead>
                            <tr style={{ background: '#f0f0f0' }}>
                                <th style={{ padding: '3px 8px', border: '1px solid #ccc', textAlign: 'left' }}>Jenis Lampiran</th>
                                <th style={{ padding: '3px 8px', border: '1px solid #ccc', textAlign: 'center', width: '120px' }}>Keterangan</th>
                                <th style={{ padding: '3px 8px', border: '1px solid #ccc', textAlign: 'center', width: '80px' }}>Jml Hal.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { key: 'sspd', label: 'a) Surat Setoran Pajak Daerah (SSPD)', hal: '-' },
                                { key: 'rekapHarian', label: 'b) Rekapitulasi Penjualan / Omzet Harian', hal: '1' },
                                { key: 'rekapStruk', label: 'c) Rekapitulasi Penggunaan Bon / Struk', hal: '1' },
                                { key: 'laporanHarian', label: 'd) Laporan Harian AppKasir (auto-generate)', hal: `${Math.ceil(data.rekapHarian.length / 20) || 1}` },
                                { key: 'bukuBesar', label: 'e) Buku Besar PBJT masa ini (auto-generate)', hal: `${Math.ceil(data.jurnalPBJT.length / 30) || 1}` },
                                { key: 'lainnya', label: 'f) Dokumen pendukung lainnya', hal: '-' },
                            ].map(item => (
                                <tr key={item.key}>
                                    <td style={{ padding: '3px 8px', border: '1px solid #ccc' }}>{item.label}</td>
                                    <td style={{ padding: '3px 8px', border: '1px solid #ccc', textAlign: 'center' }}>
                                        {editMode ? (
                                            <select
                                                value={fields.lampiran[item.key] ? 'Ada' : 'Tidak Ada'}
                                                onChange={e => setField('lampiran', { ...fields.lampiran, [item.key]: e.target.value === 'Ada' })}
                                                style={{ fontSize: '10pt', border: '1px solid #aaa', borderRadius: '4px', padding: '1px 4px' }}
                                            >
                                                <option>Ada</option>
                                                <option>Tidak Ada</option>
                                            </select>
                                        ) : (
                                            <span style={{ fontWeight: fields.lampiran[item.key] ? 'bold' : 'normal' }}>
                                                {fields.lampiran[item.key] ? 'Ada' : 'Tidak Ada'}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '3px 8px', border: '1px solid #ccc', textAlign: 'center' }}>{fields.lampiran[item.key] ? item.hal : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Catatan tambahan */}
                {(editMode || fields.catatanTambahan) && isFirst && (
                    <div style={{ marginTop: '6px', fontSize: '10pt' }}>
                        <strong>Catatan Tambahan:</strong>
                        {editMode ? (
                            <textarea
                                value={fields.catatanTambahan}
                                onChange={e => setField('catatanTambahan', e.target.value)}
                                rows={2}
                                style={{ width: '100%', border: '1px solid #aaa', borderRadius: '4px', padding: '4px', fontFamily: 'inherit', fontSize: '10pt', marginTop: '4px', resize: 'vertical' }}
                                placeholder="Catatan bebas untuk BPKPD..."
                            />
                        ) : (
                            <p style={{ marginTop: '4px', padding: '4px 8px', background: '#fafafa', border: '1px solid #eee' }}>{fields.catatanTambahan}</p>
                        )}
                    </div>
                )}

                {/* Tanda tangan */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', border: '1px solid #000' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '33%', border: '1px solid #000', padding: '8px', textAlign: 'center', verticalAlign: 'top' }}>
                                <div>Diterima oleh Petugas,</div>
                                <div>Tanggal ......./......./{data.year}</div>
                                <div style={{ marginTop: '60px' }}>(.....................)</div>
                                <div>NIP:</div>
                            </td>
                            <td style={{ width: '34%', border: '1px solid #000', padding: '8px', textAlign: 'center', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>Nomor Formulir</div>
                                <div style={{ fontWeight: 'bold', fontSize: '11pt', marginTop: '4px' }}>SPTPD-REST</div>
                                <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>Kabupaten Mamberamo Raya</div>
                                <div style={{ marginTop: '4px', fontSize: '10pt' }}>DPD - 11 (Rev. 2026)</div>
                                <div style={{ marginTop: '8px', fontSize: '9pt', color: '#555' }}>{data.nomorSPTPD}</div>
                            </td>
                            <td style={{ width: '33%', border: '1px solid #000', padding: '8px', textAlign: 'center', verticalAlign: 'top' }}>
                                <div>WP / Penanggung Pajak / Kuasa,</div>
                                <div>Mamberamo Raya, {data.tanggalGenerate}</div>
                                <div style={{ marginTop: '60px' }}>(.....................)</div>
                                <div>Nama Jelas / Cap / Stempel</div>
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
