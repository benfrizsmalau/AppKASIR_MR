"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Search, History, Calendar, FileText, ChevronRight, Ban,
    CheckCircle, RefreshCw, X, Printer, RotateCcw, AlertCircle,
    Receipt, User, Clock, CreditCard, Package, Loader2
} from "lucide-react";
import { getOrderDetail, processRefund } from "../actions/orders";

// ─── Zigzag edge SVG untuk efek kertas robek ─────────────────────────────────
function ZigzagEdge({ flip = false }) {
    return (
        <svg viewBox="0 0 360 16" className="w-full block" style={{ transform: flip ? 'rotate(180deg)' : 'none', display: 'block', marginBottom: flip ? 0 : -1, marginTop: flip ? -1 : 0 }} preserveAspectRatio="none" height="16">
            <path d="M0,16 L10,4 L20,16 L30,4 L40,16 L50,4 L60,16 L70,4 L80,16 L90,4 L100,16 L110,4 L120,16 L130,4 L140,16 L150,4 L160,16 L170,4 L180,16 L190,4 L200,16 L210,4 L220,16 L230,4 L240,16 L250,4 L260,16 L270,4 L280,16 L290,4 L300,16 L310,4 L320,16 L330,4 L340,16 L350,4 L360,16 L360,0 L0,0 Z" fill="#fffef5" />
        </svg>
    );
}

// ─── Garis putus-putus separator ──────────────────────────────────────────────
function Dashes() {
    return <div className="border-t-2 border-dashed border-gray-300 my-3" />;
}

