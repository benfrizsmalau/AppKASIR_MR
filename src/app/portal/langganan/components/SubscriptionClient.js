"use client";

import {
    Gift, CheckCircle2, Star, FileText, ExternalLink,
    CalendarDays, ArrowUpRight, MessageCircle, Shield
} from "lucide-react";

const FREE_FEATURES = [
    'Kasir POS (Dine-In, Takeaway, Delivery)',
    'Manajemen Menu & Kategori',
    'Manajemen Meja & QR Order',
    'Laporan Penjualan Harian',
    'Laporan PBJT & Pajak Daerah',
    'Inventaris Bahan Baku & Resep',
    'Manajemen Hutang Pelanggan',
    'Multi Kasir dengan PIN',
    'Pembatalan & Audit Log',
    'Portal Pemilik (Dashboard Owner)',
];

const PRO_FEATURES = [
    'Semua fitur Gratis +',
    'Hingga 3 Outlet / Cabang',
    'KDS — Kitchen Display System',
    'Laporan Analitik Lanjutan',
    'Ekspor PDF & Excel',
    'Dukungan Prioritas via WhatsApp',
    'Multi-outlet dalam satu akun',
    'Integrasi printer cloud',
];

export default function SubscriptionClient({ tenant, initialInvoices }) {
    const invoices = initialInvoices || [];

    if (!tenant) return <p className="text-red-500 font-bold">Data Tenant tidak ditemukan.</p>;

    const createdAt = tenant.created_at ? new Date(tenant.created_at) : new Date();
    const formattedDate = createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <header className="border-b pb-6">
                <h1 className="text-3xl font-black text-primary-900 tracking-tight flex items-center gap-3">
                    <Gift className="w-8 h-8 text-green-500" /> Langganan & Paket
                </h1>
                <p className="text-gray-500 font-medium mt-1">Status langganan dan detail paket aktif usaha Anda.</p>
            </header>

            {/* ── Banner Paket Aktif ─────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-[32px] p-8 relative overflow-hidden shadow-2xl shadow-green-700/20">
                <div className="absolute top-0 right-0 w-64 h-64 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-green-600 to-green-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <p className="text-xs font-black text-green-200 uppercase tracking-widest mb-2">Paket Aktif Anda</p>
                        <h2 className="text-4xl font-black mb-1 flex items-center gap-3">
                            Gratis <Star className="w-8 h-8 text-yellow-300 fill-yellow-300" />
                        </h2>
                        <p className="text-green-100 text-sm font-medium">Aktif sejak {formattedDate} · Berlaku Selamanya</p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-3">
                        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-green-700 font-black text-sm shadow-md">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Aktif Selamanya
                        </span>
                        <p className="text-green-200 text-xs font-medium flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> Tanpa biaya berlangganan
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Paket Gratis vs Pro ──────────────────────────────── */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                        <h3 className="font-black text-primary-900 text-lg mb-6">Perbandingan Paket</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Gratis */}
                            <div className="relative p-6 rounded-3xl border-2 border-green-500 bg-green-50/50">
                                <div className="absolute top-0 right-6 -translate-y-1/2 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                                    Paket Aktif
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Gift className="w-5 h-5 text-green-600" />
                                    <h4 className="font-black text-primary-900 text-xl">Gratis</h4>
                                </div>
                                <p className="text-2xl font-black text-green-600 mb-6">Rp 0 <span className="text-sm text-gray-400 font-bold">/ selamanya</span></p>
                                <ul className="space-y-2.5 mb-6">
                                    {FREE_FEATURES.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm font-medium text-gray-700">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <div className="w-full py-3 rounded-2xl font-black text-sm text-center bg-green-600 text-white opacity-60 cursor-default">
                                    ✓ Paket Saat Ini
                                </div>
                            </div>

                            {/* Pro */}
                            <div className="relative p-6 rounded-3xl border-2 border-gray-100 bg-white hover:border-primary-200 hover:shadow-lg transition-all group">
                                <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary-900 text-accent-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                                    Segera Hadir
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Star className="w-5 h-5 text-primary-600" />
                                    <h4 className="font-black text-primary-900 text-xl">Pro</h4>
                                </div>
                                <p className="text-2xl font-black text-primary-900 mb-6">
                                    Rp 249rb <span className="text-sm text-gray-400 font-bold">/ bln</span>
                                </p>
                                <ul className="space-y-2.5 mb-6">
                                    {PRO_FEATURES.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm font-medium text-gray-600">
                                            <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href="https://wa.me/6282100000000?text=Halo%20AppKasir%2C%20saya%20tertarik%20upgrade%20ke%20paket%20Pro"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 bg-white text-primary-900 border border-primary-200 hover:bg-primary-50 active:scale-95 group-hover:border-primary-500"
                                >
                                    <MessageCircle className="w-4 h-4" /> Hubungi Kami untuk Upgrade
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Catatan */}
                    <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-black text-blue-900 mb-1">Butuh fitur lebih?</p>
                            <p className="text-sm font-medium text-blue-700 leading-relaxed">
                                Paket berbayar sedang dalam pengembangan. Hubungi tim AppKasir via WhatsApp untuk mendapatkan akses early access Paket Pro dengan harga spesial.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Histori Tagihan ──────────────────────────────────── */}
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-8 border-b bg-gray-50/50 shrink-0">
                        <h3 className="font-black text-primary-900 text-lg">Histori Tagihan</h3>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Invoice Terbit</p>
                    </div>
                    <div className="flex-1">
                        {invoices.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {invoices.map((inv) => (
                                    <div key={inv.id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="bg-gray-100 p-2 rounded-xl text-primary-900">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${inv.status === 'Paid' ? 'bg-green-100 text-green-600' : inv.status === 'Unpaid' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-black text-primary-900">{inv.invoice_number}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{inv.plan_name} - {inv.billing_cycle}</p>
                                        <div className="mt-4 flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Total</p>
                                                <p className="text-lg font-black text-primary-900">Rp {Number(inv.total_amount).toLocaleString('id-ID')}</p>
                                            </div>
                                            <button className="text-primary-900 hover:text-accent-600 transition-colors">
                                                <ExternalLink className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full p-8 text-center flex flex-col items-center justify-center min-h-[250px]">
                                <div className="w-16 h-16 bg-green-50 text-green-400 rounded-full flex items-center justify-center mb-4 border-2 border-green-100">
                                    <Gift className="w-8 h-8" />
                                </div>
                                <p className="font-bold text-gray-700">Paket Gratis Aktif</p>
                                <p className="text-sm font-medium text-gray-400 mt-2 max-w-[200px] leading-relaxed">
                                    Tidak ada tagihan. Invoice akan muncul jika Anda upgrade ke paket berbayar.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Info akun */}
                    <div className="p-6 border-t bg-gray-50/50">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            Bergabung sejak {formattedDate}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
