"use client";

import { useState } from "react";
import { ClipboardList, Store, Clock, Utensils, MapPin, Search, X, AlertTriangle, Loader2 } from "lucide-react";
import PaymentModal from "../components/modals/PaymentModal";
import { cancelOrderItem, cancelOrder } from "../actions/orders";
import { useRouter } from "next/navigation";

const CANCEL_REASONS = ['Salah Input', 'Permintaan Customer', 'Tidak Tersedia', 'Lainnya'];

function CancelModal({ mode, target, onClose, onConfirm }) {
    const [reason, setReason] = useState(CANCEL_REASONS[0]);
    const [customReason, setCustomReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const finalReason = reason === 'Lainnya' ? customReason : reason;

    const handleConfirm = async () => {
        if (!finalReason.trim()) return;
        setIsLoading(true);
        await onConfirm(finalReason);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-red-50">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg font-black text-red-700">
                            {mode === 'item' ? 'Batalkan Item' : 'Batalkan Pesanan'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        {mode === 'item'
                            ? `Batalkan item "${target?.menu_items?.name || target?.name}" x${target?.quantity}?`
                            : `Batalkan seluruh pesanan ${target?.order_number}?`}
                    </p>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Alasan Pembatalan *</label>
                        <div className="grid grid-cols-2 gap-2">
                            {CANCEL_REASONS.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`py-2 px-3 rounded-xl border-2 text-sm font-bold transition-all ${reason === r ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        {reason === 'Lainnya' && (
                            <input
                                type="text"
                                value={customReason}
                                onChange={e => setCustomReason(e.target.value)}
                                placeholder="Tulis alasan..."
                                className="mt-3 w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-red-400"
                            />
                        )}
                    </div>
                </div>

                <div className="p-5 border-t bg-gray-50 flex gap-3">
                    <button onClick={onClose} disabled={isLoading} className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors disabled:opacity-50">
                        Batal
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading || !finalReason.trim()}
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Ya, Batalkan
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ActiveOrdersClient({ initialOrders, error }) {
    const router = useRouter();
    const [orders, setOrders] = useState(initialOrders || []);
    const [searchTerm, setSearchTerm] = useState("");
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [actionMsg, setActionMsg] = useState(null);

    const getElapsedTime = (createdStr) => {
        const ms = new Date() - new Date(createdStr);
        const minutes = Math.floor(ms / 60000);
        return minutes < 60 ? `${minutes} mnt lalu` : `${Math.floor(minutes / 60)} jam lalu`;
    };

    const filteredOrders = orders.filter(o =>
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.tables?.table_number && String(o.tables.table_number).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenPayment = (order) => {
        const simulatedCart = order.order_items
            .filter(item => item.status !== 'Dibatalkan')
            .map(item => ({
                id: item.menu_item_id,
                name: item.menu_items?.name || 'Item Terhapus',
                price: Number(item.unit_price),
                qty: Number(item.quantity)
            }));

        setSelectedOrder({
            id: order.id,
            number: order.order_number,
            cart: simulatedCart,
            subtotal: Number(order.subtotal),
            taxAmount: Number(order.pbjt_total),
            grandTotal: Number(order.grand_total)
        });
        setPaymentModalOpen(true);
    };

    const handleCancelItem = async (reason) => {
        const { orderId, item } = cancelTarget;
        const res = await cancelOrderItem(orderId, item.id, reason);
        if (res.success) {
            setActionMsg({ type: 'success', text: res.message });
            setOrders(prev => prev.map(o => {
                if (o.id !== orderId) return o;
                return { ...o, order_items: o.order_items.map(it => it.id === item.id ? { ...it, status: 'Dibatalkan', cancellation_reason: reason } : it) };
            }));
        } else {
            setActionMsg({ type: 'error', text: res.message });
        }
        setCancelTarget(null);
        setTimeout(() => setActionMsg(null), 3000);
    };

    const handleCancelOrder = async (reason) => {
        const { orderId } = cancelTarget;
        const res = await cancelOrder(orderId, reason);
        if (res.success) {
            setOrders(prev => prev.filter(o => o.id !== orderId));
            setActionMsg({ type: 'success', text: res.message });
        } else {
            setActionMsg({ type: 'error', text: res.message });
        }
        setCancelTarget(null);
        setTimeout(() => { setActionMsg(null); router.refresh(); }, 3000);
    };

    const pbjtRateValue = selectedOrder && selectedOrder.subtotal > 0 ? selectedOrder.taxAmount / selectedOrder.subtotal : 0.1;

    return (
        <div className="flex w-full h-full bg-gray-50 overflow-hidden font-sans text-gray-900">
            <div className="flex-1 flex flex-col h-full overflow-hidden">

                {/* Header */}
                <header className="bg-white px-8 py-6 flex items-center justify-between border-b shadow-xs z-10 shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-primary-900 flex items-center gap-2">
                            <ClipboardList className="w-7 h-7 text-accent-500" />
                            Pesanan Aktif (Belum Lunas)
                        </h1>
                        <p className="text-sm font-medium text-gray-500 mt-1">Daftar meja berjalan atau order Takeaway yang menunggu dibayar.</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Cari Meja atau Order No..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-72 bg-gray-50 rounded-full py-3 pl-10 pr-4 focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all border border-gray-200"
                        />
                    </div>
                </header>

                {/* Action Message */}
                {actionMsg && (
                    <div className={`px-8 py-3 text-sm font-bold shrink-0 ${actionMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {actionMsg.text}
                    </div>
                )}

                {/* Board Area */}
                <div className="flex-1 overflow-y-auto p-8">
                    {error ? (
                        <div className="bg-red-50 text-red-600 p-6 rounded-2xl font-semibold border border-red-100 flex items-center gap-3">
                            <Store className="w-6 h-6" /> {error}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                            <Store className="w-20 h-20 opacity-20" />
                            <p className="font-semibold text-lg">Semua Tagihan Sudah Lunas!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start auto-rows-max">
                            {filteredOrders.map(order => (
                                <div key={order.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">

                                    {/* Card Header */}
                                    <div className="bg-primary-900 text-white p-5 flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {order.order_type === 'Dine-In' ? <Utensils className="w-4 h-4 text-accent-400" /> : <MapPin className="w-4 h-4 text-primary-300" />}
                                                <span className="font-bold text-sm">{order.order_type.toUpperCase()}</span>
                                            </div>
                                            <h3 className="text-2xl font-black">
                                                {order.order_type === 'Dine-In' ? `Meja ${order.tables?.table_number}` : 'Dibawa Pulang'}
                                            </h3>
                                            <p className="text-primary-300 text-xs font-medium mt-1">Order ID: {order.order_number}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="bg-primary-800/80 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {getElapsedTime(order.created_at)}
                                            </div>
                                            <button
                                                onClick={() => setCancelTarget({ mode: 'order', orderId: order.id, item: order })}
                                                className="text-[10px] font-black uppercase tracking-wide text-red-300 hover:text-red-200 flex items-center gap-1 transition-colors"
                                            >
                                                <X className="w-3 h-3" /> Batal Semua
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Body (Items) */}
                                    <div className="p-5 flex-1 bg-gray-50/50">
                                        <ul className="space-y-2">
                                            {order.order_items.map((item) => {
                                                const isCancelled = item.status === 'Dibatalkan';
                                                return (
                                                    <li key={item.id} className={`flex justify-between items-start text-sm border-b border-dashed border-gray-100 pb-2 last:border-0 last:pb-0 ${isCancelled ? 'opacity-40' : ''}`}>
                                                        <div className="flex gap-2 flex-1 min-w-0">
                                                            <span className={`font-bold shrink-0 ${isCancelled ? 'text-red-400 line-through' : 'text-gray-700'}`}>{item.quantity}x</span>
                                                            <div className="min-w-0">
                                                                <span className={`font-medium ${isCancelled ? 'line-through text-red-400' : 'text-gray-900'}`}>{item.menu_items?.name}</span>
                                                                {item.notes && <p className="text-xs text-red-500 italic">Catatan: {item.notes}</p>}
                                                                {isCancelled && <p className="text-[10px] text-red-400 font-bold">DIBATALKAN{item.cancellation_reason ? `: ${item.cancellation_reason}` : ''}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="font-semibold text-gray-600 whitespace-nowrap hidden sm:block">
                                                                Rp {Number(item.subtotal).toLocaleString('id-ID')}
                                                            </span>
                                                            {!isCancelled && (
                                                                <button
                                                                    onClick={() => setCancelTarget({ mode: 'item', orderId: order.id, item })}
                                                                    className="p-1 hover:bg-red-100 rounded-lg transition-colors text-red-400 hover:text-red-600"
                                                                    title="Batalkan item ini"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="p-5 border-t border-gray-100 bg-white grid grid-cols-2 items-center gap-4 shrink-0">
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold mb-0.5">Total Tagihan</p>
                                            <p className="font-black text-xl text-primary-900">Rp {Number(order.grand_total).toLocaleString('id-ID')}</p>
                                        </div>
                                        <button
                                            onClick={() => handleOpenPayment(order)}
                                            className="bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 rounded-xl transition-colors active:scale-95 shadow-md shadow-accent-500/20"
                                        >
                                            Bayar Lunas
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Payment Modal */}
                {selectedOrder && (
                    <PaymentModal
                        isOpen={paymentModalOpen}
                        onClose={() => setPaymentModalOpen(false)}
                        cart={selectedOrder.cart}
                        outletData={{ pbjtActive: selectedOrder.taxAmount > 0, pbjtRate: pbjtRateValue }}
                        onPaySuccess={(receipt, change) => {
                            setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
                            setPaymentModalOpen(false);
                            alert(`LUNAS! Struk: ${receipt}. Kembalian: Rp ${change.toLocaleString('id-ID')}`);
                        }}
                    />
                )}

                {/* Cancel Modal */}
                {cancelTarget && (
                    <CancelModal
                        mode={cancelTarget.mode}
                        target={cancelTarget.item}
                        onClose={() => setCancelTarget(null)}
                        onConfirm={cancelTarget.mode === 'item' ? handleCancelItem : handleCancelOrder}
                    />
                )}
            </div>
        </div>
    );
}