// ─── Modal Detail Order — Tampilan Struk Kertas ───────────────────────────────
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
            const detail = await getOrderDetail(orderId);
            if (detail.success) setOrder(detail.order);
            router.refresh();
        } else {
            setRefundMsg({ type: 'error', text: res.message });
        }
    };

    const activeItems = order?.order_items?.filter(i => i.status !== 'Dibatalkan') || [];
    const payment = order?.payments?.[0];
    const paymentMethod = payment?.payment_method || (order?.is_credit ? 'Hutang' : 'Tunai');

    const statusLabel = () => {
        if (order?.is_refunded) return { text: '★ DIREFUND ★', color: 'text-purple-600' };
        if (order?.status === 'Dibatalkan') return { text: '✗ DIBATALKAN', color: 'text-red-600' };
        if (order?.is_credit) return { text: '⚠ HUTANG - MENUNGGU BAYAR', color: 'text-orange-600' };
        if (order?.status === 'Selesai') return { text: '✓ LUNAS', color: 'text-green-700' };
        return { text: order?.status?.toUpperCase() || '', color: 'text-blue-600' };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm" onClick={onClose}>
            {/* Wrapper kertas — lebar struk thermal */}
            <div className="w-full max-w-xs flex flex-col" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.45))' }}
                onClick={e => e.stopPropagation()}>

                {/* Tombol tutup di luar kertas */}
                <div className="flex justify-end mb-2 pr-1">
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/40 text-white rounded-full p-1.5 transition-all backdrop-blur-sm">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Kertas atas — zigzag */}
                <ZigzagEdge />

                {/* Body struk */}
                <div className="bg-[#fffef5] overflow-y-auto" style={{ maxHeight: '75vh' }}>

                    {loading && (
                        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-mono">Memuat struk...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center py-16 gap-2 text-red-500 px-4">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-mono">{error}</span>
                        </div>
                    )}

                    {order && (
                        <div className="px-5 py-4 font-mono text-gray-800 text-sm">

                            {/* Header Toko */}
                            <div className="text-center mb-3">
                                <p className="text-base font-black tracking-widest uppercase text-gray-900">APPKASIR POS</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Sistem Kasir Digital</p>
                            </div>

                            <Dashes />

                            {/* Info Order */}
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">No. Order</span>
                                    <span className="font-bold">{order.order_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tanggal</span>
                                    <span className="font-bold">{new Date(order.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Jam</span>
                                    <span className="font-bold">{new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Kasir</span>
                                    <span className="font-bold">{order.staff_users?.full_name || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tipe</span>
                                    <span className="font-bold">{order.order_type}</span>
                                </div>
                                {order.customer_name && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Pelanggan</span>
                                        <span className="font-bold text-right max-w-[55%] leading-tight">{order.customer_name}</span>
                                    </div>
                                )}
                            </div>

                            <Dashes />

                            {/* Item Pesanan */}
                            <div className="space-y-2">
                                {activeItems.map(item => (
                                    <div key={item.id}>
                                        <p className="font-bold text-xs leading-tight">{item.menu_items?.name}</p>
                                        {item.variation_label && <p className="text-[10px] text-gray-400 leading-tight">{item.variation_label}</p>}
                                        {item.notes && <p className="text-[10px] text-gray-400 italic">"{item.notes}"</p>}
                                        <div className="flex justify-between text-xs mt-0.5">
                                            <span className="text-gray-500">{item.quantity} x Rp {Number(item.unit_price).toLocaleString('id-ID')}</span>
                                            <span className="font-bold">Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Dashes />

                            {/* Subtotal & Pajak */}
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span>Rp {Number(order.subtotal).toLocaleString('id-ID')}</span>
                                </div>
                                {Number(order.discount_total) > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Diskon</span>
                                        <span>- Rp {Number(order.discount_total).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {Number(order.service_charge_total) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Service Charge</span>
                                        <span>Rp {Number(order.service_charge_total).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {Number(order.pbjt_total) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">PBJT (10%)</span>
                                        <span>Rp {Number(order.pbjt_total).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Total */}
                            <div className="border-t-2 border-gray-800 mt-3 pt-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-sm tracking-wider">TOTAL</span>
                                    <span className="font-black text-base">Rp {Number(order.grand_total).toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            {/* Pembayaran */}
                            <div className="space-y-1 text-xs mt-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Metode</span>
                                    <span className="font-bold uppercase">{paymentMethod}</span>
                                </div>
                                {payment?.amount_paid > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Dibayar</span>
                                        <span className="font-bold">Rp {Number(payment.amount_paid).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {Number(payment?.amount_change) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Kembalian</span>
                                        <span className="font-bold">Rp {Number(payment.amount_change).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                            </div>

                            <Dashes />

                            {/* Status */}
                            <div className="text-center py-1">
                                <span className={`text-xs font-black tracking-widest ${statusLabel().color}`}>
                                    {statusLabel().text}
                                </span>
                            </div>

                            <Dashes />

                            {/* Terima kasih */}
                            <p className="text-center text-[10px] text-gray-400 pb-1">Terima kasih atas kunjungan Anda!</p>

                            {/* Pesan Refund */}
                            {refundMsg && (
                                <div className={`mt-3 p-2 rounded text-xs font-bold text-center ${refundMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {refundMsg.text}
                                </div>
                            )}

                            {/* Form Refund */}
                            {showRefund && (
                                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                                    <p className="text-xs font-black text-red-700">Alasan Refund:</p>
                                    <textarea
                                        value={refundReason}
                                        onChange={e => setRefundReason(e.target.value)}
                                        rows={2}
                                        placeholder="Tuliskan alasan..."
                                        className="w-full bg-white border border-red-200 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-red-300 font-mono"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowRefund(false)} className="flex-1 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600">
                                            Batal
                                        </button>
                                        <button onClick={handleRefund} disabled={!refundReason.trim() || refundLoading}
                                            className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                                            {refundLoading ? 'Proses...' : 'Konfirmasi'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tombol aksi */}
                            <div className="flex gap-2 mt-4 pb-2">
                                {order.status === 'Selesai' && !order.is_refunded && (
                                    <button
                                        onClick={() => { setShowRefund(true); setRefundMsg(null); }}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" /> Refund
                                    </button>
                                )}
                                <button
                                    onClick={() => window.print()}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-900 text-yellow-400 rounded-xl text-xs font-black hover:bg-gray-800 transition-all"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Cetak Ulang
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Kertas bawah — zigzag terbalik */}
                <ZigzagEdge flip />
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
