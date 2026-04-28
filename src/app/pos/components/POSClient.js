"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Search, ShoppingBag, Plus, Minus, Trash2, CreditCard,
    User, X, Tag, MessageSquare, ChevronDown, ChevronUp, Percent, DivideSquare,
    Coffee, Utensils, Pizza, IceCream, Package, LayoutGrid
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
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderIdCtx = searchParams.get('orderId');
    const tableCtx = searchParams.get('table');

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

            {/* Header POS */}
            <header className="bg-white px-6 py-4 flex items-center justify-between border-b shadow-xs z-10 shrink-0">
                <div className="flex items-center gap-4 flex-1 max-w-xl">
                    <h1 className="text-2xl font-bold tracking-tight text-primary-900 mr-4">AppKasir POS</h1>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari menu..."
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

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* ──── PANEL TENGAH — MENU GRID ──── */}
                <div className="flex-1 flex flex-col h-full bg-gray-50/50">
                    <div className="px-6 py-4 bg-white/50 backdrop-blur-md border-b flex items-center justify-between shrink-0">
                        <h2 className="font-black text-lg text-primary-900 flex items-center gap-2">
                            <span className="w-2 h-7 bg-accent-500 rounded-full"></span>
                            Daftar Menu
                        </h2>
                        {searchQuery && (
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-primary-500">
                                Hasil Pencarian: "{searchQuery}"
                            </p>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                        {filteredMenu.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-4">
                                <Search className="w-16 h-16 opacity-10" />
                                <p className="font-bold">Menu tidak ditemukan.</p>
                            </div>
                        ) : (
                            <div className="space-y-8 pb-32">
                                {categories.map(catName => {
                                    const itemsInCat = filteredMenu.filter(m => m.category === catName);
                                    if (itemsInCat.length === 0) return null;

                                    return (
                                        <div key={catName} className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-xs font-black text-primary-900 bg-accent-400 px-3 py-1 rounded-full">{catName.toUpperCase()}</h3>
                                                <div className="flex-1 h-px bg-gray-200"></div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                                                {itemsInCat.map(item => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => addToCart(item)}
                                                        className={`group relative bg-white rounded-3xl overflow-hidden border-2 transition-all duration-300 ${item.status === 'Habis'
                                                            ? 'opacity-50 grayscale cursor-not-allowed border-gray-100'
                                                            : 'cursor-pointer hover:border-accent-500 hover:shadow-2xl hover:-translate-y-1 active:scale-95 border-white shadow-sm'
                                                            }`}
                                                    >
                                                        <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center relative overflow-hidden">
                                                            {item.image_url
                                                                ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                : <div className="flex flex-col items-center gap-1 text-gray-300">
                                                                    <Package className="w-8 h-8 opacity-20" />
                                                                    <span className="text-[8px] font-bold uppercase tracking-widest p-1 text-center">No Image</span>
                                                                  </div>
                                                            }
                                                            <div className="absolute top-2 left-2">
                                                                <div className="bg-primary-900/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg border border-white/20">
                                                                    Rp {item.price.toLocaleString('id-ID')}
                                                                </div>
                                                            </div>
                                                            {item.track_stock && (
                                                                <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black border backdrop-blur-md ${Number(item.current_stock) <= Number(item.min_stock) ? 'bg-red-500/90 text-white border-white' : 'bg-white/90 text-primary-900 border-gray-200'}`}>
                                                                    {item.current_stock > 0 ? `Sisa: ${item.current_stock}` : 'Habis'}
                                                                </div>
                                                            )}
                                                            {item.variations?.length > 0 && (
                                                                <div className="absolute top-2 right-2 bg-accent-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white shadow-lg">VAR</div>
                                                            )}
                                                        </div>
                                                        <div className="p-4">
                                                            <p className="text-[11px] font-black text-primary-900 line-clamp-2 leading-tight h-8 uppercase tracking-tight">{item.name}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ──── PANEL KANAN — KERANJANG ──── */}
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
                        <button onClick={clearCart} className="text-sm font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                            Batal
                        </button>
                    </div>

                    {/* Customer Info Selection */}
                    <div className="px-5 py-3 border-b bg-white shrink-0">
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between bg-primary-50 p-3 rounded-2xl border border-primary-100">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary-900 text-accent-400 p-2 rounded-xl">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-primary-900 leading-none mb-1">{selectedCustomer.name}</p>
                                        <p className="text-[10px] text-primary-600 font-medium tracking-tight">
                                            Limit: Rp {Number(selectedCustomer.credit_limit).toLocaleString('id-ID')} •
                                            Hut: Rp {Number(selectedCustomer.current_debt).toLocaleString('id-ID')}
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
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-30">
                                <ShoppingBag className="w-16 h-16" />
                                <p className="font-bold text-center">Keranjang Kosong</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {cart.map(item => {
                                    const isExpanded = activeCartId === item.cartId;
                                    const itemNet = getItemNet(item, itemDiscounts);
                                    const itemDisc = itemDiscounts[item.cartId];
                                    return (
                                        <div key={item.cartId} className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-primary-200 shadow-md' : 'border-gray-50'}`}>
                                            <div className="flex gap-3 p-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 text-xs leading-tight truncate uppercase">{item.name}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">Rp {item.price.toLocaleString('id-ID')}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <p className="font-black text-primary-900 text-sm">Rp {itemNet.toLocaleString('id-ID')}</p>
                                                    <div className="flex items-center bg-gray-100 rounded-full p-0.5">
                                                        <button onClick={() => updateQty(item.cartId, -1)} className="w-6 h-6 rounded-full flex items-center justify-center bg-white shadow-sm"><Minus className="w-3 h-3" /></button>
                                                        <span className="w-6 text-center font-bold text-xs">{item.qty}</span>
                                                        <button onClick={() => updateQty(item.cartId, 1)} className="w-6 h-6 rounded-full flex items-center justify-center bg-white shadow-sm"><Plus className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Summary & Checkout Buttons */}
                    <div className="bg-gray-50 p-5 rounded-t-[40px] border-t shadow-2xl shrink-0">
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-sm font-bold text-gray-500">
                                <span>Subtotal</span>
                                <span>Rp {itemsSubtotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-lg font-black text-primary-900 pt-2 border-t border-dashed border-gray-300">
                                <span>Total Tagihan</span>
                                <span>Rp {Math.round(grandTotal).toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <button
                                disabled={cart.length === 0}
                                onClick={() => setIsCheckoutOpen(true)}
                                className="font-bold py-4 rounded-3xl text-primary-900 bg-primary-100 hover:bg-primary-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Simpan Pesanan
                            </button>
                            <button
                                disabled={cart.length === 0}
                                onClick={() => setIsSplitBillOpen(true)}
                                className="font-bold py-4 rounded-3xl text-primary-900 bg-gray-200 hover:bg-gray-300 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Split Bill
                            </button>
                        </div>
                        <button
                            disabled={cart.length === 0}
                            onClick={() => setIsPaymentOpen(true)}
                            className="w-full flex items-center justify-center gap-2 font-black py-5 rounded-3xl text-white bg-accent-500 hover:bg-accent-600 shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            <CreditCard className="w-6 h-6" />
                            Bayar Sekarang
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {variationItem && (
                <VariationModal
                    item={variationItem}
                    onConfirm={handleVariationConfirm}
                    onClose={() => setVariationItem(null)}
                />
            )}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cart={cart} outletData={outletData} selectedCustomer={selectedCustomer}
                billing={{ itemsSubtotal, totalDiscountAmount, serviceChargeAmount, dpp, pbjtAmount, grandTotal }}
                editOrderId={orderIdCtx}
                editTableNumber={tableCtx}
                onHoldSuccess={(orderNum, extra) => {
                    setPrintData({ type: 'KOT', outlet: outletData, orderNumber: orderNum, items: cart, notes: extra.notes, tableNumber: extra.tableNumber || tableCtx, cashier: userName });
                    setIsCheckoutOpen(false); clearCart();
                    if (orderIdCtx) router.push('/pos/orders'); // Back to active orders if editing
                }}
            />
            <PaymentModal
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                cart={cart} outletData={outletData} selectedCustomer={selectedCustomer}
                billing={{ itemsSubtotal, totalDiscountAmount, serviceChargeAmount, dpp, pbjtAmount, grandTotal }}
                onPaySuccess={(receiptNum, changeAmt, method, cash) => {
                    setPrintData({ type: 'Receipt', outlet: outletData, receiptNumber: receiptNum, items: [...cart], itemsSubtotal, totalDiscount: totalDiscountAmount, serviceCharge: serviceChargeAmount, dpp, taxAmount: pbjtAmount, grandTotal: Math.round(grandTotal), paymentMethod: method, cashTendered: cash, changeAmount: changeAmt, customer: selectedCustomer?.name, cashier: userName });
                    setIsPaymentOpen(false); clearCart();
                }}
            />
            <SplitBillModal
                isOpen={isSplitBillOpen}
                onClose={() => setIsSplitBillOpen(false)}
                cart={cart} outletData={outletData} selectedCustomer={selectedCustomer}
                billing={{ itemsSubtotal, totalDiscountAmount, serviceChargeAmount, dpp, pbjtAmount, grandTotal }}
                userName={userName}
                onSplitSuccess={(receiptNum, parts) => {
                    setPrintData({ type: 'Receipt', outlet: outletData, receiptNumber: receiptNum, items: [...cart], itemsSubtotal, totalDiscount: totalDiscountAmount, serviceCharge: serviceChargeAmount, dpp, taxAmount: pbjtAmount, grandTotal: Math.round(grandTotal), paymentMethod: 'Split Bill', splitParts: parts, cashier: userName });
                    setIsSplitBillOpen(false); clearCart();
                }}
            />
            <ReceiptPrintout data={printData} />
        </div>
    );
}
