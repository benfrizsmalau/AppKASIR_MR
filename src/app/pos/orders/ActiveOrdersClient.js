"use client";

import { useState } from "react";
import { ClipboardList, Store, Clock, Utensils, MapPin, Search } from "lucide-react";
import PaymentModal from "../components/modals/PaymentModal";

export default function ActiveOrdersClient({ initialOrders, error }) {
    const [orders, setOrders] = useState(initialOrders || []);
    const [searchTerm, setSearchTerm] = useState("");
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Time elapsed formatter helper
    const getElapsedTime = (createdStr) => {
        const ms = new Date() - new Date(createdStr);
        const minutes = Math.floor(ms / 60000);
        return minutes < 60 ? `${minutes} mnt lalu` : `${Math.floor(minutes / 60)} jam lalu`;
    };

    const filteredOrders = orders.filter(o =>
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.tables?.table_number && o.tables.table_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenPayment = (order) => {
        // Rekonstruksi format data cart untuk PaymentModal supaya klop
        const simulatedCart = order.order_items.map(item => ({
            id: item.menu_item_id, // Important for stock updates
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
                                <div key={order.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">

                                    {/* Card Header */}
                                    <div className="bg-primary-900 text-white p-5 flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {order.order_type === 'Dine-In' ? <Utensils className="w-4 h-4 text-accent-400" /> : <MapPin className="w-4 h-4 text-primary-300" />}
                                                <span className="font-bold text-sm track">{order.order_type.toUpperCase()}</span>
                                            </div>
                                            <h3 className="text-2xl font-black">
                                                {order.order_type === 'Dine-In' ? `Meja ${order.tables?.table_number}` : 'Dibawa Pulang'}
                                            </h3>
                                            <p className="text-primary-300 text-xs font-medium mt-1">Order ID: {order.order_number}</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <div className="bg-primary-800/80 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm">
                                                <Clock className="w-3.5 h-3.5" />
                                                {getElapsedTime(order.created_at)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body (Items) */}
                                    <div className="p-5 flex-1 bg-gray-50/50">
                                        <ul className="space-y-3 mb-4">
                                            {order.order_items.map((item, idx) => (
                                                <li key={item.id} className="flex justify-between items-start text-sm border-b border-gray-100 border-dashed pb-2 last:border-0 last:pb-0">
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-gray-700">{item.quantity}x</span>
                                                        <div>
                                                            <span className="font-medium text-gray-900">{item.menu_items?.name}</span>
                                                            {item.notes && <p className="text-xs text-red-500 font-medium italic">Catatan: {item.notes}</p>}
                                                        </div>
                                                    </div>
                                                    <span className="font-semibold text-gray-600 whitespace-nowrap hidden sm:block">
                                                        Rp {Number(item.subtotal).toLocaleString('id-ID')}
                                                    </span>
                                                </li>
                                            ))}
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

                {/* Re-use Payment Modal via States */}
                {selectedOrder && (
                    <PaymentModal
                        isOpen={paymentModalOpen}
                        onClose={() => setPaymentModalOpen(false)}
                        cart={selectedOrder.cart}
                        outletData={{
                            pbjtActive: selectedOrder.taxAmount > 0,
                            pbjtRate: pbjtRateValue
                        }}
                        onPaySuccess={(receipt, change) => {
                            // Hilangkan dari antrian state lokal setelah bayar (optimistic UX)
                            setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
                            setPaymentModalOpen(false);
                            alert(`LUNAS! Struk: ${receipt}. Kembalian: Rp ${change.toLocaleString('id-ID')}`);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
