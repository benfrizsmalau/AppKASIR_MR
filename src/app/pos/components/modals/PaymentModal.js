"use client";

import { useState } from "react";
import { X, Wallet, QrCode, CreditCard, CheckCircle } from "lucide-react";
import { processPayment } from "../../actions/payment";

export default function PaymentModal({ isOpen, onClose, cart, outletData, onPaySuccess, selectedCustomer }) {
    const [paymentMethod, setPaymentMethod] = useState('Tunai'); // 'Tunai', 'QRIS', 'Debit', 'Kredit', 'Hutang'
    const [cashTendered, setCashTendered] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxAmount = (outletData && outletData.pbjtActive) ? (subtotal * outletData.pbjtRate) : 0;
    const grandTotal = subtotal + taxAmount;

    // Shortcut Uang Pas
    const defaultCashOptions = [
        grandTotal,
        Math.ceil(grandTotal / 50000) * 50000,
        Math.ceil(grandTotal / 100000) * 100000
    ].filter((v, i, a) => a.indexOf(v) === i); // Buang duplikat

    const currentCash = parseFloat(cashTendered || 0);
    const changeAmount = paymentMethod === 'Tunai' ? Math.max(0, currentCash - grandTotal) : 0;
    const isSufficientFunds =
        paymentMethod === 'Tunai' ? currentCash >= grandTotal :
            paymentMethod === 'Hutang' ? (Number(selectedCustomer?.credit_limit || 0) - Number(selectedCustomer?.current_debt || 0)) >= grandTotal :
                true;

    const handlePayment = async () => {
        if (!isSufficientFunds) {
            setErrorMsg(paymentMethod === 'Hutang' ? 'Sisa limit kredit pelanggan tidak mencukupi.' : 'Uang yang dimasukkan kurang dari Total Tagihan.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg("");

        const payload = {
            orderId: null, // Asumsikan Direct Payment/Walk-In untuk saat ini
            cartData: cart,
            paymentMethod,
            subtotal,
            taxAmount,
            grandTotal,
            cashTendered: currentCash,
            changeAmount,
            customerId: selectedCustomer?.id,
            customerName: selectedCustomer ? selectedCustomer.name : null
        };

        const result = await processPayment(payload);

        if (result.success) {
            setIsSubmitting(false);
            setCashTendered("");
            onPaySuccess(result.receiptNumber, changeAmount, paymentMethod, currentCash); // Callback reset UI
        } else {
            setErrorMsg(result.message);
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex max-h-[90vh]">

                {/* Kiri: Rincian & Pilih Pembayaran (60%) */}
                <div className="w-[55%] flex flex-col border-r border-gray-100">
                    <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
                        <h2 className="text-xl font-bold text-primary-900">Pembayaran</h2>
                        <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 bg-white">
                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4">
                                {errorMsg}
                            </div>
                        )}

                        <label className="block text-sm font-semibold text-gray-700 mb-3">Pilih Metode Pembayaran</label>
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            {['Tunai', 'QRIS', 'Debit', 'Kredit', ...(selectedCustomer ? ['Hutang'] : [])].map(meth => (
                                <button
                                    key={meth}
                                    onClick={() => {
                                        setPaymentMethod(meth);
                                        setCashTendered(meth === 'Tunai' ? grandTotal.toString() : '');
                                    }}
                                    className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${paymentMethod === meth ? 'border-primary-600 bg-primary-50 text-primary-800 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {meth === 'Tunai' ? <Wallet className="w-5 h-5" /> : meth === 'QRIS' ? <QrCode className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                    <span className="font-bold">{meth === 'Hutang' ? 'Hutang / Piutang' : meth}</span>
                                </button>
                            ))}
                        </div>

                        {/* Input Tunai Details */}
                        {paymentMethod === 'Tunai' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Uang Diterima (Rp)</label>
                                    <input
                                        type="number"
                                        value={cashTendered}
                                        onChange={(e) => setCashTendered(e.target.value)}
                                        className="w-full text-2xl font-bold bg-gray-50 border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {defaultCashOptions.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCashTendered(opt.toString())}
                                            className="flex-1 py-2 px-3 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-700 text-sm font-bold border border-gray-200 rounded-lg transition-colors"
                                        >
                                            {i === 0 ? 'Uang Pas' : `Rp ${(opt / 1000)}k`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'QRIS' && (
                            <div className="p-8 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 animate-in fade-in zoom-in-95">
                                <QrCode className="w-24 h-24 text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium text-center">Silakan arahkan scanner pelanggan ke layar QR Reader atau cetak struk QRIS.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Kanan: Ringkasan Tagihan (45%) */}
                <div className="w-[45%] flex flex-col bg-gray-50">
                    <div className="p-6 border-b border-gray-200 flex-1">
                        <h3 className="font-bold text-gray-800 mb-4">Ringkasan Tagihan</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            {outletData.pbjtActive && (
                                <div className="flex justify-between text-gray-600">
                                    <span>PBJT Restoran (10%)</span>
                                    <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                                </div>
                            )}
                            <div className="border-t border-gray-300 pt-3 flex justify-between items-end mt-4">
                                <span className="font-bold text-gray-800 text-lg">Total</span>
                                <span className="text-4xl font-black text-primary-900">Rp {grandTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {paymentMethod === 'Tunai' && (
                            <div className="mt-8 pt-6 border-t border-dashed border-gray-300 space-y-3">
                                <div className="flex justify-between text-gray-600 font-medium">
                                    <span>Uang Diterima</span>
                                    <span>Rp {currentCash.toLocaleString('id-ID')}</span>
                                </div>
                                <div className={`flex justify-between items-end ${changeAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    <span className="font-bold text-lg">Kembalian</span>
                                    <span className="text-2xl font-black tracking-tight">Rp {changeAmount.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'Hutang' && selectedCustomer && (
                            <div className="mt-8 pt-6 border-t border-dashed border-gray-300 space-y-3">
                                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <span>Info Kredit Pelanggan</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Sisa Limit Saat Ini</span>
                                    <span className="font-bold">Rp {(Number(selectedCustomer.credit_limit) - Number(selectedCustomer.current_debt)).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-600 font-bold border-t border-gray-100 pt-2">
                                    <span>Tagihan Baru</span>
                                    <span>- Rp {grandTotal.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-white shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                        <button
                            onClick={handlePayment}
                            disabled={isSubmitting || !isSufficientFunds}
                            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold shadow-xl transition-all ${isSubmitting || !isSufficientFunds ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-green-500 hover:bg-green-600 text-white active:scale-95 shadow-green-500/30'}`}
                        >
                            {isSubmitting ? (
                                'Memproses...'
                            ) : (
                                <>
                                    <CheckCircle className="w-6 h-6" /> Konfirmasi Bayar
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
