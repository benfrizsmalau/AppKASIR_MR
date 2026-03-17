"use client";

import { useState, useEffect } from "react";
import {
    Clock,
    Utensils,
    CheckCircle2,
    Flame,
    Bell,
    ShoppingBag,
    Monitor,
    RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "../actions/orders";

export default function KDSClient({ initialOrders }) {
    const router = useRouter();
    const [orders, setOrders] = useState(initialOrders || []);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
            router.refresh();
        }, 30000);
        return () => clearInterval(interval);
    }, [router]);

    // Update local state when props change
    useEffect(() => {
        setOrders(initialOrders);
    }, [initialOrders]);

    const getElapsedTime = (createdStr) => {
        const ms = currentTime - new Date(createdStr);
        const minutes = Math.floor(ms / 60000);
        return minutes;
    };

    const handleStatusMove = async (orderId, nextStatus) => {
        const res = await updateOrderStatus(orderId, nextStatus);
        if (res.success) {
            router.refresh();
        } else {
            alert(res.message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 font-sans text-slate-100 selection:bg-accent-500/30">
            {/* KDS Header */}
            <header className="px-8 py-5 bg-slate-900/50 border-b border-white/5 flex items-center justify-between shrink-0 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent-500 rounded-2xl flex items-center justify-center shadow-lg shadow-accent-500/20">
                        <Monitor className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                            Monitor Dapur (KDS)
                        </h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Dashboard Antrean Pesanan</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xl font-black font-mono tracking-tighter text-accent-400">
                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                    <button
                        onClick={() => router.refresh()}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 group"
                    >
                        <RefreshCw className="w-5 h-5 text-slate-400 group-active:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </header>

            {/* Board Area */}
            <main className="flex-1 overflow-x-auto p-8 flex gap-8">
                {orders.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center text-slate-600 gap-6">
                        <Bell className="w-24 h-24 opacity-10 animate-pulse" />
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-slate-400">Dapur Sedang Tenang</h2>
                            <p className="font-bold text-slate-600">Belum ada pesanan masuk saat ini.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-6 h-full items-start">
                        {orders.map(order => {
                            const elapsed = getElapsedTime(order.created_at);
                            const isDelayed = elapsed > 15; // Warn if more than 15 mins
                            const isCritical = elapsed > 25; // Red if more than 25 mins

                            let statusColor = "bg-slate-800 border-white/10 text-slate-400";
                            let icon = <Clock className="w-4 h-4" />;
                            let buttonText = "Masak Sekarang";
                            let nextStatus = "Sedang Dimasak";

                            if (order.status === 'Sedang Dimasak') {
                                statusColor = "bg-blue-500/10 border-blue-500/30 text-blue-400";
                                icon = <Flame className="w-4 h-4 animate-pulse text-orange-400" />;
                                buttonText = "Tandai Siap Saji";
                                nextStatus = "Siap";
                            } else if (order.status === 'Siap') {
                                statusColor = "bg-green-500/10 border-green-500/30 text-green-400";
                                icon = <Bell className="w-4 h-4 animate-bounce" />;
                                buttonText = "Selesaikan / Diambil";
                                nextStatus = "Selesai";
                            }

                            return (
                                <div
                                    key={order.id}
                                    className={`w-[320px] flex flex-col bg-slate-900 border overflow-hidden transition-all duration-300 rounded-[32px] ${isCritical ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse' :
                                            isDelayed ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' :
                                                'border-white/5 shadow-2xl'
                                        }`}
                                >
                                    {/* Order Header */}
                                    <div className={`p-5 flex justify-between items-start ${isCritical ? 'bg-red-500/10' :
                                            isDelayed ? 'bg-orange-500/5' :
                                                'bg-white/2'
                                        }`}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isCritical ? 'bg-red-500 text-white' :
                                                        isDelayed ? 'bg-orange-500 text-white' :
                                                            'bg-white/10 text-slate-400'
                                                    }`}>
                                                    {icon}
                                                    {elapsed} Menit
                                                </div>
                                                {order.order_type === 'Takeaway' && (
                                                    <div className="bg-accent-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                        <ShoppingBag className="w-3 h-3" />
                                                        Takeaway
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-3xl font-black tracking-tighter text-white">
                                                {order.order_type === 'Dine-In' ? `Meja ${order.tables?.table_number}` : `Order #${order.order_number.slice(-3)}`}
                                            </h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{order.order_number}</p>
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="flex-1 p-5 space-y-4 max-h-[400px] overflow-y-auto">
                                        {order.order_items.map(item => (
                                            <div key={item.id} className="flex gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 font-black text-lg text-accent-400">
                                                    {item.quantity}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-200 leading-tight">{item.menu_items?.name}</p>
                                                    {item.notes && (
                                                        <div className="mt-1 flex gap-1.5 items-start">
                                                            <div className="w-1 h-3 bg-red-500 rounded-full mt-1 shrink-0"></div>
                                                            <p className="text-[11px] font-bold text-red-400 italic leading-tight">{item.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {order.notes && (
                                            <div className="p-3 bg-white/5 rounded-2xl border border-dashed border-white/10 mt-4">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Catatan Order:</p>
                                                <p className="text-sm font-bold text-slate-300 italic">"{order.notes}"</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Action */}
                                    <div className="p-5 bg-white/2 border-t border-white/5">
                                        <button
                                            onClick={() => handleStatusMove(order.id, nextStatus)}
                                            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${order.status === 'Sedang Dimasak'
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-600/10'
                                                    : order.status === 'Siap'
                                                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/30 ring-4 ring-green-600/10'
                                                        : 'bg-white text-slate-900 shadow-xl'
                                                }`}
                                        >
                                            {order.status === 'Sedang Dimasak' ? <Bell className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
                                            {buttonText}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
