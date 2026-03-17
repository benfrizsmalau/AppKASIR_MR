"use client";

import { useEffect, useState } from "react";
import { X, Utensils, TakeoutDining, MapPin } from "lucide-react";
import { getTablesData, holdOrderSubmit } from "../../actions/orders";

export default function CheckoutModal({ isOpen, onClose, cart, outletData, onHoldSuccess, selectedCustomer, billing }) {
    const { itemsSubtotal = 0, totalDiscountAmount = 0, serviceChargeAmount = 0, dpp = 0, pbjtAmount = 0, grandTotal = 0 } = billing || {};
    const [tables, setTables] = useState([]);
    const [loadingTables, setLoadingTables] = useState(false);

    const [orderType, setOrderType] = useState('Dine-In'); // 'Dine-In', 'Takeaway'
    const [selectedTable, setSelectedTable] = useState(null);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Fetch Tables
    useEffect(() => {
        if (isOpen && orderType === 'Dine-In') {
            const fetchTbl = async () => {
                setLoadingTables(true);
                const res = await getTablesData();
                if (res.success) setTables(res.tables);
                setLoadingTables(false);
            };
            fetchTbl();
        }
    }, [isOpen, orderType]);

    const finalTotal = Math.round(grandTotal);

    const handleHoldOrder = async () => {
        if (orderType === 'Dine-In' && !selectedTable) {
            setErrorMsg('Silakan pilih meja terlebih dahulu untuk Dine-In');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg("");

        const payload = {
            cartData: cart,
            tableId: selectedTable,
            orderType,
            itemsSubtotal,
            discountTotal: totalDiscountAmount,
            serviceChargeAmount,
            dppTotal: dpp,
            taxAmount: pbjtAmount,
            grandTotal: finalTotal,
            notes,
            customerId: selectedCustomer?.id,
            customerName: selectedCustomer ? selectedCustomer.name : null
        };

        const result = await holdOrderSubmit(payload);

        if (result.success) {
            setIsSubmitting(false);
            onHoldSuccess(result.orderNumber, {
                items: cart,
                notes,
                orderType,
                tableNumber: tables.find(t => t.id === selectedTable)?.table_number
            }); // Trigger callback to reset cart in main UI
        } else {
            setErrorMsg(result.message);
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header Modal */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
                    <h2 className="text-xl font-bold text-primary-900">Simpan Pesanan (Hold)</h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-200 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Modal */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">

                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold">
                            {errorMsg}
                        </div>
                    )}

                    {/* Tipe Pesanan Select */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Tipe Pesanan</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => { setOrderType('Dine-In'); setSelectedTable(null); }}
                                className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${orderType === 'Dine-In' ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}
                            >
                                <Utensils className="w-8 h-8 mb-2" />
                                <span className="font-bold">Makan di Tempat (Dine-In)</span>
                            </button>
                            <button
                                onClick={() => { setOrderType('Takeaway'); setSelectedTable(null); }}
                                className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${orderType === 'Takeaway' ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}
                            >
                                {/* Using MapPin as substitute for Takeout icon for now */}
                                <MapPin className="w-8 h-8 mb-2" />
                                <span className="font-bold">Bawa Pulang (Takeaway)</span>
                            </button>
                        </div>
                    </div>

                    {/* Pemilihan Meja (Only for Dine-In) */}
                    {orderType === 'Dine-In' && (
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">Pilih Meja Tersedia</label>
                            {loadingTables ? (
                                <div className="text-center py-4 text-sm text-gray-500 animate-pulse">Memuat meja...</div>
                            ) : (
                                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                    {tables.length === 0 && <span className="text-sm text-gray-400">Belum ada meja dikonfigurasi.</span>}
                                    {tables.map(tbl => (
                                        <button
                                            key={tbl.id}
                                            disabled={tbl.status === 'Terisi'}
                                            onClick={() => setSelectedTable(tbl.id)}
                                            className={`w-16 h-16 shrink-0 rounded-2xl flex flex-col items-center justify-center font-bold text-lg border-2 transition-all 
                                      ${tbl.status === 'Terisi' ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed opacity-60'
                                                    : selectedTable === tbl.id ? 'bg-primary-600 border-primary-600 text-white shadow-md scale-105'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50'}`}
                                        >
                                            {tbl.table_number}
                                            <span className={`text-[9px] font-medium leading-none mt-1 ${tbl.status === 'Terisi' ? 'text-red-400' : selectedTable === tbl.id ? 'text-primary-100' : 'text-gray-400'}`}>
                                                {tbl.status === 'Terisi' ? 'Isi' : `Kap ${tbl.capacity}`}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Catatan KOT Khusus */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan Pesanan Khusus (Misal: Tidak pakai seledri)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Opsional..."
                            rows={2}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="p-6 border-t bg-gray-50 shrink-0 grid grid-cols-2 gap-4">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="py-3 px-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleHoldOrder}
                        disabled={isSubmitting}
                        className={`py-3 px-4 text-white rounded-xl font-bold shadow-lg shadow-accent-500/30 transition-all ${isSubmitting ? 'bg-accent-400 opacity-70 cursor-wait' : 'bg-accent-500 hover:bg-accent-600 active:scale-95'}`}
                    >
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Pesanan & Print KOT'}
                    </button>
                </div>

            </div>
        </div>
    );
}
