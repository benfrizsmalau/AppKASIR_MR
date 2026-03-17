"use client";

import { useState } from "react";
import {
    BarChart3,
    Calendar,
    TrendingUp,
    Receipt,
    Users,
    Download,
    Filter,
    ArrowUpRight,
    Search,
    ChevronRight,
    FileSpreadsheet,
    ShieldCheck,
    AlertCircle,
    Wallet
} from "lucide-react";
import { useRouter } from "next/navigation";
import DebtPaymentModal from "./DebtPaymentModal";

export default function ReportsClient({ initialSalesData, initialCreditData, initialPBJTData, error }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("Ringkasan"); // "Ringkasan", "Transaksi", "Piutang", "PBJT"
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);

    const summary = initialSalesData?.summary || { totalSales: 0, totalTax: 0, totalOrders: 0, totalCredit: 0 };
    const orders = initialSalesData?.orders || [];
    const topItems = initialSalesData?.topItems || [];

    const handleFilter = () => {
        window.location.href = `/pos/reports?start=${startDate}&end=${endDate}`;
    };

    const downloadCSV = (data, filename) => {
        if (!data || data.length === 0) return;

        // Use keys or explicit columns
        let csvContent = "data:text/csv;charset=utf-8,";
        const headers = Object.keys(data[0]);
        csvContent += headers.join(",") + "\r\n";

        data.forEach(row => {
            const values = headers.map(header => {
                const val = row[header] === null ? "" : row[header];
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvContent += values.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="bg-white px-8 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-primary-900 flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-accent-500" />
                        Laporan & Analitik
                    </h1>
                    <div className="flex gap-4 mt-2">
                        {["Ringkasan", "Transaksi", "Piutang", "PBJT"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`text-sm font-bold transition-colors ${activeTab === tab ? 'text-primary-900 border-b-2 border-primary-900 pb-1' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {tab === 'PBJT' ? 'Buku Besar PBJT' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-sm font-bold text-primary-900 outline-none"
                            />
                            <span className="text-gray-300">s/d</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-sm font-bold text-primary-900 outline-none"
                            />
                        </div>
                        <button
                            onClick={handleFilter}
                            className="bg-primary-900 text-accent-400 p-2 rounded-xl hover:bg-primary-800 transition-all active:scale-95"
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    {activeTab !== "Ringkasan" && (
                        <button
                            onClick={() => {
                                const data = activeTab === "Transaksi" ? orders :
                                    activeTab === "Piutang" ? initialCreditData :
                                        initialPBJTData;
                                downloadCSV(data, `Laporan_${activeTab}`);
                            }}
                            className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 text-gray-600 shadow-sm transition-all flex items-center gap-2 font-bold text-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden lg:inline">Ekspor CSV</span>
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 space-y-8">
                {error && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {activeTab === "Ringkasan" && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: "Total Penjualan", value: summary.totalSales, icon: TrendingUp, color: "bg-blue-50 text-blue-600", accent: "primary" },
                                { label: "Total PBJT (Pajak)", value: summary.totalTax, icon: ShieldCheck, color: "bg-green-50 text-green-600", accent: "green" },
                                { label: "Penjualan Kredit", value: summary.totalCredit, icon: Wallet, color: "bg-orange-50 text-orange-600", accent: "orange" },
                                { label: "Pelunasan Piutang", value: summary.totalDebtPaid || 0, icon: Receipt, color: "bg-emerald-50 text-emerald-600", accent: "emerald" },
                            ].map((card, i) => (
                                <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                                    <div className={`w-12 h-12 ${card.color} rounded-2xl flex items-center justify-center mb-4`}>
                                        <card.icon className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
                                    <p className="text-2xl font-black text-primary-900">
                                        {card.isNum ? card.value : `Rp ${Number(card.value).toLocaleString('id-ID')}`}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Best Sellers */}
                            <div className="lg:col-span-1 bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
                                <h3 className="text-lg font-black text-primary-900 mb-6 flex items-center gap-2">
                                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                                    Produk Terlaris
                                </h3>
                                <div className="space-y-6">
                                    {topItems.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black text-gray-400">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-primary-900 leading-tight">{item.name}</p>
                                                    <p className="text-xs text-gray-400">{item.totalQty} terjual</p>
                                                </div>
                                            </div>
                                            <p className="font-bold text-gray-900 text-sm">Rp {item.totalSales.toLocaleString('id-ID')}</p>
                                        </div>
                                    ))}
                                    {topItems.length === 0 && <p className="text-center text-gray-400 py-10">Belum ada data.</p>}
                                </div>
                            </div>

                            {/* Recent Activity Mini-Tab */}
                            <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="text-lg font-black text-primary-900">Aktifitas Penjualan Terakhir</h3>
                                    <button onClick={() => setActiveTab("Transaksi")} className="text-xs font-black text-accent-600 hover:text-accent-700 uppercase tracking-widest">
                                        Lihat Semua
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-left">
                                        <tbody className="divide-y">
                                            {orders.slice(0, 5).map(ord => (
                                                <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-8 py-4">
                                                        <p className="text-sm font-black text-primary-900">#{ord.order_number}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 capitalize">{ord.order_type} • {new Date(ord.created_at).toLocaleTimeString('id-ID')}</p>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        {ord.is_credit ? (
                                                            (ord.payments?.length > 0 && ord.payments.every(p => p.status === 'Lunas')) ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-600 border border-green-200">LUNAS (K)</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-600 border border-orange-200">PIUTANG</span>
                                                            )
                                                        ) : (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${ord.status === 'Selesai' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                                                {ord.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <p className="font-bold text-primary-950">Rp {Number(ord.grand_total).toLocaleString('id-ID')}</p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "Transaksi" && (
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">No. Pesanan</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Tipe</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Pembayaran</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Kasir</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Pelanggan</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Total Tagihan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {orders.map(ord => (
                                    <tr key={ord.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-8 py-5 text-sm font-medium text-gray-600">
                                            {new Date(ord.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                            <br />
                                            <span className="text-[10px] text-gray-400">{new Date(ord.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-black text-primary-900">{ord.order_number}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-600 uppercase tracking-tighter">{ord.order_type}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${ord.is_credit ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                {ord.payments?.[0]?.payment_method || (ord.is_credit ? 'HUTANG' : 'TUNAI')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-bold text-gray-600">
                                            {ord.staff_users?.full_name || '-'}
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-sm font-bold text-primary-900 leading-tight">{ord.customer_name || 'Walk-In'}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-primary-950">
                                            Rp {Number(ord.grand_total).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {orders.length === 0 && <p className="text-center py-20 text-gray-400">Tidak ada transaksi ditemukan.</p>}
                    </div>
                )}

                {activeTab === "Piutang" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {initialCreditData.map(cust => (
                            <div key={cust.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-primary-900 leading-tight">{cust.name}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cust.type}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400 font-medium">Sisa Limit</span>
                                        <span className="font-bold text-gray-900 text-right">Rp {(Number(cust.credit_limit) - Number(cust.current_debt)).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-500 rounded-full"
                                            style={{ width: `${Math.min(100, (Number(cust.current_debt) / Number(cust.credit_limit)) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="pt-3 border-t border-gray-50">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Hutang Berjalan</p>
                                        <p className="text-xl font-black text-red-600">Rp {Number(cust.current_debt).toLocaleString('id-ID')}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedCustomerForPayment(cust)}
                                    className="mt-6 w-full py-3 bg-primary-900 text-accent-400 rounded-2xl font-black text-sm hover:bg-primary-800 transition-all active:scale-95"
                                >
                                    Bayar Piutang
                                </button>
                            </div>
                        ))}
                        {initialCreditData.length === 0 && <p className="col-span-full text-center py-20 text-gray-400">Tidak ada pelanggan dengan piutang aktif.</p>}
                    </div>
                )}

                {activeTab === "PBJT" && (
                    <div className="space-y-6">
                        <div className="bg-green-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <p className="text-xs font-black text-green-300 uppercase tracking-widest mb-1">Total Pendapatan Pajak (PBJT)</p>
                                    <h2 className="text-5xl font-black tracking-tighter">Rp {initialPBJTData.reduce((sum, item) => sum + Number(item.pbjt_total), 0).toLocaleString('id-ID')}</h2>
                                    <p className="text-sm text-green-400 mt-2 font-medium italic">*Dasar Pengenaan Pajak (DPP): Rp {initialPBJTData.reduce((sum, item) => sum + Number(item.subtotal), 0).toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10">
                                    <ShieldCheck className="w-12 h-12 text-accent-400" />
                                </div>
                            </div>
                            {/* Decorative Spark */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                        </div>

                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal</th>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">No. Struk</th>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Jenis</th>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">DPP (Subtotal)</th>
                                        <th className="px-8 py-4 text-xs font-black text-accent-600 uppercase tracking-widest text-right">PBJT (Pajak 10%)</th>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Nilai Bruto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {initialPBJTData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-8 py-5 text-sm font-bold text-gray-600">
                                                {new Date(item.created_at).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="px-8 py-5 font-black text-primary-900">{item.order_number}</td>
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-black px-2 py-1 bg-gray-100 rounded-lg text-gray-400 uppercase">{item.order_type}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right font-bold text-gray-700">Rp {Number(item.subtotal).toLocaleString('id-ID')}</td>
                                            <td className="px-8 py-5 text-right font-black text-accent-600">Rp {Number(item.pbjt_total).toLocaleString('id-ID')}</td>
                                            <td className="px-8 py-5 text-right font-black text-primary-950">Rp {Number(item.grand_total).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                    {initialPBJTData.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-20 text-gray-400">Tidak ada data pajak untuk periode ini.</td>
                                        </tr>
                                    )}
                                </tbody>
                                {initialPBJTData.length > 0 && (
                                    <tfoot className="bg-gray-900 text-white">
                                        <tr>
                                            <td colSpan={3} className="px-8 py-5 font-black uppercase text-sm">Total Akumulasi</td>
                                            <td className="px-8 py-5 text-right font-black">Rp {initialPBJTData.reduce((sum, item) => sum + Number(item.subtotal), 0).toLocaleString('id-ID')}</td>
                                            <td className="px-8 py-5 text-right font-black text-accent-400 text-lg">Rp {initialPBJTData.reduce((sum, item) => sum + Number(item.pbjt_total), 0).toLocaleString('id-ID')}</td>
                                            <td className="px-8 py-5 text-right font-black">Rp {initialPBJTData.reduce((sum, item) => sum + Number(item.grand_total), 0).toLocaleString('id-ID')}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Pembayaran Piutang */}
            {selectedCustomerForPayment && (
                <DebtPaymentModal
                    customer={selectedCustomerForPayment}
                    onClose={() => setSelectedCustomerForPayment(null)}
                    onSuccess={() => {
                        setSelectedCustomerForPayment(null);
                        router.refresh(); // Soft reload to update data
                    }}
                />
            )}
        </div>
    );
}
