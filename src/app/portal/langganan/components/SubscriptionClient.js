"use client";

import { CreditCard, CalendarDays, ArrowUpRight, CheckCircle2, AlertTriangle, Building2, ExternalLink, FileText } from "lucide-react";
import { useState } from "react";

export default function SubscriptionClient({ tenant, initialInvoices }) {
    const [isLoading, setIsLoading] = useState(false);
    const [invoices, setInvoices] = useState(initialInvoices || []);

    if (!tenant) return <p className="text-red-500 font-bold">Data Tenant tidak ditemukan.</p>;

    // Helpers untuk mock date
    const endDate = new Date(tenant.trial_ends_at || Date.now() + 14 * 24 * 60 * 60 * 1000);
    const diffDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

    const packages = [
        {
            name: "Starter",
            price: "Rp 99.000 / bln",
            features: ["1 Cabang/Outlet Utama", "Maksimal 3 Akun Kasir", "Laporan Penjualan Standar", "Dukungan Email"],
            isCurrent: tenant.subscription_plan === 'Starter'
        },
        {
            name: "Pro",
            price: "Rp 249.000 / bln",
            features: ["Hingga 3 Cabang/Outlet", "Unlimited Akun Kasir", "Laporan Piutang & Pajak Lengkap", "Dukungan Prioritas WA"],
            isCurrent: tenant.subscription_plan === 'Pro'
        },
        {
            name: "Enterprise",
            price: "Hubungi Penjualan",
            features: ["Cabang Unlimited", "Integrasi ERP / API Custom", "Laporan Analisis Eksekutif", "Dedicated Success Manager"],
            isCurrent: tenant.subscription_plan === 'Enterprise'
        }
    ];

    return (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <header className="border-b pb-6">
                <h1 className="text-3xl font-black text-primary-900 tracking-tight flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-accent-500" /> Langganan SaaS
                </h1>
                <p className="text-gray-500 font-medium mt-1">Kelola paket langganan dan histori tagihan aplikasi POS Anda.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Kiri: Status Berlangganan (2 Kolom) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-primary-900 text-white rounded-[32px] p-8 relative overflow-hidden shadow-2xl shadow-primary-900/20">
                        <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-primary-900 to-primary-900"></div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <p className="text-xs font-black text-accent-400 uppercase tracking-widest mb-1">Paket Aktif Anda</p>
                                <h2 className="text-4xl font-black mb-2">{tenant.subscription_plan}</h2>
                                <p className="text-primary-200 text-sm">{diffDays > 0 ? `Sisa waktu: ${diffDays} hari lagi` : 'Siklus tagihan Anda telah jatuh tempo.'}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-black uppercase tracking-widest bg-white text-primary-900`}>
                                    <div className={`w-2 h-2 rounded-full ${diffDays > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    {tenant.status === 'Trial' ? 'Masa Percobaan' : tenant.status}
                                </span>
                                <p className="text-primary-300 text-xs font-medium mt-3 flex items-center gap-1">
                                    <CalendarDays className="w-4 h-4" /> Berakhir pada: {endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {diffDays <= 7 && (
                            <div className="relative z-10 mt-6 bg-red-500/20 border border-red-500/50 rounded-2xl p-4 flex items-start gap-3 text-red-100 backdrop-blur-sm">
                                <AlertTriangle className="w-6 h-6 shrink-0 text-red-400" />
                                <div>
                                    <p className="font-bold">Masa Layanan Hampir Berakhir</p>
                                    <p className="text-sm opacity-80 mt-1 leading-relaxed">Sistem kasir Anda akan dikunci otomatis jika tagihan belum dibayarkan pada hari jatuh tempo. Pastikan untuk segera upgrade paket.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                        <h3 className="font-black text-primary-900 text-lg mb-6 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-gray-400" /> Pilihan Paket Langganan
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {packages.map(pkg => (
                                <div key={pkg.name} className={`relative p-6 rounded-3xl border-2 transition-all group ${pkg.isCurrent ? 'border-primary-900 bg-primary-50/50' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg'}`}>
                                    {pkg.isCurrent && (
                                        <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary-900 text-accent-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                                            Paket Saat Ini
                                        </div>
                                    )}
                                    <h4 className="font-black text-primary-900 text-xl mb-1">{pkg.name}</h4>
                                    <p className="text-primary-600 font-bold mb-6">{pkg.price}</p>
                                    <ul className="space-y-3 mb-8">
                                        {pkg.features.map((f, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm font-medium text-gray-600 leading-tight">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        disabled={pkg.isCurrent}
                                        onClick={() => alert('Simulasi: Diarahkan ke Payment Gateway (Midtrans/Xendit)')}
                                        className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${pkg.isCurrent ? 'bg-primary-900 text-white opacity-50 cursor-not-allowed' : 'bg-white text-primary-900 border border-primary-200 hover:bg-primary-50 active:scale-95'}`}
                                    >
                                        {pkg.isCurrent ? 'Terpilih' : 'Upgrade Paket'} <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Kanan: Histori Tagihan (1 Kolom) */}
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm flex flex-col h-full max-h-[800px] overflow-hidden">
                    <div className="p-8 border-b bg-gray-50/50 shrink-0">
                        <h3 className="font-black text-primary-900 text-lg">Histori Tagihan</h3>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Daftar Invoice Terbit</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {invoices.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {invoices.map((inv) => (
                                    <div key={inv.id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="bg-gray-100 p-2 rounded-xl text-primary-900">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${inv.status === 'Paid' ? 'bg-green-100 text-green-600' :
                                                inv.status === 'Unpaid' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-black text-primary-900">{inv.invoice_number}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{inv.plan_name} - {inv.billing_cycle}</p>
                                        <div className="mt-4 flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Total Bayar</p>
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
                            <div className="h-full p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                                <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-200">
                                    <ExternalLink className="w-8 h-8" />
                                </div>
                                <p className="font-bold text-gray-600">Belum ada tagihan.</p>
                                <p className="text-sm font-medium text-gray-400 mt-2 max-w-[200px]">Invoice pertama Anda akan muncul setelah masa Trial berakhir.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

