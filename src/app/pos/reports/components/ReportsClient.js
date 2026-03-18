"use client";

import { useState, useTransition } from "react";
import {
    BarChart3,
    Calendar,
    TrendingUp,
    Receipt,
    Users,
    Download,
    Filter,
    ArrowUpRight,
    ShieldCheck,
    AlertCircle,
    Wallet,
    CreditCard,
    UserCheck,
    XCircle,
    Banknote,
    ClipboardList,
    Lock,
    Unlock,
    RotateCcw,
    CheckCircle2,
    X,
    FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DebtPaymentModal from "./DebtPaymentModal";
import { lockMasaPajak } from "../actions";
import { processRefund } from "@/app/pos/actions/orders";

const TABS = ["Ringkasan", "Transaksi", "Per Kasir", "Per Metode", "Pembatalan", "PBJT", "Rekonsiliasi"];

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const REFUND_REASONS = ["Keluhan Pelanggan", "Salah Pesanan", "Kualitas Tidak Sesuai", "Pembatalan Acara", "Lainnya"];

function RefundModal({ order, onClose, onSuccess }) {
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState(null);

    const handleRefund = () => {
        const finalReason = reason === 'Lainnya' ? customReason : reason;
        if (!finalReason) { setError('Pilih atau isi alasan refund.'); return; }
        setError(null);
        startTransition(async () => {
            const res = await processRefund(order.id, finalReason);
            if (res.success) {
                onSuccess(order.id);
                onClose();
            } else {
                setError(res.message);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                <div className="px-8 py-5 border-b bg-red-50 flex justify-between items-center">
                    <h2 className="font-black text-red-800 flex items-center gap-2">
                        <RotateCcw className="w-5 h-5" />
                        Proses Refund
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full transition-colors">
                        <X className="w-4 h-4 text-red-600" />
                    </button>
                </div>

                <div className="p-8 space-y-5">
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Pesanan yang Direfund</p>
                        <p className="font-black text-primary-900">{order.order_number}</p>
                        <p className="text-lg font-black text-red-600">Rp {Number(order.grand_total).toLocaleString('id-ID')}</p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">{error}</div>
                    )}

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Alasan Refund</label>
                        <div className="grid grid-cols-2 gap-2">
                            {REFUND_REASONS.map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setReason(r)}
                                    className={`p-3 rounded-xl text-sm font-bold border transition-all text-left ${reason === r ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-red-300'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        {reason === 'Lainnya' && (
                            <textarea
                                rows={2}
                                value={customReason}
                                onChange={e => setCustomReason(e.target.value)}
                                placeholder="Tuliskan alasan..."
                                className="mt-3 w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-400 resize-none"
                            />
                        )}
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all">
                            Batal
                        </button>
                        <button
                            onClick={handleRefund}
                            disabled={isPending || !reason}
                            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            {isPending ? 'Memproses...' : 'Konfirmasi Refund'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ReportsClient({ initialSalesData, initialCreditData, initialPBJTData, initialShiftData, initialMasaPajakData, error }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("Ringkasan");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
    const [kasStartModal, setKasStartModal] = useState('');
    const [pbjtView, setPbjtView] = useState('ledger'); // 'ledger' | 'masaPajak'
    const [masaPajakList, setMasaPajakList] = useState(initialMasaPajakData || []);
    const [lockingKey, setLockingKey] = useState(null);
    const [lockMsg, setLockMsg] = useState(null);
    const [refundOrder, setRefundOrder] = useState(null);
    const [orders, setOrders] = useState(initialSalesData?.orders || []);

    const summary = initialSalesData?.summary || { totalSales: 0, totalTax: 0, totalOrders: 0, totalCredit: 0 };
    const topItems = initialSalesData?.topItems || [];
    const cashierBreakdown = initialSalesData?.cashierBreakdown || [];
    const paymentBreakdown = initialSalesData?.paymentBreakdown || [];
    const cancelledOrders = initialSalesData?.cancelledOrders || [];
    const shift = initialShiftData;

    const handleFilter = () => {
        if (activeTab === 'Rekonsiliasi') {
            window.location.href = `/pos/reports?shift=${shiftDate}`;
        } else {
            window.location.href = `/pos/reports?start=${startDate}&end=${endDate}`;
        }
    };

    const downloadCSV = (data, filename) => {
        if (!data || data.length === 0) return;
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

    const openSPTPD = (mp) => {
        // Buka halaman preview SPTPD PDF di tab baru
        const url = `/pos/reports/sptpd?year=${mp.year}&month=${mp.month}`;
        window.open(url, '_blank');
    };

    const handleLockMasaPajak = async (mp) => {
        if (!confirm(`Kunci masa pajak ${MONTH_NAMES[mp.month - 1]} ${mp.year}? Data tidak bisa diubah setelah dikunci.`)) return;
        setLockingKey(mp.key);
        setLockMsg(null);
        const res = await lockMasaPajak(mp.year, mp.month);
        setLockingKey(null);
        if (res.success) {
            setMasaPajakList(prev => prev.map(m => m.key === mp.key ? { ...m, isLocked: true, lockedAt: new Date().toISOString() } : m));
            setLockMsg({ type: 'success', text: `Masa pajak ${MONTH_NAMES[mp.month - 1]} ${mp.year} berhasil dikunci.` });
        } else {
            setLockMsg({ type: 'error', text: res.message });
        }
        setTimeout(() => setLockMsg(null), 4000);
    };

    const handleRefundSuccess = (orderId) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, is_refunded: true } : o));
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
                    <div className="flex gap-4 mt-2 overflow-x-auto no-scrollbar pb-1">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`text-sm font-bold transition-colors whitespace-nowrap ${activeTab === tab ? 'text-primary-900 border-b-2 border-primary-900 pb-1' : 'text-gray-400 hover:text-gray-600'}`}
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
                            {activeTab === 'Rekonsiliasi' ? (
                                <input
                                    type="date"
                                    value={shiftDate}
                                    onChange={(e) => setShiftDate(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-primary-900 outline-none"
                                />
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                        <button
                            onClick={handleFilter}
                            className="bg-primary-900 text-accent-400 p-2 rounded-xl hover:bg-primary-800 transition-all active:scale-95"
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    {!["Ringkasan", "Rekonsiliasi", "PBJT"].includes(activeTab) && (
                        <button
                            onClick={() => {
                                const data = activeTab === "Transaksi" ? orders :
                                    activeTab === "Piutang" ? initialCreditData :
                                    activeTab === "Per Kasir" ? cashierBreakdown :
                                    activeTab === "Per Metode" ? paymentBreakdown :
                                    activeTab === "Pembatalan" ? cancelledOrders : [];
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

                {/* ===== RINGKASAN ===== */}
                {activeTab === "Ringkasan" && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { label: "Total Penjualan", value: `Rp ${Number(summary.totalSales).toLocaleString('id-ID')}`, icon: TrendingUp, color: "bg-blue-50 text-blue-600" },
                                { label: "Total PBJT", value: `Rp ${Number(summary.totalTax).toLocaleString('id-ID')}`, icon: ShieldCheck, color: "bg-green-50 text-green-600" },
                                { label: "Kredit/Piutang", value: `Rp ${Number(summary.totalCredit).toLocaleString('id-ID')}`, icon: Wallet, color: "bg-orange-50 text-orange-600" },
                                { label: "Pelunasan Piutang", value: `Rp ${Number(summary.totalDebtPaid || 0).toLocaleString('id-ID')}`, icon: Receipt, color: "bg-emerald-50 text-emerald-600" },
                                { label: "Transaksi Selesai", value: summary.totalOrders || 0, icon: ClipboardList, color: "bg-purple-50 text-purple-600" },
                                { label: "Dibatalkan", value: summary.totalCancelled || 0, icon: XCircle, color: "bg-red-50 text-red-500" },
                            ].map((card, i) => (
                                <div key={i} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                                    <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>
                                        <card.icon className="w-5 h-5" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
                                    <p className="text-xl font-black text-primary-900">{card.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
                                <h3 className="text-lg font-black text-primary-900 mb-6 flex items-center gap-2">
                                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                                    Produk Terlaris
                                </h3>
                                <div className="space-y-6">
                                    {topItems.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black text-gray-400">{i + 1}</div>
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
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${ord.status === 'Selesai' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                                            {ord.is_refunded ? 'REFUND' : ord.status}
                                                        </span>
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

                {/* ===== TRANSAKSI ===== */}
                {activeTab === "Transaksi" && (
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">No. Pesanan</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Tipe</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Pembayaran</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Kasir</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Pelanggan</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {orders.map(ord => (
                                    <tr key={ord.id} className={`hover:bg-gray-50 transition-colors ${ord.is_refunded ? 'opacity-60' : ''}`}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                            {new Date(ord.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                            <br /><span className="text-[10px] text-gray-400">{new Date(ord.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-black text-primary-900">{ord.order_number}</p>
                                            {ord.is_refunded && <span className="text-[10px] font-black text-red-500 uppercase">REFUNDED</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-600 uppercase tracking-tighter">{ord.order_type}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${ord.is_credit ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                {ord.payments?.[0]?.payment_method || (ord.is_credit ? 'HUTANG' : 'TUNAI')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-600">{ord.staff_users?.full_name || '-'}</td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-primary-900">{ord.customer_name || 'Walk-In'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-primary-950">
                                            Rp {Number(ord.grand_total).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {ord.status === 'Selesai' && !ord.is_refunded && (
                                                <button
                                                    onClick={() => setRefundOrder(ord)}
                                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold mx-auto"
                                                    title="Proses Refund"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Refund
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {orders.length === 0 && <p className="text-center py-20 text-gray-400">Tidak ada transaksi ditemukan.</p>}
                    </div>
                )}

                {/* ===== PIUTANG ===== */}
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
                                        <span className="font-bold text-gray-900">Rp {(Number(cust.credit_limit) - Number(cust.current_debt)).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (Number(cust.current_debt) / Number(cust.credit_limit)) * 100)}%` }} />
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

                {/* ===== PER KASIR ===== */}
                {activeTab === "Per Kasir" && (
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b bg-gray-50/50 flex items-center gap-3">
                            <UserCheck className="w-6 h-6 text-primary-500" />
                            <h3 className="text-lg font-black text-primary-900">Laporan Per Kasir</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Kasir</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Transaksi</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Total Penjualan</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Rata-Rata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {cashierBreakdown.map((c, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center font-black text-primary-700">{i + 1}</div>
                                                <span className="font-bold text-primary-900">{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center font-bold text-gray-600">{c.totalOrders}</td>
                                        <td className="px-8 py-5 text-right font-black text-primary-900">Rp {c.totalSales.toLocaleString('id-ID')}</td>
                                        <td className="px-8 py-5 text-right font-bold text-gray-600">Rp {Math.round(c.totalSales / c.totalOrders).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))}
                                {cashierBreakdown.length === 0 && <tr><td colSpan={4} className="text-center py-16 text-gray-400">Tidak ada data kasir.</td></tr>}
                            </tbody>
                            {cashierBreakdown.length > 0 && (
                                <tfoot className="bg-gray-900 text-white">
                                    <tr>
                                        <td className="px-8 py-4 font-black">TOTAL</td>
                                        <td className="px-8 py-4 text-center font-black">{cashierBreakdown.reduce((s, c) => s + c.totalOrders, 0)}</td>
                                        <td className="px-8 py-4 text-right font-black text-accent-400">Rp {cashierBreakdown.reduce((s, c) => s + c.totalSales, 0).toLocaleString('id-ID')}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}

                {/* ===== PER METODE ===== */}
                {activeTab === "Per Metode" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {paymentBreakdown.map((p, i) => (
                                <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{p.method}</p>
                                    <p className="text-2xl font-black text-primary-900">Rp {Number(p.total).toLocaleString('id-ID')}</p>
                                    <p className="text-sm text-gray-400 mt-1">{p.count} transaksi</p>
                                </div>
                            ))}
                            {paymentBreakdown.length === 0 && <p className="col-span-full text-center py-16 text-gray-400">Tidak ada data pembayaran.</p>}
                        </div>
                        {paymentBreakdown.length > 0 && (
                            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Metode Pembayaran</th>
                                            <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Jumlah Transaksi</th>
                                            <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Total Nominal</th>
                                            <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">% Porsi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(() => {
                                            const grandTotal = paymentBreakdown.reduce((s, p) => s + Number(p.total), 0);
                                            return paymentBreakdown.map((p, i) => (
                                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-8 py-5 font-bold text-primary-900">{p.method}</td>
                                                    <td className="px-8 py-5 text-center font-bold text-gray-600">{p.count}</td>
                                                    <td className="px-8 py-5 text-right font-black text-primary-900">Rp {Number(p.total).toLocaleString('id-ID')}</td>
                                                    <td className="px-8 py-5 text-right">
                                                        <span className="text-sm font-bold text-gray-500">{grandTotal > 0 ? ((Number(p.total) / grandTotal) * 100).toFixed(1) : 0}%</span>
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== PEMBATALAN ===== */}
                {activeTab === "Pembatalan" && (
                    <div className="space-y-4">
                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-sm font-bold text-red-700">{cancelledOrders.length} pesanan dibatalkan dalam periode ini.</p>
                        </div>
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">No. Pesanan</th>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Tipe</th>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Kasir</th>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Pelanggan</th>
                                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {cancelledOrders.map(ord => (
                                        <tr key={ord.id} className="hover:bg-red-50/50 transition-colors">
                                            <td className="px-8 py-4 text-sm text-gray-500">
                                                {new Date(ord.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}{' '}
                                                <span className="text-[10px] text-gray-400">{new Date(ord.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="px-8 py-4 font-black text-red-600">{ord.order_number}</td>
                                            <td className="px-8 py-4"><span className="text-[10px] font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-500 uppercase">{ord.order_type}</span></td>
                                            <td className="px-8 py-4 text-sm font-bold text-gray-600">{ord.staff_users?.full_name || '-'}</td>
                                            <td className="px-8 py-4 text-sm font-bold text-gray-600">{ord.customer_name || 'Walk-In'}</td>
                                            <td className="px-8 py-4 text-right font-black text-gray-700">Rp {Number(ord.grand_total).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                    {cancelledOrders.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-400">Tidak ada pesanan dibatalkan dalam periode ini.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ===== PBJT ===== */}
                {activeTab === "PBJT" && (
                    <div className="space-y-6">
                        {/* Sub-view toggle */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPbjtView('ledger')}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${pbjtView === 'ledger' ? 'bg-primary-900 text-accent-400' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <FileText className="w-4 h-4" />
                                Buku Besar
                            </button>
                            <button
                                onClick={() => setPbjtView('masaPajak')}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${pbjtView === 'masaPajak' ? 'bg-primary-900 text-accent-400' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Masa Pajak & SPTPD
                            </button>
                            {pbjtView === 'ledger' && (
                                <button
                                    onClick={() => downloadCSV(initialPBJTData, 'Buku_Besar_PBJT')}
                                    className="ml-auto px-4 py-2.5 rounded-xl font-bold text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Ekspor CSV
                                </button>
                            )}
                        </div>

                        {lockMsg && (
                            <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${lockMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {lockMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                {lockMsg.text}
                            </div>
                        )}

                        {/* Buku Besar / Ledger View */}
                        {pbjtView === 'ledger' && (
                            <>
                                <div className="bg-green-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div>
                                            <p className="text-xs font-black text-green-300 uppercase tracking-widest mb-1">Total Pendapatan Pajak (PBJT)</p>
                                            <h2 className="text-5xl font-black tracking-tighter">Rp {initialPBJTData.reduce((sum, item) => sum + Number(item.pbjt_total), 0).toLocaleString('id-ID')}</h2>
                                            <p className="text-sm text-green-400 mt-2 font-medium italic">*DPP: Rp {initialPBJTData.reduce((sum, item) => sum + Number(item.subtotal), 0).toLocaleString('id-ID')}</p>
                                        </div>
                                        <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10">
                                            <ShieldCheck className="w-12 h-12 text-accent-400" />
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                                </div>

                                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal</th>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">No. Struk</th>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Jenis</th>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">DPP</th>
                                                <th className="px-8 py-4 text-xs font-black text-accent-600 uppercase tracking-widest text-right">PBJT (10%)</th>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Bruto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {initialPBJTData.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-8 py-5 text-sm font-bold text-gray-600">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                                                    <td className="px-8 py-5 font-black text-primary-900">{item.order_number}</td>
                                                    <td className="px-8 py-5"><span className="text-[10px] font-black px-2 py-1 bg-gray-100 rounded-lg text-gray-400 uppercase">{item.order_type}</span></td>
                                                    <td className="px-8 py-5 text-right font-bold text-gray-700">Rp {Number(item.subtotal).toLocaleString('id-ID')}</td>
                                                    <td className="px-8 py-5 text-right font-black text-accent-600">Rp {Number(item.pbjt_total).toLocaleString('id-ID')}</td>
                                                    <td className="px-8 py-5 text-right font-black text-primary-950">Rp {Number(item.grand_total).toLocaleString('id-ID')}</td>
                                                </tr>
                                            ))}
                                            {initialPBJTData.length === 0 && (
                                                <tr><td colSpan={6} className="text-center py-20 text-gray-400">Tidak ada data pajak untuk periode ini.</td></tr>
                                            )}
                                        </tbody>
                                        {initialPBJTData.length > 0 && (
                                            <tfoot className="bg-gray-900 text-white">
                                                <tr>
                                                    <td colSpan={3} className="px-8 py-5 font-black uppercase text-sm">Total Akumulasi</td>
                                                    <td className="px-8 py-5 text-right font-black">Rp {initialPBJTData.reduce((sum, i) => sum + Number(i.subtotal), 0).toLocaleString('id-ID')}</td>
                                                    <td className="px-8 py-5 text-right font-black text-accent-400 text-lg">Rp {initialPBJTData.reduce((sum, i) => sum + Number(i.pbjt_total), 0).toLocaleString('id-ID')}</td>
                                                    <td className="px-8 py-5 text-right font-black">Rp {initialPBJTData.reduce((sum, i) => sum + Number(i.grand_total), 0).toLocaleString('id-ID')}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </>
                        )}

                        {/* Masa Pajak / SPTPD View */}
                        {pbjtView === 'masaPajak' && (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                                    <p className="text-sm font-bold text-blue-700">
                                        Kunci masa pajak setelah memverifikasi data. Masa pajak yang dikunci tidak dapat diubah dan siap untuk pelaporan SPTPD.
                                    </p>
                                </div>

                                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Masa Pajak</th>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Transaksi</th>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">DPP</th>
                                                <th className="px-8 py-4 text-xs font-black text-accent-600 uppercase tracking-widest text-right">PBJT Terutang</th>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {masaPajakList.map((mp) => (
                                                <tr key={mp.key} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <p className="font-black text-primary-900">{MONTH_NAMES[mp.month - 1]} {mp.year}</p>
                                                        {mp.isLocked && mp.lockedAt && (
                                                            <p className="text-[10px] text-gray-400">Dikunci: {new Date(mp.lockedAt).toLocaleDateString('id-ID')}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 text-center font-bold text-gray-600">{mp.txCount}</td>
                                                    <td className="px-8 py-5 text-right font-bold text-gray-700">Rp {Number(mp.totalDPP).toLocaleString('id-ID')}</td>
                                                    <td className="px-8 py-5 text-right font-black text-accent-600">Rp {Number(mp.totalPBJT).toLocaleString('id-ID')}</td>
                                                    <td className="px-8 py-5 text-center">
                                                        {mp.isLocked ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">
                                                                <Lock className="w-3 h-3" /> Dikunci
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700">
                                                                <Unlock className="w-3 h-3" /> Terbuka
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => openSPTPD(mp)}
                                                                className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                                                                title="Buka Formulir SPTPD PDF"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                SPTPD PDF
                                                            </button>
                                                            {!mp.isLocked && (
                                                                <button
                                                                    onClick={() => handleLockMasaPajak(mp)}
                                                                    disabled={lockingKey === mp.key}
                                                                    className="p-2 bg-primary-900 hover:bg-primary-800 text-accent-400 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                                                                    title="Kunci Masa Pajak"
                                                                >
                                                                    <Lock className="w-3.5 h-3.5" />
                                                                    {lockingKey === mp.key ? 'Memproses...' : 'Kunci'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {masaPajakList.length === 0 && (
                                                <tr><td colSpan={6} className="text-center py-20 text-gray-400">Belum ada data masa pajak.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== REKONSILIASI ===== */}
                {activeTab === "Rekonsiliasi" && (
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <div className="bg-primary-900 text-white p-8 rounded-[40px] shadow-2xl">
                            <p className="text-xs font-black text-primary-400 uppercase tracking-widest mb-1">Rekonsiliasi Kas — Shift</p>
                            <h2 className="text-3xl font-black">{shift?.date ? new Date(shift.date + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</h2>
                        </div>

                        {!shift && (
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl text-sm font-bold text-yellow-700 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                Tidak ada data shift. Pilih tanggal lain dan filter.
                            </div>
                        )}

                        {shift && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { label: "Total Transaksi Selesai", value: shift.totalOrders, unit: 'transaksi', icon: ClipboardList, color: 'bg-blue-50 text-blue-600' },
                                        { label: "Total Penjualan Bruto", value: `Rp ${shift.totalGross.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
                                        { label: "Penjualan Tunai", value: `Rp ${shift.totalCash.toLocaleString('id-ID')}`, icon: Banknote, color: 'bg-emerald-50 text-emerald-600' },
                                        { label: "Penjualan Non-Tunai", value: `Rp ${shift.totalNonCash.toLocaleString('id-ID')}`, icon: CreditCard, color: 'bg-indigo-50 text-indigo-600' },
                                        { label: "Pelunasan Piutang (Tunai)", value: `Rp ${shift.totalDebtCash.toLocaleString('id-ID')}`, icon: Receipt, color: 'bg-orange-50 text-orange-600' },
                                        { label: "Pelunasan Piutang (Non-Tunai)", value: `Rp ${shift.totalDebtNonCash.toLocaleString('id-ID')}`, icon: Receipt, color: 'bg-amber-50 text-amber-600' },
                                    ].map((item, i) => (
                                        <div key={i} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
                                            <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center shrink-0`}>
                                                <item.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                                                <p className="text-xl font-black text-primary-900">{item.value}</p>
                                                {item.unit && <p className="text-xs text-gray-400">{item.unit}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-accent-500 text-white p-8 rounded-[40px] shadow-2xl shadow-accent-200">
                                    <p className="text-xs font-black text-accent-200 uppercase tracking-widest mb-1">Total Kas Masuk Laci</p>
                                    <p className="text-5xl font-black tracking-tighter">Rp {shift.totalCashInDrawer.toLocaleString('id-ID')}</p>
                                    <p className="text-sm text-accent-200 mt-2">= Tunai penjualan + Tunai pelunasan piutang</p>
                                </div>

                                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Kas Awal Shift (Modal)</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="number"
                                            value={kasStartModal}
                                            onChange={e => setKasStartModal(e.target.value)}
                                            placeholder="Misal: 500000"
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    {kasStartModal && (
                                        <div className="mt-4 p-4 bg-primary-50 rounded-xl">
                                            <p className="text-xs font-black text-primary-500 uppercase tracking-widest">Estimasi Kas Akhir</p>
                                            <p className="text-2xl font-black text-primary-900">
                                                Rp {(Number(kasStartModal) + shift.totalCashInDrawer).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* Modals */}
            {selectedCustomerForPayment && (
                <DebtPaymentModal
                    customer={selectedCustomerForPayment}
                    onClose={() => setSelectedCustomerForPayment(null)}
                    onSuccess={() => {
                        setSelectedCustomerForPayment(null);
                        router.refresh();
                    }}
                />
            )}

            {refundOrder && (
                <RefundModal
                    order={refundOrder}
                    onClose={() => setRefundOrder(null)}
                    onSuccess={handleRefundSuccess}
                />
            )}
        </div>
    );
}
