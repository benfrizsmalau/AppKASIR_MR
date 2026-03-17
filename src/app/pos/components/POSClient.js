"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, User, X } from "lucide-react";
import CheckoutModal from "./modals/CheckoutModal";
import PaymentModal from "./modals/PaymentModal";
import ReceiptPrintout from "./ReceiptPrintout";

export default function POSClient({ initialData }) {
    const { categories, menuItems, outletData, userName } = initialData;

    // States
    const [activeCategory, setActiveCategory] = useState("Semua");
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");
    const [printData, setPrintData] = useState(null);

    // Print Effect - Trigger print when printData is populated
    useEffect(() => {
        if (printData) {
            // Give a very small delay for render, though useEffect should be enough
            const timer = setTimeout(() => {
                window.print();
                // We clear printData so it can be triggered again later if needed
                // But we don't clear it immediately to avoid interrupting the print process
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [printData]);

    // Filtering Logic
    const filteredMenu = menuItems.filter(item => {
        const matchCategory = activeCategory === "Semua" || item.category === activeCategory;
        const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    const addToCart = (item) => {
        if (item.status === "Habis") return;
        setCart(prev => {
            const existing = prev.find(p => p.id === item.id);
            if (existing) {
                return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
            }
            return [...prev, { ...item, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(p => {
            if (p.id === id) {
                const newQty = Math.max(0, p.qty + delta);
                return { ...p, qty: newQty };
            }
            return p;
        }).filter(p => p.qty > 0));
    };

    // Kalkulasi Tax & Tagihan
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const pbjtTotal = outletData.pbjtActive ? (subtotal * outletData.pbjtRate) : 0;
    const grandTotal = subtotal + pbjtTotal;

    return (
        <div className="flex w-full h-full bg-gray-50 overflow-hidden font-sans text-gray-900">

            {/* PANEL KIRI - MENU GRID (65%) */}
            <div className="flex-1 flex flex-col h-full overscroll-contain">
                {/* Top Navigation & Search Bar */}
                <header className="bg-white px-6 py-4 flex items-center justify-between border-b shadow-xs z-10 shrink-0">
                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        <h1 className="text-2xl font-bold tracking-tight text-primary-900 mr-4">AppKasir POS</h1>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
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

                {/* Categories Horizontal Tab */}
                <div className="bg-white px-6 py-3 border-b flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-primary-900 text-accent-400 shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} active:scale-95`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Menu Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {filteredMenu.length === 0 ? (
                        <div className="flex items-center justify-center p-12 text-gray-400">
                            Menu tidak ditemukan.
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2 pb-20">
                            {filteredMenu.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className={`bg-white rounded-xl overflow-hidden border transition-all duration-200  ${item.status === 'Habis' ? 'opacity-50 grayscale cursor-not-allowed border-gray-200' : 'cursor-pointer hover:border-primary-400 hover:shadow-lg hover:-translate-y-1 active:scale-95 border-gray-100 shadow-sm'}`}
                                >
                                    {/* Image Placeholder */}
                                    <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-300 text-[10px] font-medium p-1 text-center">Tanpa Foto</span>
                                        )}
                                        {item.status === 'Habis' && (
                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                                                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">Habis</span>
                                            </div>
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

            {/* PANEL KANAN - KERANJANG (35%) */}
            <div className="w-[380px] xl:w-[420px] bg-white border-l shadow-2xl flex flex-col h-full relative z-20 shrink-0">

                {/* Cart Header */}
                <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-accent-100 p-2 rounded-lg text-accent-700">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">Pesanan Aktif</h2>
                            <p className="text-xs font-medium text-gray-500">Dine-In</p>
                        </div>
                    </div>
                    <button className="text-sm font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors" onClick={() => {
                        setCart([]);
                        setSelectedCustomer(null);
                    }}>
                        Batal
                    </button>
                </div>

                {/* Customer Selection UI */}
                <div className="px-5 py-3 border-b bg-white">
                    {selectedCustomer ? (
                        <div className="flex items-center justify-between bg-primary-50 p-3 rounded-2xl border border-primary-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary-900 text-accent-400 p-2 rounded-xl">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-primary-900 leading-none mb-1">{selectedCustomer.name}</p>
                                    <p className="text-[10px] text-primary-600 font-medium">Limit: Rp {Number(selectedCustomer.credit_limit).toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCustomer(null)}
                                className="text-primary-400 hover:text-red-500 p-1"
                            >
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
                                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="overflow-y-auto">
                                        {initialData.customers
                                            ?.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                                            ?.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedCustomer(c);
                                                        setIsCustomerSearchOpen(false);
                                                        setCustomerSearchQuery("");
                                                    }}
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
                <div className="flex-1 overflow-y-auto p-5">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                            <ShoppingBag className="w-16 h-16 opacity-30" />
                            <p className="font-medium text-center">Keranjang masih kosong.<br />Pilih menu di sebelah kiri.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {cart.map(item => (
                                <div key={item.id} className="flex gap-3 group">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 leading-tight mb-1">{item.name}</p>
                                        <p className="text-sm text-gray-500">Rp {item.price.toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="flex flex-col items-end justify-between">
                                        <p className="font-bold text-primary-900 whitespace-nowrap">Rp {(item.price * item.qty).toLocaleString('id-ID')}</p>
                                        <div className="flex items-center bg-gray-100 rounded-full p-1 mt-2">
                                            <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90">
                                                {item.qty === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                                            </button>
                                            <span className="w-8 text-center font-bold text-sm select-none">{item.qty}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors active:scale-90">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Summary & Payment Buttons */}
                <div className="bg-gray-50 p-5 rounded-t-3xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.04)] block">
                    <div className="space-y-3 mb-5">
                        <div className="flex justify-between text-sm font-medium text-gray-600">
                            <span>Subtotal</span>
                            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-gray-500">
                            <span>Diskon (0%)</span>
                            <span>- Rp 0</span>
                        </div>
                        {outletData.pbjtActive && (
                            <div className="flex justify-between text-sm font-medium text-gray-500">
                                <span>PBJT Restoran ({outletData.pbjtRate * 100}%)</span>
                                <span>Rp {pbjtTotal.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <div className="border-t border-dashed border-gray-300 pt-3 flex justify-between items-end mt-2">
                            <span className="font-semibold text-gray-900">Total Tagihan</span>
                            <span className="text-3xl font-bold text-primary-900 tracking-tight">Rp {grandTotal.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            disabled={cart.length === 0}
                            onClick={() => setIsCheckoutOpen(true)}
                            className="flex items-center justify-center gap-2 font-bold py-4 rounded-xl text-primary-900 bg-primary-100 hover:bg-primary-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Hold Bill
                        </button>
                        <button
                            disabled={cart.length === 0}
                            onClick={() => setIsPaymentOpen(true)}
                            className="flex items-center justify-center gap-2 font-bold py-4 rounded-xl text-white bg-accent-500 hover:bg-accent-600 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            <CreditCard className="w-5 h-5" />
                            Bayar
                        </button>
                    </div>
                </div>
            </div>
            {/* END PANEL KANAN */}

            {/* Checkout Modal Overlay */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cart={cart}
                outletData={outletData}
                selectedCustomer={selectedCustomer}
                onHoldSuccess={(orderNum, extra) => {
                    const data = {
                        type: 'KOT',
                        outlet: outletData,
                        orderNumber: orderNum,
                        items: extra.items,
                        notes: extra.notes,
                        tableNumber: extra.tableNumber,
                        cashier: userName
                    };
                    setIsCheckoutOpen(false);
                    setCart([]);
                    setSelectedCustomer(null);
                    setPrintData(data);
                }}
            />

            {/* Payment Modal Overlay */}
            <PaymentModal
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                cart={cart}
                outletData={outletData}
                selectedCustomer={selectedCustomer}
                onPaySuccess={(receiptNum, changeAmt, method, cash) => {
                    const data = {
                        type: 'Receipt',
                        outlet: outletData,
                        receiptNumber: receiptNum,
                        items: [...cart], // Clone cart because we're about to clear it
                        subtotal,
                        taxAmount: pbjtTotal,
                        grandTotal,
                        paymentMethod: method,
                        cashTendered: cash,
                        changeAmount: changeAmt,
                        customer: selectedCustomer?.name,
                        cashier: userName
                    };
                    setIsPaymentOpen(false);
                    setCart([]);
                    setSelectedCustomer(null);
                    setPrintData(data);
                }}
            />

            {/* Receipt Hidden Component for Printing */}
            <ReceiptPrintout data={printData} />
        </div>
    );
}
