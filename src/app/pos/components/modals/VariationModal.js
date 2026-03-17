"use client";

import { useState } from "react";
import { X, Check, Plus, Minus } from "lucide-react";

export default function VariationModal({ item, onConfirm, onClose }) {
    const [selectedOptions, setSelectedOptions] = useState({}); // {variationId: optionIndex}
    const [notes, setNotes] = useState("");
    const [qty, setQty] = useState(1);

    if (!item) return null;

    const variations = item.variations || [];

    // Calculate adjusted price based on selected options
    const priceAdjustment = Object.entries(selectedOptions).reduce((sum, [varId, optIdx]) => {
        const variation = variations.find(v => v.id === varId);
        if (!variation) return sum;
        const options = Array.isArray(variation.options) ? variation.options : [];
        const opt = options[optIdx];
        return sum + (opt?.price_adjustment || 0);
    }, 0);

    const finalPrice = item.price + priceAdjustment;

    const allRequiredSelected = variations.every(v => selectedOptions[v.id] !== undefined);
    const canConfirm = variations.length === 0 || allRequiredSelected;

    const handleConfirm = () => {
        const variationLabels = Object.entries(selectedOptions).map(([varId, optIdx]) => {
            const variation = variations.find(v => v.id === varId);
            const options = Array.isArray(variation?.options) ? variation.options : [];
            return `${variation?.name}: ${options[optIdx]?.label || ''}`;
        });

        onConfirm({
            ...item,
            price: finalPrice,
            priceAdjustment,
            variationLabels,
            variationKey: Object.values(selectedOptions).join('_') || 'default',
            itemNotes: notes,
            qty,
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b flex items-start justify-between bg-gray-50 shrink-0">
                    <div className="flex-1 mr-3">
                        <h2 className="text-lg font-bold text-primary-900 leading-tight">{item.name}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Harga dasar: <span className="font-bold text-primary-700">Rp {item.price.toLocaleString('id-ID')}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Variations */}
                    {variations.map(variation => {
                        const options = Array.isArray(variation.options) ? variation.options : [];
                        return (
                            <div key={variation.id}>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    {variation.name}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {options.map((opt, idx) => {
                                        const isSelected = selectedOptions[variation.id] === idx;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setSelectedOptions(prev => ({ ...prev, [variation.id]: idx }))}
                                                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all flex items-center gap-2 ${isSelected
                                                    ? 'border-primary-600 bg-primary-50 text-primary-800 shadow-sm'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                                <span>{opt.label}</span>
                                                {opt.price_adjustment > 0 && (
                                                    <span className={`text-xs font-bold ${isSelected ? 'text-primary-600' : 'text-gray-400'}`}>
                                                        +Rp {opt.price_adjustment.toLocaleString('id-ID')}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Catatan Item */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Catatan Khusus</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            maxLength={100}
                            placeholder="Contoh: Tanpa bawang, pedas level 2..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    {/* Qty */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Jumlah</label>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setQty(q => Math.max(1, q - 1))}
                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-2xl font-black w-10 text-center">{qty}</span>
                            <button
                                type="button"
                                onClick={() => setQty(q => q + 1)}
                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-600 flex items-center justify-center transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t bg-gray-50 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-500">Total ({qty}x)</span>
                        <span className="text-2xl font-black text-primary-900">
                            Rp {(finalPrice * qty).toLocaleString('id-ID')}
                        </span>
                    </div>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${canConfirm
                            ? 'bg-accent-500 hover:bg-accent-600 shadow-lg active:scale-95'
                            : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {canConfirm ? 'Tambah ke Keranjang' : 'Pilih semua opsi yang diperlukan'}
                    </button>
                </div>
            </div>
        </div>
    );
}
