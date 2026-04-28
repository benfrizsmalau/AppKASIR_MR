"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Search, History, Calendar, FileText, ChevronRight, Ban,
    CheckCircle, RefreshCw, X, Printer, RotateCcw, AlertCircle,
    Receipt, User, Clock, CreditCard, Package, Loader2
} from "lucide-react";
import { getOrderDetail, processRefund } from "../actions/orders";

// ─── Modal Detail Order ────────────────────────────────────────────────────────
function OrderDetailModal({ orderId, onClose }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refundReason, setRefundReason] = useState('');
    const [showRefund, setShowRefund] = useState(false);
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundMsg, setRefundMsg] = useState(null);
    const router = useRouter();

    useState(() => {
        const load = async () => {
            setLoading(true);
            const res = await getOrderDetail(orderId);
            if (res.success) setOrder(res.order);
            else setError(res.message);
            setLoading(false);
        };
        load();
    }, [orderId]);

    const handleRefund = async () => {
        if (!refundReason.trim()) return;
        setRefundLoading(true);
        const res = await processRefund(orderId, refundReason);
        setRefundLoading(false);
        if (res.success) {
            setRefundMsg({ type: 'success', text: res.message });
            setShowRefund(false);
            // Reload order
            const detail = await getOrderDetail(orderId);
            if (detail.success) setOrder(detail.order);
            router.refresh();
        } else {
            setRefundMsg({ type: 'error', text: res.message });
        }
    };

    const handlePrint = () => {
        if (!order) return;
        window.print();
    };

    const activeItems = order?.order_items?.filter(i => i.status !== 'Dibatalkan') || [];
    const payment = order?.payments?.[0];
    const paymentMethod = payment?.payment_method || (order?.is_credit ? 'Hutang' : 'Tunai');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <Receipt className="w-5 h-5 text-primary-600" />
                        <h2 className="text-lg font-black text-primary-900">
                            {order ? order.order_number : 'Detail Pesanan'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="font-semibold">Memuat detail...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center py-20 gap-3 text-red-500">
                            <AlertCircle className="w-6 h-6" />
                            <span className="font-semibold">{error}</span>
                        </div>
                    )}

                    {order && (
                        <div className="p-6 space-y-5">
                            {/* Info Singkat */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Waktu</p>
                                    <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        {new Date(order.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Kasir</p>
                                    <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-gray-400" />
                                        {order.staff_users?.full_name || '-'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Tipe</p>
                                    <p className="font-bold text-gray-800">{order.order_type}</p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Pembayaran</p>
                                    <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                        <CreditCard className="w-4 h-4 text-gray-400" />
                                        {paymentMethod}
                                    </p>
                                </div>
                                {order.customer_name && (
                                    <div className="col-span-2 bg-blue-50 rounded-2xl p-4">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-1">Pelanggan</p>
                                        <p className="font-bold text-blue-800">{order.customer_name}</p>
                                    </div>
                                )}
                            </div>

                            {/* Status badge */}
                            <div className="flex items-center gap-2">
                                {order.is_refunded && (
                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-700 border border-purple-200">DIREFUND</span>
                                )}
                                {order.status === 'Selesai' && !order.is_refunded && (
                                    order.is_credit
                                        ? <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-700 border border-orange-200">HUTANG - MENUNGGU BAYAR</span>
                                        : <span className="px-3 py-1 rounded-full text-xs font-black bg-green-100 text-green-700 border border-green-200">LUNAS</span>
                                )}
                                {order.status === 'Dibatalkan' && (
                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200">DIBATALKAN</span>
                                )}
                                {!['Selesai', 'Dibatalkan'].includes(order.status) && (
                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700 border border-blue-200">{order.status.toUpperCase()}</span>
                                )}
                            </div>

                            {/* Item Pesanan */}
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" /> Item Pesanan
                                </p>
                                <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100">
                                    {activeItems.map(item => (
                                        <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 text-sm">{item.menu_items?.name}</p>
                                                {item.variation_label && (
                                                    <p className="text-[10px] text-gray-400">{item.variation_label}</p>
                                                )}
                                                {item.notes && (
                                                    <p className="text-[10px] text-gray-400 italic">"{item.notes}"</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs text-gray-500">{item.quantity}x Rp {Number(item.unit_price).toLocaleString('id-ID')}</p>
                                                <p className="font-black text-gray-800 text-sm">Rp {Number(item.subtotal).toLocaleString('id-ID')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ringkasan Total */}
                            <div className="bg-primary-50 rounded-2xl p-4 space-y-2">
                                {Number(order.discount_total) > 0 && (
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Diskon</span>
                                        <span className="text-red-600 font-bold">- Rp {Number(order.discount_total).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {Number(order.service_charge_total) > 0 && (
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Service Charge</span>
                                        <span className="font-bold">Rp {Number(order.service_charge_total).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {Number(order.pbjt_total) > 0 && (
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>PBJT</span>
                                        <span className="font-bold">Rp {Number(order.pbjt_total).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-primary-200">
                                    <span className="font-black text-primary-900">TOTAL</span>
                                    <span className="font-black text-primary-900 text-lg">Rp {Number(order.grand_total).toLocaleString('id-ID')}</span>
                                </div>
                                {payment?.amount_paid > 0 && (
                                    <>
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Dibayar</span>
                                            <span className="font-bold">Rp {Number(payment.amount_paid).toLocaleString('id-ID')}</span>
                                        </div>
                                        {Number(payment.amount_change) > 0 && (
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Kembalian</span>
                                                <span className="font-bold">Rp {Number(payment.amount_change).toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Pesan refund */}
                            {refundMsg && (
                                <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${refundMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {refundMsg.text}
                                </div>
                            )}

                            {/* Form Refund */}
                            {showRefund && (
                                <div className="bg-red-50 rounded-2xl p-4 space-y-3">
                                    <p className="text-sm font-black text-red-700">Alasan Refund</p>
                                    <textarea
                                        value={refundReason}
                                        onChange={e => setRefundReason(e.target.value)}
                                        rows={2}
                                        placeholder="Tuliskan alasan refund..."
                                        className="w-full bg-white border border-red-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-red-300"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowRefund(false)} className="flex-1 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
                                            Batal
                                        </button>
                                        <button onClick={handleRefund} disabled={!refundReason.trim() || refundLoading}
                                            className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-red-700">
                                            {refundLoading ? 'Memproses...' : 'Konfirmasi Refund'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {order && (
                    <div className="px-6 py-4 border-t bg-gray-50 shrink-0 flex gap-3">
                        {order.status === 'Selesai' && !order.is_refunded && (
                            <button
                                onClick={() => { setShowRefund(true); setRefundMsg(null); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
                            >
                                <RotateCcw className="w-4 h-4" /> Refund
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-900 text-accent-400 rounded-xl text-sm font-black hover:bg-primary-800 transition-all"
                        >
                            <Printer className="w-4 h-4" /> Cetak Ulang Struk
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main HistoryClient ────────────────────────────────────────────────────────
export default function HistoryClient({ initialRecords }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedOrderId, setSelectedOrderId] = useState(null);

    const filteredRecords = initialRecords?.filter(rec =>
        rec.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col p-8 font-sans">
            <div className="max-w-6xl w-full mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                            <History className="w-8 h-8 text-primary-600" />
                            Riwayat Transaksi
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">Pantau seluruh order yang terjadi hari ini.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari No. Order..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm w-64 transition-all"
                            />
                        </div>
                        <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 font-bold shadow-sm transition-all active:scale-95">
                            <Calendar className="w-5 h-5" /> Hari Ini
                        </button>
                        <button
                            onClick={() => router.refresh()}
                            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 font-bold shadow-sm transition-all active:scale-95"
                            title="Muat ulang data"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Cards Table Layout */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Table Headers */}
                    <div className="bg-gray-50 grid grid-cols-7 px-6 py-4 border-b border-gray-100 text-sm font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-2">ID & Pelanggan</div>
                        <div>Tipe</div>
                        <div>Pembayaran</div>
                        <div>Kasir</div>
                        <div>Status</div>
                        <div className="text-right">Total</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-gray-50">
                        {!filteredRecords || filteredRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <FileText className="w-16 h-16 opacity-30 mb-4" />
                                <p className="text-lg font-medium">Belum ada transaksi hari ini.</p>
                            </div>
                        ) : (
                            filteredRecords.map((rec) => (
                                <div
                                    key={rec.id}
                                    onClick={() => setSelectedOrderId(rec.id)}
                                    className="grid grid-cols-7 items-center px-6 py-5 hover:bg-primary-50/50 transition-colors group cursor-pointer"
                                >
                                    <div className="col-span-2 flex items-start gap-4">
                                        <div className={`p-3 rounded-xl shrink-0 ${rec.status === 'Selesai' ? 'bg-green-100 text-green-600' : rec.status === 'Dibatalkan' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'}`}>
                                            {rec.status === 'Selesai' ? <CheckCircle className="w-6 h-6" /> : rec.status === 'Dibatalkan' ? <Ban className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 group-hover:text-primary-700 transition-colors leading-tight">{rec.order_number}</p>
                                            <p className="text-xs font-bold text-primary-600 mt-1">{rec.customer_name || 'Walk-In'}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                {new Date(rec.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-gray-100 text-gray-700 uppercase">
                                            {rec.order_type}
                                        </span>
                                    </div>

                                    <div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${rec.is_credit ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {rec.payments?.[0]?.payment_method || (rec.is_credit ? 'HUTANG' : 'TUNAI')}
                                        </span>
                                    </div>

                                    <div className="text-sm font-bold text-gray-600 truncate">
                                        {rec.staff_users?.full_name || '-'}
                                    </div>

                                    <div>
                                        {rec.status === 'Selesai' ? (
                                            rec.is_credit ? (
                                                (rec.payments?.length > 0 && rec.payments.every(p => p.status === 'Lunas'))
                                                    ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Lunas</span>
                                                    : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">Menunggu</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Lunas</span>
                                            )
                                        ) : rec.status === 'Dibatalkan' ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Batal</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Di-Hold</span>
                                        )}
                                    </div>

                                    <div className="text-right flex items-center justify-end gap-3">
                                        <span className="font-black text-primary-950">Rp {Number(rec.grand_total).toLocaleString('id-ID')}</span>
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Detail Order */}
            {selectedOrderId && (
                <OrderDetailModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}
        </div>
    );
}
