"use client";

import { useState } from "react";
import { X, Wallet, QrCode, CreditCard, CheckCircle, Plus, Trash2 } from "lucide-react";
import { processPayment } from "../../actions/payment";

const PAYMENT_METHODS = ['Tunai', 'QRIS', 'Debit', 'Kredit', 'Transfer Bank'];

export default function PaymentModal({ isOpen, onClose, cart, outletData, onPaySuccess, selectedCustomer, billing }) {
    const { itemsSubtotal = 0, totalDiscountAmount = 0, serviceChargeAmount = 0, dpp = 0, pbjtAmount = 0, grandTotal = 0 } = billing || {};

    const finalTotal = Math.round(grandTotal);

    // ── State ─────────────────────────────────────────────────────────────────
    const [isMixedPayment, setIsMixedPayment] = useState(false);

    // Single payment
    const [paymentMethod, setPaymentMethod] = useState('Tunai');
    const [cashTendered, setCashTendered] = useState(finalTotal.toString());

    // Mixed payment: [{method, amount}]
    const [mixedPayments, setMixedPayments] = useState([
        { method: 'Tunai', amount: '' },
        { method: 'QRIS', amount: '' }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // ── Kalkulasi ─────────────────────────────────────────────────────────────
    const currentCash = parseFloat(cashTendered || 0);
    const changeAmount = paymentMethod === 'Tunai' ? Math.max(0, currentCash - finalTotal) : 0;

    const mixedTotal = mixedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const mixedRemaining = Math.max(0, finalTotal - mixedTotal);
    const mixedChange = Math.max(0, mixedTotal - finalTotal);

    const availableCredit = Number(selectedCustomer?.credit_limit || 0) - Number(selectedCustomer?.current_debt || 0);

    const isSufficientFunds = isMixedPayment
        ? mixedTotal >= finalTotal
        : paymentMethod === 'Tunai' ? currentCash >= finalTotal
            : paymentMethod === 'Hutang' ? availableCredit >= finalTotal
                : true;

    // Quick cash options
    const cashOptions = [
        finalTotal,
        Math.ceil(finalTotal / 50000) * 50000,
        Math.ceil(finalTotal / 100000) * 100000
    ].filter((v, i, a) => a.indexOf(v) === i && v > 0);

    // ── Mixed Payment Helpers ─────────────────────────────────────────────────
    const updateMixedPayment = (idx, field, value) => {
        setMixedPayments(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    };

    const addMixedRow = () => {
        if (mixedPayments.length >= 4) return;
        setMixedPayments(prev => [...prev, { method: 'Transfer Bank', amount: '' }]);
    };

    const removeMixedRow = (idx) => {
        if (mixedPayments.length <= 2) return;
        setMixedPayments(prev => prev.filter((_, i) => i !== idx));
    };

    // Auto-fill sisa amount di baris terakhir
    const autoFillRemaining = (idx) => {
        if (idx === mixedPayments.length - 1 && mixedRemaining > 0) {
            updateMixedPayment(idx, 'amount', mixedRemaining.toString());
        }
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handlePayment = async () => {
        if (!isSufficientFunds) {
            if (paymentMethod === 'Hutang') setErrorMsg('Sisa limit kredit pelanggan tidak mencukupi.');
            else if (isMixedPayment) setErrorMsg('Total pembayaran belum mencukupi total tagihan.');
            else setErrorMsg('Uang yang dimasukkan kurang dari total tagihan.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg("");

        const finalMethod = isMixedPayment ? 'Campuran' : paymentMethod;
        const finalCash = isMixedPayment ? mixedTotal : (paymentMethod === 'Tunai' ? currentCash : finalTotal);
        const finalChange = isMixedPayment ? mixedChange : changeAmount;

        const payload = {
            orderId: null,
            cartData: cart,
            paymentMethod: finalMethod,
            mixedPayments: isMixedPayment ? mixedPayments : null,
            itemsSubtotal,
            discountTotal: totalDiscountAmount,
            serviceChargeAmount,
            dppTotal: dpp,
            taxAmount: pbjtAmount,
            grandTotal: finalTotal,
            cashTendered: finalCash,
            changeAmount: finalChange,
            customerId: selectedCustomer?.id,
            customerName: selectedCustomer?.name || null
        };

        const result = await processPayment(payload);

        if (result.success) {
            setIsSubmitting(false);
            setCashTendered(finalTotal.toString());
            onPaySuccess(result.receiptNumber, finalChange, finalMethod, finalCash);
        } else {
            setErrorMsg(result.message);
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex max-h-[90vh]">

                {/* ── Kiri: Metode & Input ── */}
                <div className="w-[55%] flex flex-col border-r border-gray-100">
                    <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
                        <h2 className="text-xl font-bold text-primary-900">Pembayaran</h2>
                        <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 space-y-5">
                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold">
                                {errorMsg}
                            </div>
                        )}

                        {/* Toggle: Single vs Mixed */}
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                            <button
                                onClick={() => setIsMixedPayment(false)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isMixedPayment ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-500'}`}
                            >
                                Satu Metode
                            </button>
                            <button
                                onClick={() => setIsMixedPayment(true)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isMixedPayment ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-500'}`}
                            >
                                Bayar Campuran
                            </button>
                        </div>

                        {/* Single Payment */}
                        {!isMixedPayment && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Pilih Metode Pembayaran</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[...PAYMENT_METHODS, ...(selectedCustomer ? ['Hutang'] : [])].map(meth => (
                                            <button
                                                key={meth}
                                                onClick={() => {
                                                    setPaymentMethod(meth);
                                                    setCashTendered(meth === 'Tunai' ? finalTotal.toString() : '');
                                                }}
                                                className={`flex items-center gap-2 p-3 border-2 rounded-xl transition-all text-sm ${paymentMethod === meth ? 'border-primary-600 bg-primary-50 text-primary-800 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                {meth === 'Tunai' ? <Wallet className="w-4 h-4 shrink-0" />
                                                    : meth === 'QRIS' ? <QrCode className="w-4 h-4 shrink-0" />
                                                        : <CreditCard className="w-4 h-4 shrink-0" />}
                                                <span className="font-bold">{meth === 'Hutang' ? 'Hutang / Piutang' : meth}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {paymentMethod === 'Tunai' && (
                                    <div className="space-y-3 animate-in fade-in">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Uang Diterima (Rp)</label>
                                            <input
                                                type="number"
                                                value={cashTendered}
                                                onChange={e => setCashTendered(e.target.value)}
                                                className="w-full text-2xl font-bold bg-gray-50 border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            {cashOptions.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCashTendered(opt.toString())}
                                                    className="flex-1 py-2 px-2 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-700 text-xs font-bold border border-gray-200 rounded-lg transition-colors"
                                                >
                                                    {i === 0 ? 'Pas' : `Rp ${(opt / 1000).toFixed(0)}k`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'QRIS' && (
                                    <div className="p-8 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 animate-in fade-in">
                                        <QrCode className="w-24 h-24 text-gray-300 mb-4" />
                                        <p className="text-gray-500 font-medium text-center text-sm">Arahkan kamera pelanggan ke QR reader.</p>
                                    </div>
                                )}

                                {paymentMethod === 'Hutang' && selectedCustomer && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Info Kredit Pelanggan</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Limit Kredit</span>
                                            <span className="font-bold">Rp {Number(selectedCustomer.credit_limit).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Hutang Saat Ini</span>
                                            <span className="font-bold text-red-600">Rp {Number(selectedCustomer.current_debt).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-t border-amber-200 pt-2">
                                            <span className="text-gray-600">Sisa Limit</span>
                                            <span className={`font-bold ${availableCredit >= finalTotal ? 'text-green-600' : 'text-red-600'}`}>
                                                Rp {availableCredit.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Mixed Payment */}
                        {isMixedPayment && (
                            <div className="space-y-3 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-gray-700">Rincian Pembayaran</label>
                                    <span className={`text-sm font-bold ${mixedRemaining > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        Sisa: Rp {mixedRemaining.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                {mixedPayments.map((p, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <select
                                            value={p.method}
                                            onChange={e => updateMixedPayment(idx, 'method', e.target.value)}
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-400"
                                        >
                                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            value={p.amount}
                                            onChange={e => updateMixedPayment(idx, 'amount', e.target.value)}
                                            onFocus={() => autoFillRemaining(idx)}
                                            placeholder="Jumlah"
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-400"
                                        />
                                        {mixedPayments.length > 2 && (
                                            <button onClick={() => removeMixedRow(idx)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {mixedPayments.length < 4 && (
                                    <button
                                        onClick={addMixedRow}
                                        className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:text-primary-600 hover:border-primary-300 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Tambah Metode Pembayaran
                                    </button>
                                )}

                                {mixedChange > 0 && (
                                    <div className="flex justify-between text-sm font-bold text-green-700 bg-green-50 p-3 rounded-xl border border-green-100">
                                        <span>Kembalian</span>
                                        <span>Rp {mixedChange.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Kanan: Ringkasan ── */}
                <div className="w-[45%] flex flex-col bg-gray-50">
                    <div className="p-6 flex-1 overflow-y-auto">
                        <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Ringkasan Tagihan</h3>
                        <div className="space-y-2.5">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>Rp {itemsSubtotal.toLocaleString('id-ID')}</span>
                            </div>
                            {totalDiscountAmount > 0 && (
                                <div className="flex justify-between text-sm text-green-600 font-medium">
                                    <span>Total Diskon</span>
                                    <span>- Rp {Math.round(totalDiscountAmount).toLocaleString('id-ID')}</span>
                                </div>
                            )}
                            {serviceChargeAmount > 0 && (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Service Charge ({(outletData.serviceChargeRate * 100).toFixed(0)}%)</span>
                                    <span>Rp {Math.round(serviceChargeAmount).toLocaleString('id-ID')}</span>
                                </div>
                            )}
                            {outletData.pbjtActive && (
                                <>
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>DPP (Dasar Pengenaan Pajak)</span>
                                        <span>Rp {Math.round(dpp).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>PBJT Restoran ({(outletData.pbjtRate * 100).toFixed(0)}%)</span>
                                        <span>{outletData.pbjtMode === 'Inklusif' ? '(inklusif)' : `Rp ${Math.round(pbjtAmount).toLocaleString('id-ID')}`}</span>
                                    </div>
                                </>
                            )}
                            <div className="border-t border-gray-300 pt-3 flex justify-between items-end">
                                <span className="font-bold text-gray-800">TOTAL</span>
                                <span className="text-4xl font-black text-primary-900">Rp {finalTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {/* Kembalian (single tunai) */}
                        {!isMixedPayment && paymentMethod === 'Tunai' && currentCash > 0 && (
                            <div className="mt-6 pt-4 border-t border-dashed border-gray-300 space-y-2">
                                <div className="flex justify-between text-sm text-gray-600 font-medium">
                                    <span>Uang Diterima</span>
                                    <span>Rp {currentCash.toLocaleString('id-ID')}</span>
                                </div>
                                <div className={`flex justify-between items-end ${changeAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    <span className="font-bold">Kembalian</span>
                                    <span className="text-2xl font-black">Rp {changeAmount.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        )}

                        {/* Customer info on right panel */}
                        {selectedCustomer && (
                            <div className="mt-4 p-3 bg-white rounded-xl border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Pelanggan</p>
                                <p className="text-sm font-bold text-gray-900">{selectedCustomer.name}</p>
                                <p className="text-xs text-gray-400">{selectedCustomer.type}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-5 bg-white border-t shrink-0">
                        <button
                            onClick={handlePayment}
                            disabled={isSubmitting || !isSufficientFunds || cart.length === 0}
                            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold shadow-xl transition-all ${isSubmitting || !isSufficientFunds || cart.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                                : 'bg-green-500 hover:bg-green-600 text-white active:scale-95 shadow-green-500/30'
                                }`}
                        >
                            {isSubmitting ? 'Memproses...' : (
                                <>
                                    <CheckCircle className="w-6 h-6" />
                                    Konfirmasi Bayar
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
