"use client";

import { useState, useEffect, useRef } from "react";
import {
    Search, ShoppingBag, Plus, Minus, Trash2, CreditCard,
    User, X, Tag, MessageSquare, ChevronDown, ChevronUp, Percent, DivideSquare
} from "lucide-react";
import CheckoutModal from "./modals/CheckoutModal";
import PaymentModal from "./modals/PaymentModal";
import VariationModal from "./modals/VariationModal";
import SplitBillModal from "./modals/SplitBillModal";
import ReceiptPrintout from "./ReceiptPrintout";

// ─── Kalkulasi harga item setelah diskon ─────────────────────────────────────
function getItemNet(item, itemDiscounts) {
    const base = item.price * item.qty;
    const disc = itemDiscounts[item.cartId];
    if (!disc || !disc.value) return base;
    if (disc.type === 'persen') return base * (1 - Math.min(100, disc.value) / 100);
    return Math.max(0, base - disc.value);
}

export default function POSClient({ initialData }) {
    const { categories, menuItems, outletData, userName, profileComplete, missingFields } = initialData;

    // ── Cart & Search ──────────────────────────────────────────────────────────
    const [activeCategory, setActiveCategory] = useState("Semua");
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState([]);                       // [{...item, cartId, qty, variationLabels, itemNotes, variationKey}]
    const [itemDiscounts, setItemDiscounts] = useState({});     // {cartId: {type:'persen'|'nominal', value:number}}
    const [activeCartId, setActiveCartId] = useState(null);    // expanded cart item

    // ── Variasi ───────────────────────────────────────────────────────────────
    const [variationItem, setVariationItem] = useState(null);  // item pending variation selection

    // ── Diskon Transaksi ──────────────────────────────────────────────────────
    const [txDiscountType, setTxDiscountType] = useState('persen'); // 'persen'|'nominal'
    const [txDiscountValue, setTxDiscountValue] = useState('');
    const [showTxDiscount, setShowTxDiscount] = useState(false);

    // ── Pelanggan ─────────────────────────────────────────────────────────────
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");

    // ── Modals & Print ────────────────────────────────────────────────────────
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
    const [printData, setPrintData] = useState(null);

    // Print trigger
    useEffect(() => {
        if (printData) {
            const timer = setTimeout(() => window.print(), 100);
            return () => clearTimeout(timer);
        }
    }, [printData]);

    // ── Filter Menu ───────────────────────────────────────────────────────────
    const filteredMenu = menuItems.filter(item => {
        const matchCategory = activeCategory === "Semua" || item.category === activeCategory;
        const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    // ── Tambah ke Keranjang ───────────────────────────────────────────────────
    const addToCart = (item) => {
        if (item.status === "Habis") return;

        // Jika ada variasi → tampil VariationModal dulu
        if (item.variations && item.variations.length > 0) {
            setVariationItem(item);
            return;
        }

        // Langsung tambah (tanpa variasi)
        setCart(prev => {
            const existing = prev.find(p => p.id === item.id && p.variationKey === 'default');
            if (existing) {
                return prev.map(p => p.cartId === existing.cartId ? { ...p, qty: p.qty + 1 } : p);
            }
            const cartId = `${item.id}_default_${Date.now()}`;
            return [...prev, { ...item, cartId, variationKey: 'default', variationLabels: [], itemNotes: '', qty: 1 }];
        });
    };

    // Callback dari VariationModal
    const handleVariationConfirm = (itemWithVariation) => {
        setVariationItem(null);
        const { qty: selQty, variationLabels, variationKey, itemNotes, ...baseItem } = itemWithVariation;
        setCart(prev => {
            const existing = prev.find(p => p.id === baseItem.id && p.variationKey === variationKey);
            if (existing) {
                return prev.map(p => p.cartId === existing.cartId ? { ...p, qty: p.qty + selQty } : p);
            }
            const cartId = `${baseItem.id}_${variationKey}_${Date.now()}`;
            return [...prev, { ...baseItem, cartId, variationKey, variationLabels, itemNotes, qty: selQty }];
        });
    };

    const updateQty = (cartId, delta) => {
        setCart(prev => prev.map(p => {
            if (p.cartId !== cartId) return p;
            const newQty = Math.max(0, p.qty + delta);
            return { ...p, qty: newQty };
        }).filter(p => p.qty > 0));
        if (delta < 0) {
            setItemDiscounts(prev => {
                const p = { ...prev };
                delete p[cartId];
                return p;
            });
        }
    };

    const removeFromCart = (cartId) => {
        setCart(prev => prev.filter(p => p.cartId !== cartId));
        setItemDiscounts(prev => {
            const p = { ...prev };
            delete p[cartId];
            return p;
        });
        if (activeCartId === cartId) setActiveCartId(null);
    };

    const updateItemNote = (cartId, note) => {
        setCart(prev => prev.map(p => p.cartId === cartId ? { ...p, itemNotes: note } : p));
    };

    const setItemDiscount = (cartId, type, value) => {
        setItemDiscounts(prev => ({ ...prev, [cartId]: { type, value: parseFloat(value) || 0 } }));
    };

    // ── Kalkulasi ─────────────────────────────────────────────────────────────
    const itemsSubtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const itemDiscountTotal = cart.reduce((sum, item) => {
        const net = getItemNet(item, itemDiscounts);
        return sum + (item.price * item.qty - net);
    }, 0);
    const afterItemDiscount = itemsSubtotal - itemDiscountTotal;

    const txDiscVal = parseFloat(txDiscountValue) || 0;
    const txDiscountAmount = txDiscountType === 'persen'
        ? afterItemDiscount * (Math.min(100, txDiscVal) / 100)
        : Math.min(afterItemDiscount, txDiscVal);
    const afterAllDiscount = afterItemDiscount - txDiscountAmount;
    const totalDiscountAmount = itemDiscountTotal + txDiscountAmount;

    const serviceChargeAmount = outletData.serviceChargeActive
        ? afterAllDiscount * outletData.serviceChargeRate
        : 0;

    const dpp = afterAllDiscount + serviceChargeAmount;

    // PBJT: Eksklusif = tambahkan di akhir; Inklusif = sudah termasuk dalam harga
    const pbjtAmount = outletData.pbjtActive
        ? (outletData.pbjtMode === 'Inklusif'
            ? dpp - (dpp / (1 + outletData.pbjtRate))
            : dpp * outletData.pbjtRate)
        : 0;

    const grandTotal = outletData.pbjtMode === 'Inklusif'
        ? dpp  // sudah termasuk pajak
        : dpp + pbjtAmount;

    // ── Reset Keranjang ───────────────────────────────────────────────────────
    const clearCart = () => {
        setCart([]);
        setItemDiscounts({});
        setSelectedCustomer(null);
        setTxDiscountValue('');
        setShowTxDiscount(false);
        setActiveCartId(null);
    };

    return (
        <div className="flex flex-col w-full h-full bg-gray-50 overflow-hidden font-sans text-gray-900">

            {/* ════ BANNER PROFIL TIDAK LENGKAP ════ */}
            {!profileComplete && (
                <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between gap-4 shrink-0 z-50">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <span>⚠️ Profil outlet belum lengkap:</span>
                        <span className="font-medium opacity-90">{(missingFields || []).join(', ')} belum diisi.</span>
                    </div>
                    <a href="/pengaturan" className="text-xs font-black bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-all">
                        Lengkapi Sekarang →
                    </a>
                </div>
            )}

        <div className="flex flex-1 overflow-hidden">
            {/* ════ PANEL KIRI — MENU GRID ════ */}
            <div className="flex-1 flex flex-col h-full overscroll-contain">

                {/* Header */}
                <header className="bg-white px-6 py-4 flex items-center justify-between border-b shadow-xs z-10 shrink-0">
                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        <h1 className="text-2xl font-bold tracking-tight text-primary-900 mr-4">AppKasir POS</h1>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari menu... (min. 2 karakter)"
                                className="w-full bg-gray-100 rounded-full py-2.5 pl-10 pr-4 focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all border-transparent focus:border-primary-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-semibold">{outletData.name}</p>
                            <p className="text-xs text-gray-500">{userName}</p>
                        </div>
                        <div className="w-10 h-10 bg-primary-100 text-primary-800 rounded-full flex items-center justify-center font-bold">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Tab Kategori */}
                <div className="bg-white px-6 py-3 border-b flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${activeCategory === cat ? 'bg-primary-900 text-accent-400 shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Menu Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {filteredMenu.length === 0 ? (
                        <div className="flex items-center justify-center p-12 text-gray-400">Menu tidak ditemukan.</div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 pb-20">
                            {filteredMenu.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className={`bg-white rounded-xl overflow-hidden border transition-all duration-200 ${item.status === 'Habis'
                                        ? 'opacity-50 grayscale cursor-not-allowed border-gray-200'
                                        : 'cursor-pointer hover:border-primary-400 hover:shadow-lg hover:-translate-y-1 active:scale-95 border-gray-100 shadow-sm'
                                        }`}
                                >
                                    <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                                        {item.image_url
                                            ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            : <span className="text-gray-300 text-[10px] font-medium p-1 text-center">Tanpa Foto</span>
                                        }
                                        {item.status === 'Habis' && (
                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                                                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">Habis</span>
                                            </div>
                                        )}
                                        {item.variations?.length > 0 && (
                                            <div className="absolute top-1 right-1 bg-accent-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none">VAR</div>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <p className="text-[10px] font-bold text-gray-900 line-clamp-2 leading-none mb-1 h-5">{item.name}</p>
                                        <p className="text-primary-700 font-black text-[10px]">Rp {item.price.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ════ PANEL KANAN — KERANJANG ════ */}
            <div className="w-[400px] xl:w-[440px] bg-white border-l shadow-2xl flex flex-col h-full relative z-20 shrink-0">

                {/* Cart Header */}
                <div className="p-5 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-accent-100 p-2 rounded-lg text-accent-700">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">Pesanan Aktif</h2>
                            <p className="text-xs font-medium text-gray-500">{cart.length} item</p>
                        </div>
                    </div>
                    <button
                        className="text-sm font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                        onClick={clearCart}
                    >
                        Batal
                    </button>
                </div>

                {/* Pilih Pelanggan */}
                <div className="px-5 py-3 border-b bg-white shrink-0">
                    {selectedCustomer ? (
                        <div className="flex items-center justify-between bg-primary-50 p-3 rounded-2xl border border-primary-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary-900 text-accent-400 p-2 rounded-xl">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-primary-900 leading-none mb-1">{selectedCustomer.name}</p>
                                    <p className="text-[10px] text-primary-600 font-medium">
                                        Limit: Rp {Number(selectedCustomer.credit_limit).toLocaleString('id-ID')} •
                                        Hutang: Rp {Number(selectedCustomer.current_debt).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="text-primary-400 hover:text-red-500 p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <button
                                onClick={() => setIsCustomerSearchOpen(!isCustomerSearchOpen)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-500 hover:bg-gray-100 transition-all font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Pilih Pelanggan (Opsional)
                            </button>
                            {isCustomerSearchOpen && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 max-h-64 overflow-hidden flex flex-col">
                                    <div className="p-3 border-b">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Cari pelanggan..."
                                            value={customerSearchQuery}
                                            onChange={e => setCustomerSearchQuery(e.target.value)}
                                            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="overflow-y-auto">
                                        {initialData.customers
                                            ?.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                                            ?.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => { setSelectedCustomer(c); setIsCustomerSearchOpen(false); setCustomerSearchQuery(''); }}
                                                    className="w-full text-left px-4 py-3 text-sm hover:bg-primary-50 border-b border-gray-50 last:border-0 transition-colors"
                                                >
                                                    <p className="font-bold text-gray-900">{c.name}</p>
                                                    <p className="text-[10px] text-gray-500">{c.type} • Limit: Rp {Number(c.credit_limit).toLocaleString('id-ID')}</p>
                                                </button>
                                            ))
                                        }
                                        {(!initialData.customers || initialData.customers.length === 0) && (
                                            <p className="p-4 text-xs text-center text-gray-400">Belum ada data pelanggan.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                            <ShoppingBag className="w-16 h-16 opacity-30" />
                            <p className="font-medium text-center">Keranjang masih kosong.<br />Pilih menu di sebelah kiri.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {cart.map(item => {
                                const isExpanded = activeCartId === item.cartId;
                                const itemNet = getItemNet(item, itemDiscounts);
                                const itemDisc = itemDiscounts[item.cartId];
                                const hasDiscount = itemDisc && itemDisc.value > 0;

                                return (
                                    <div key={item.cartId} className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-primary-200 shadow-md' : 'border-gray-100 shadow-sm'}`}>
                                        {/* Item Row */}
                                        <div className="flex gap-3 p-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</p>
                                                {item.variationLabels?.length > 0 && (
                                                    <p className="text-[10px] text-primary-600 font-medium mt-0.5">{item.variationLabels.join(' • ')}</p>
                                                )}
                                                {item.itemNotes && (
                                                    <p className="text-[10px] text-amber-600 italic mt-0.5">"{item.itemNotes}"</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-xs text-gray-400">Rp {item.price.toLocaleString('id-ID')}/pcs</p>
                                                    {hasDiscount && (
                                                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
                                                            -{itemDisc.type === 'persen' ? `${itemDisc.value}%` : `Rp ${itemDisc.value.toLocaleString('id-ID')}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end justify-between shrink-0">
                                                <p className="font-bold text-primary-900 text-sm whitespace-nowrap">
                                                    Rp {itemNet.toLocaleString('id-ID')}
                                                </p>
                                                <div className="flex items-center gap-1 mt-2">
                                                    <button
                                                        onClick={() => setActiveCartId(isExpanded ? null : item.cartId)}
                                                        className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                                                        title="Catatan & Diskon"
                                                    >
                                                        <Tag className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="flex items-center bg-gray-100 rounded-full p-0.5 ml-1">
                                                        <button onClick={() => updateQty(item.cartId, -1)} className="w-7 h-7 rounded-full flex items-center justify-center bg-white shadow-sm text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90">
                                                            {item.qty === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <span className="w-7 text-center font-bold text-sm select-none">{item.qty}</span>
                                                        <button onClick={() => updateQty(item.cartId, 1)} className="w-7 h-7 rounded-full flex items-center justify-center bg-white shadow-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors active:scale-90">
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded: Catatan & Diskon per Item */}
                                        {isExpanded && (
                                            <div className="px-3 pb-3 pt-1 border-t border-dashed border-gray-100 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                                {/* Catatan */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                                        <MessageSquare className="w-3 h-3" /> Catatan item
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={item.itemNotes || ''}
                                                        onChange={e => updateItemNote(item.cartId, e.target.value)}
                                                        maxLength={100}
                                                        placeholder="Tanpa bawang, extra saus..."
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400"
                                                    />
                                                </div>
                                                {/* Diskon per Item */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                                        <Percent className="w-3 h-3" /> Diskon item
                                                    </label>
                                                    <div className="flex gap-1.5">
                                                        <select
                                                            value={itemDisc?.type || 'persen'}
                                                            onChange={e => setItemDiscount(item.cartId, e.target.value, itemDisc?.value || 0)}
                                                            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none"
                                                        >
                                                            <option value="persen">%</option>
                                                            <option value="nominal">Rp</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={itemDisc?.value || ''}
                                                            onChange={e => setItemDiscount(item.cartId, itemDisc?.type || 'persen', e.target.value)}
                                                            placeholder={itemDisc?.type === 'nominal' ? '0' : '0'}
                                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary-400"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Ringkasan & Tombol */}
                <div className="bg-gray-50 p-4 rounded-t-3xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.04)] shrink-0">
                    <div className="space-y-2 mb-4">
                        {/* Subtotal */}
                        <div className="flex justify-between text-sm font-medium text-gray-600">
                            <span>Subtotal</span>
                            <span>Rp {itemsSubtotal.toLocaleString('id-ID')}</span>
                        </div>

                        {/* Diskon Item (jika ada) */}
                        {itemDiscountTotal > 0 && (
                            <div className="flex justify-between text-sm font-medium text-green-600">
                                <span>Diskon Item</span>
                                <span>- Rp {itemDiscountTotal.toLocaleString('id-ID')}</span>
                            </div>
                        )}

                        {/* Diskon Transaksi */}
                        <div>
                            <button
                                onClick={() => setShowTxDiscount(!showTxDiscount)}
                                className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
                            >
                                <Tag className="w-3.5 h-3.5" />
                                {showTxDiscount ? 'Sembunyikan Diskon' : '+ Tambah Diskon Transaksi'}
                                {showTxDiscount ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {showTxDiscount && (
                                <div className="flex gap-1.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <select
                                        value={txDiscountType}
                                        onChange={e => setTxDiscountType(e.target.value)}
                                        className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none"
                                    >
                                        <option value="persen">%</option>
                                        <option value="nominal">Rp</option>
                                    </select>
                                    <input
                                        type="number"
                                        min="0"
                                        value={txDiscountValue}
                                        onChange={e => setTxDiscountValue(e.target.value)}
                                        placeholder="Nilai diskon..."
                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary-400"
                                    />
                                </div>
                            )}
                            {txDiscountAmount > 0 && (
                                <div className="flex justify-between text-sm font-medium text-green-600 mt-1">
                                    <span>Diskon Transaksi</span>
                                    <span>- Rp {txDiscountAmount.toLocaleString('id-ID')}</span>
                                </div>
                            )}
                        </div>

                        {/* Service Charge */}
                        {outletData.serviceChargeActive && serviceChargeAmount > 0 && (
                            <div className="flex justify-between text-sm font-medium text-gray-500">
                                <span>Service Charge ({(outletData.serviceChargeRate * 100).toFixed(0)}%)</span>
                                <span>Rp {serviceChargeAmount.toLocaleString('id-ID')}</span>
                            </div>
                        )}

                        {/* PBJT */}
                        {outletData.pbjtActive && (
                            <div className="flex justify-between text-sm font-medium text-gray-500">
                                <span>PBJT Restoran ({(outletData.pbjtRate * 100).toFixed(0)}%)</span>
                                <span>
                                    {outletData.pbjtMode === 'Inklusif' ? '(inklusif)' : `Rp ${Math.round(pbjtAmount).toLocaleString('id-ID')}`}
                                </span>
                            </div>
                        )}

                        {/* Total */}
                        <div className="border-t border-dashed border-gray-300 pt-3 flex justify-between items-end">
                            <span className="font-semibold text-gray-900">Total Tagihan</span>
                            <span className="text-3xl font-bold text-primary-900 tracking-tight">
                                Rp {Math.round(grandTotal).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                            disabled={cart.length === 0}
                            onClick={() => setIsCheckoutOpen(true)}
                            className="flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-primary-900 bg-primary-100 hover:bg-primary-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            Hold Bill
                        </button>
                        <button
                            disabled={cart.length === 0}
                            onClick={() => setIsSplitBillOpen(true)}
                            className="flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-primary-900 bg-gray-100 hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            <DivideSquare className="w-4 h-4" />
                            Split Bill
                        </button>
                    </div>
                    <button
                        disabled={cart.length === 0}
                        onClick={() => setIsPaymentOpen(true)}
                        className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl text-white bg-accent-500 hover:bg-accent-600 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        <CreditCard className="w-5 h-5" />
                        Bayar Sekarang
                    </button>
                </div>
            </div>

            {/* ── Variation Modal ── */}
            {variationItem && (
                <VariationModal
                    item={variationItem}
                    onConfirm={handleVariationConfirm}
                    onClose={() => setVariationItem(null)}
                />
            )}

            {/* ── Checkout / Hold Modal ── */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cart={cart}
                outletData={outletData}
                selectedCustomer={selectedCustomer}
                billing={{ itemsSubtotal, totalDiscountAmount, serviceChargeAmount, dpp, pbjtAmount, grandTotal }}
                onHoldSuccess={(orderNum, extra) => {
                    const data = {
                        type: 'KOT',
                        outlet: outletData,
                        orderNumber: orderNum,
                        items: cart,
                        notes: extra.notes,
                        tableNumber: extra.tableNumber,
                        cashier: userName
                    };
                    setIsCheckoutOpen(false);
                    clearCart();
                    setPrintData(data);
                }}
            />

            {/* ── Payment Modal ── */}
            <PaymentModal
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                cart={cart}
                outletData={outletData}
                selectedCustomer={selectedCustomer}
                billing={{ itemsSubtotal, totalDiscountAmount, serviceChargeAmount, dpp, pbjtAmount, grandTotal }}
                onPaySuccess={(receiptNum, changeAmt, method, cash) => {
                    const data = {
                        type: 'Receipt',
                        outlet: outletData,
                        receiptNumber: receiptNum,
                        items: [...cart],
                        itemsSubtotal,
                        totalDiscount: totalDiscountAmount,
                        serviceCharge: serviceChargeAmount,
                        dpp,
                        taxAmount: pbjtAmount,
                        grandTotal: Math.round(grandTotal),
                        paymentMethod: method,
                        cashTendered: cash,
                        changeAmount: changeAmt,
                        customer: selectedCustomer?.name,
                        cashier: userName
                    };
                    setIsPaymentOpen(false);
                    clearCart();
                    setPrintData(data);
                }}
            />

            {/* ── Split Bill Modal ── */}
            <SplitBillModal
                isOpen={isSplitBillOpen}
                onClose={() => setIsSplitBillOpen(false)}
                cart={cart}
                outletData={outletData}
                selectedCustomer={selectedCustomer}
                billing={{ itemsSubtotal, totalDiscountAmount, serviceChargeAmount, dpp, pbjtAmount, grandTotal }}
                userName={userName}
                onSplitSuccess={(receiptNum, parts) => {
                    const data = {
                        type: 'Receipt',
                        outlet: outletData,
                        receiptNumber: receiptNum,
                        items: [...cart],
                        itemsSubtotal,
                        totalDiscount: totalDiscountAmount,
                        serviceCharge: serviceChargeAmount,
                        dpp,
                        taxAmount: pbjtAmount,
                        grandTotal: Math.round(grandTotal),
                        paymentMethod: 'Split Bill',
                        splitParts: parts,
                        cashier: userName
                    };
                    setIsSplitBillOpen(false);
                    clearCart();
                    setPrintData(data);
                }}
            />

            {/* ── Receipt Hidden Print ── */}
            <ReceiptPrintout data={printData} />
        </div>
        </div>
    );
}
