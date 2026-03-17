import { useState } from 'react';
import { X, HandCoins, AlertCircle, CheckCircle2 } from 'lucide-react';
import { processDebtPayment } from '../debt-actions';

export default function DebtPaymentModal({ customer, onClose, onSuccess }) {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Tunai');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const maxAmount = Number(customer?.current_debt || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const payAmount = Number(amount);
        if (payAmount <= 0) {
            setError('Nominal harus lebih dari Rp 0');
            return;
        }
        if (payAmount > maxAmount) {
            setError(`Nominal tidak boleh melebihi sisa hutang (Rp ${maxAmount.toLocaleString('id-ID')})`);
            return;
        }

        setIsLoading(true);
        const res = await processDebtPayment({
            customer_id: customer.id,
            amount: payAmount,
            payment_method: method,
            reference_number: reference,
            notes
        });
        setIsLoading(false);

        if (res.success) {
            onSuccess();
        } else {
            setError(res.message);
        }
    };

    if (!customer) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-primary-900 flex items-center gap-2">
                            <HandCoins className="w-6 h-6 text-orange-500" />
                            Pelunasan Piutang
                        </h2>
                        <p className="text-sm font-bold text-gray-500">{customer.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-sm">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-8">
                    {/* Ringkasan Hutang */}
                    <div className="bg-orange-50 rounded-2xl p-5 mb-6 border border-orange-100 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">Total Hutang</p>
                            <p className="text-2xl font-black text-orange-600">Rp {maxAmount.toLocaleString('id-ID')}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nominal Pembayaran</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">Rp</span>
                                <input
                                    type="number"
                                    required
                                    max={maxAmount}
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-gray-50 rounded-xl py-3.5 pl-12 pr-4 border border-gray-100 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none font-bold text-lg transition-all"
                                    placeholder="0"
                                />
                                <button
                                    type="button"
                                    onClick={() => setAmount(maxAmount)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-1 rounded-md hover:bg-orange-200 uppercase"
                                >
                                    Bayar Lunas
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Metode</label>
                                <select
                                    value={method}
                                    onChange={e => setMethod(e.target.value)}
                                    className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-100 focus:bg-white outline-none font-bold transition-all appearance-none"
                                >
                                    <option value="Tunai">Tunai</option>
                                    <option value="Transfer">Transfer</option>
                                    <option value="Debit">Kartu Debit</option>
                                    <option value="Kredit">Kartu Kredit</option>
                                    <option value="QRIS">QRIS</option>
                                    <option value="SPM-LS">SPM-LS (Instansi)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">No. Referensi</label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-100 focus:bg-white outline-none font-semibold transition-all"
                                    placeholder="Opsional"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Catatan Tambahan</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-100 focus:bg-white outline-none font-semibold transition-all"
                                placeholder="Misal: Titipan via staff"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary-900 text-accent-400 py-4 rounded-2xl font-black shadow-lg hover:bg-primary-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    'Memproses...'
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        Proses Pembayaran
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
