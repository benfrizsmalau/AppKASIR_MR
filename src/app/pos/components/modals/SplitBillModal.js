"use client";

import { useState } from "react";
import { X, Users, DivideSquare, CheckCircle, Plus, Minus, Wallet, QrCode, CreditCard } from "lucide-react";
import { processPayment } from "../../actions/payment";

export default function SplitBillModal({ isOpen, onClose, cart, outletData, selectedCustomer, billing, onSplitSuccess, userName }) {
    const { itemsSubtotal = 0, totalDiscountAmount = 0, serviceChargeAmount = 0, dpp = 0, pbjtAmount = 0, grandTotal = 0 } = billing || {};
    const finalTotal = Math.round(grandTotal);

    // ── Mode: 'merata' (by count) atau 'manual' (assign items) ───────────────
    const [splitMode, setSplitMode] = useState('merata');
    const [splitCount, setSplitCount] = useState(2);
    const [paidParts, setPaidParts] = useState([]); // [{idx, method, cashTendered, paid}]
    const [currentPart, setCurrentPart] = useState(0);
    const [partMethod, setPartMethod] = useState('Tunai');
    const [partCash, setPartCash] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // ── Kalkulasi merata ──────────────────────────────────────────────────────
    const amountPerPart = Math.ceil(finalTotal / splitCount);
    const lastPartAmount = finalTotal - amountPerPart * (splitCount - 1);
    const getPartAmount = (idx) => idx === splitCount - 1 ? lastPartAmount : amountPerPart;

    const totalPaid = paidParts.reduce((s, p) => s + p.cashTendered, 0);
    const allPaid = paidParts.length >= splitCount || totalPaid >= finalTotal;

    // ── Bayar satu bagian ─────────────────────────────────────────────────────
    const handlePayPart = async () => {
        const partAmount = getPartAmount(currentPart);
        const cash = parseFloat(partCash) || partAmount;

        if (partMethod === 'Tunai' && cash < partAmount) {
            setErrorMsg(`Uang kurang. Butuh minimal Rp ${partAmount.toLocaleString('id-ID')}`);
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        // Kita record setiap bagian sebagai sub-payment terpisah
        setPaidParts(prev => [...prev, {
            idx: currentPart,
            method: partMethod,
            cashTendered: cash,
            amount: partAmount,
            change: partMethod === 'Tunai' ? Math.max(0, cash - partAmount) : 0,
            paid: true
        }]);

        setCurrentPart(prev => prev + 1);
        setPartCash('');
        setIsSubmitting(false);
    };

    // ── Finalisasi semua bagian ───────────────────────────────────────────────
    const handleFinalize = async () => {
        if (!allPaid) return;
        setIsSubmitting(true);

        // Proses satu pembayaran dengan method = Campuran atau method pertama
        const methods = [...new Set(paidParts.map(p => p.method))];
        const finalMethod = methods.length === 1 ? methods[0] : 'Campuran';

        const payload = {
            orderId: null,
            cartData: cart,
            paymentMethod: finalMethod,
            mixedPayments: paidParts.map(p => ({ method: p.method, amount: p.amount })),
            itemsSubtotal,
            discountTotal: totalDiscountAmount,
            serviceChargeAmount,
            dppTotal: dpp,
            taxAmount: pbjtAmount,
            grandTotal: finalTotal,
            cashTendered: paidParts.reduce((s, p) => s + p.cashTendered, 0),
            changeAmount: paidParts.reduce((s, p) => s + p.change, 0),
            customerId: selectedCustomer?.id,
            customerName: selectedCustomer?.name || null
        };

        const result = await processPayment(payload);
        setIsSubmitting(false);

        if (result.success) {
            onSplitSuccess(result.receiptNumber, paidParts);
        } else {
            setErrorMsg(result.message);
        }
    };

    if (!isOpen) return null;

    const remainingTotal = finalTotal - paidParts.reduce((s, p) => s + p.amount, 0);
    const partAmount = getPartAmount(currentPart);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <DivideSquare className="w-6 h-6 text-primary-700" />
                        <h2 className="text-xl font-bold text-primary-900">Split Bill</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold">{errorMsg}</div>
                    )}

                    {/* Total */}
                    <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-primary-400 uppercase tracking-wide">Total Tagihan</p>
                            <p className="text-3xl font-black text-primary-900 mt-1">Rp {finalTotal.toLocaleString('id-ID')}</p>
                        </div>
                        {remainingTotal > 0 && paidParts.length > 0 && (
                            <div className="text-right">
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-wide">Sisa</p>
                                <p className="text-2xl font-black text-amber-600">Rp {remainingTotal.toLocaleString('id-ID')}</p>
                            </div>
                        )}
                    </div>

                    {/* Jumlah orang */}
                    {paidParts.length === 0 && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Bagi tagihan untuk berapa orang?
                            </label>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSplitCount(c => Math.max(2, c - 1))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors">
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-3xl font-black w-12 text-center">{splitCount}</span>
                                <button onClick={() => setSplitCount(c => Math.min(10, c + 1))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-600 flex items-center justify-center transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                                <div className="ml-4 text-sm text-gray-500">
                                    <span className="font-bold text-gray-700">Rp {amountPerPart.toLocaleString('id-ID')}</span>
                                    <span> per orang</span>
                                    {lastPartAmount !== amountPerPart && (
                                        <span className="text-xs text-gray-400 block">(orang terakhir: Rp {lastPartAmount.toLocaleString('id-ID')})</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bagian yang sudah dibayar */}
                    {paidParts.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-gray-600">Riwayat Pembayaran</p>
                            {paidParts.map((p, i) => (
                                <div key={i} className="flex items-center justify-between bg-green-50 border border-green-100 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Bagian {i + 1} — {p.method}</p>
                                            {p.change > 0 && <p className="text-xs text-green-600">Kembalian: Rp {p.change.toLocaleString('id-ID')}</p>}
                                        </div>
                                    </div>
                                    <p className="font-bold text-green-700">Rp {p.amount.toLocaleString('id-ID')}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bayar bagian saat ini */}
                    {!allPaid && (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-gray-800">Bayar Bagian {currentPart + 1} dari {splitCount}</p>
                                <p className="text-xl font-black text-primary-900">Rp {partAmount.toLocaleString('id-ID')}</p>
                            </div>

                            {/* Metode */}
                            <div className="grid grid-cols-3 gap-2">
                                {['Tunai', 'QRIS', 'Debit', 'Kredit', 'Transfer Bank'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setPartMethod(m)}
                                        className={`py-2 px-2 border-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${partMethod === m ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        {m === 'Tunai' ? <Wallet className="w-3 h-3" /> : m === 'QRIS' ? <QrCode className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                                        {m}
                                    </button>
                                ))}
                            </div>

                            {/* Cash input */}
                            {partMethod === 'Tunai' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Uang Diterima</label>
                                    <input
                                        type="number"
                                        value={partCash}
                                        onChange={e => setPartCash(e.target.value)}
                                        placeholder={partAmount.toString()}
                                        className="w-full text-xl font-bold bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    {partCash && parseFloat(partCash) >= partAmount && (
                                        <p className="text-sm text-green-600 font-bold mt-1">
                                            Kembalian: Rp {(parseFloat(partCash) - partAmount).toLocaleString('id-ID')}
                                        </p>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handlePayPart}
                                disabled={isSubmitting}
                                className="w-full py-3 bg-primary-900 text-accent-400 rounded-xl font-bold hover:bg-primary-800 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Memproses...' : `Konfirmasi Bayar Bagian ${currentPart + 1}`}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {allPaid && (
                    <div className="p-5 border-t bg-gray-50 shrink-0">
                        <div className="bg-green-50 border border-green-200 p-3 rounded-xl text-center mb-4">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                            <p className="font-bold text-green-700">Semua bagian telah dibayar!</p>
                        </div>
                        <button
                            onClick={handleFinalize}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Memfinalisasi...' : 'Selesaikan & Cetak Struk'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
