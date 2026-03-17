"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    UtensilsCrossed,
    Plus,
    Search,
    Layers,
    Edit2,
    Trash2,
    Box,
    AlertTriangle,
    ChevronRight,
    X,
    Image as ImageIcon,
    Save,
    History,
    ArrowUpCircle,
    ArrowDownCircle,
    RefreshCw,
    Filter,
    Calendar,
    Upload,
    Loader2
} from "lucide-react";
import { saveCategory, saveMenuItem, adjustStock, deleteCategory, deleteMenuItem, uploadMenuImage } from "../actions";

export default function MenuClient({ initialCategories, initialMenuItems, initialLogs, error }) {
    const router = useRouter();
    const [categories, setCategories] = useState(initialCategories);
    const [menuItems, setMenuItems] = useState(initialMenuItems);
    const [logs, setLogs] = useState(initialLogs || []);
    const [activeTab, setActiveTab] = useState("Menu"); // "Menu", "Kategori", "Riwayat"
    const [searchTerm, setSearchTerm] = useState("");

    // Sync state with props when router.refresh() is called
    useEffect(() => {
        setMenuItems(initialMenuItems);
    }, [initialMenuItems]);

    useEffect(() => {
        setCategories(initialCategories);
    }, [initialCategories]);

    useEffect(() => {
        setLogs(initialLogs || []);
    }, [initialLogs]);

    // Log filtering
    const [logSearch, setLogSearch] = useState("");
    const [logType, setLogType] = useState("Semua");

    // Modals
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);

    const [editingItem, setEditingItem] = useState(null);
    const [editingCat, setEditingCat] = useState(null);
    const [stockItem, setStockItem] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Filtering Menu
    const filteredMenu = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filtering Logs (Stock Card)
    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.menu_items?.name.toLowerCase().includes(logSearch.toLowerCase());
        const matchesType = logType === "Semua" || log.type === logType;
        return matchesSearch && matchesType;
    });

    const handleOpenMenuModal = (item = null) => {
        setEditingItem(item ? { ...item } : {
            name: "",
            category_id: categories[0]?.id || "",
            price: 0,
            cost_price: 0,
            description: "",
            status: "Tersedia",
            track_stock: false,
            current_stock: 0,
            min_stock: 0,
            image_url: ""
        });
        setIsMenuModalOpen(true);
    };

    const handleOpenCatModal = (cat = null) => {
        setEditingCat(cat ? { ...cat } : {
            name: "",
            sequence_order: categories.length + 1,
            is_pbjt_exempt: false
        });
        setIsCatModalOpen(true);
    };

    const handleOpenStockModal = (item) => {
        setStockItem(item);
        setIsStockModalOpen(true);
    };

    const onSaveMenu = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const res = await saveMenuItem(editingItem);
        if (res.success) {
            setIsMenuModalOpen(false);
            router.refresh();
            setIsLoading(false);
        }
        else { alert(res.message); setIsLoading(false); }
    };

    const onSaveCat = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const res = await saveCategory(editingCat);
        if (res.success) {
            setIsCatModalOpen(false);
            router.refresh();
            setIsLoading(false);
        }
        else { alert(res.message); setIsLoading(false); }
    };

    const onAdjustStockSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        setIsLoading(true);
        const res = await adjustStock({
            menuItemId: stockItem.id,
            type: formData.get('type'),
            quantity: formData.get('quantity'),
            notes: formData.get('notes')
        });
        if (res.success) {
            setIsStockModalOpen(false);
            router.refresh();
            setIsLoading(false);
        }
        else { alert(res.message); setIsLoading(false); }
    };

    const onDeleteMenu = async (id, name) => {
        if (confirm(`Apakah Anda yakin ingin menghapus menu "${name}"?`)) {
            setIsLoading(true);
            const res = await deleteMenuItem(id);
            if (res.success) {
                router.refresh();
                setIsLoading(false);
            } else {
                alert(res.message);
                setIsLoading(false);
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Size check (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("File terlalu besar. Maksimal 2MB.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        const res = await uploadMenuImage(formData);
        setIsUploading(false);

        if (res.success) {
            setEditingItem({ ...editingItem, image_url: res.publicUrl });
        } else {
            alert(res.message);
        }
    };

    const onDeleteCat = async (id, name) => {
        if (confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?`)) {
            setIsLoading(true);
            const res = await deleteCategory(id);
            if (res.success) {
                router.refresh();
                setIsLoading(false);
            } else {
                alert(res.message);
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="bg-white px-8 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-primary-900 flex items-center gap-2">
                        <UtensilsCrossed className="w-7 h-7 text-accent-500" />
                        Manajemen Menu & Stok
                    </h1>
                    <div className="flex gap-4 mt-2">
                        <button
                            onClick={() => setActiveTab("Menu")}
                            className={`text-sm font-bold transition-colors ${activeTab === 'Menu' ? 'text-primary-900 border-b-2 border-primary-900 pb-1' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Daftar Menu
                        </button>
                        <button
                            onClick={() => setActiveTab("Kategori")}
                            className={`text-sm font-bold transition-colors ${activeTab === 'Kategori' ? 'text-primary-900 border-b-2 border-primary-900 pb-1' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Kategori
                        </button>
                        <button
                            onClick={() => setActiveTab("Riwayat")}
                            className={`text-sm font-bold transition-colors ${activeTab === 'Riwayat' ? 'text-primary-900 border-b-2 border-primary-900 pb-1' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Riwayat Stok
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Cari menu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 bg-gray-50 rounded-xl py-2.5 pl-10 pr-4 border border-gray-200 focus:bg-white transition-all outline-none"
                        />
                    </div>
                    <button
                        onClick={() => activeTab === 'Menu' ? handleOpenMenuModal() : handleOpenCatModal()}
                        className="bg-primary-900 text-accent-400 hover:bg-primary-800 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Tambah {activeTab}
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8">
                {activeTab === "Menu" ? (
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2">
                        {filteredMenu.map(item => (
                            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group">
                                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                                            <ImageIcon className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2">
                                        <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.status === 'Tersedia' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-all">
                                        <button onClick={() => handleOpenMenuModal(item)} title="Edit" className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-gray-700 hover:bg-white shadow-sm transition-colors">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => onDeleteMenu(item.id, item.name)} title="Hapus" className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-red-500 hover:bg-red-50 shadow-sm transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-2 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-1 gap-1">
                                        <span className="text-[8px] font-black text-primary-400 uppercase tracking-widest truncate">{item.categories?.name}</span>
                                        <p className="text-[10px] font-black text-primary-900 leading-none shrink-0">Rp {Number(item.price).toLocaleString('id-ID')}</p>
                                    </div>
                                    <h3 className="text-[10px] font-bold text-gray-900 leading-none mb-1.5 h-6 line-clamp-2">{item.name}</h3>

                                    {/* Stock Section */}
                                    <div className="bg-gray-50 rounded-lg p-1.5 flex items-center justify-between border border-gray-100">
                                        <div className="flex flex-col">
                                            <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Stok</p>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-xs font-black leading-none ${item.track_stock && Number(item.current_stock) <= Number(item.min_stock) ? 'text-red-500' : 'text-gray-950'}`}>
                                                    {item.track_stock ? item.current_stock : '∞'}
                                                </span>
                                                {item.track_stock && Number(item.current_stock) <= Number(item.min_stock) && (
                                                    <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
                                                )}
                                            </div>
                                        </div>
                                        {item.track_stock && (
                                            <button
                                                onClick={() => handleOpenStockModal(item)}
                                                className="p-1 bg-white border border-gray-200 rounded-md hover:border-primary-500 hover:text-primary-500 transition-all"
                                            >
                                                <RefreshCw className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeTab === "Kategori" ? (
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Urutan</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Nama Kategori</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status Pajak</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-400">{cat.sequence_order}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                                                    <Layers className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-gray-900">{cat.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black ${cat.is_pbjt_exempt ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                {cat.is_pbjt_exempt ? 'BEBAS PAJAK' : 'KENA PAJAK'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenCatModal(cat)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                                    <Edit2 className="w-4 h-4 text-gray-600" />
                                                </button>
                                                <button onClick={() => onDeleteCat(cat.id, cat.name)} className="p-2 hover:bg-red-50 rounded-lg transition-colors group/del">
                                                    <Trash2 className="w-4 h-4 text-gray-400 group-hover/del:text-red-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Filter Bar for Logs */}
                        <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Cari menu di riwayat..."
                                    value={logSearch}
                                    onChange={(e) => setLogSearch(e.target.value)}
                                    className="w-full bg-gray-50 rounded-2xl py-3 pl-10 pr-4 border border-gray-100 outline-none focus:bg-white transition-all font-bold"
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Filter className="w-5 h-5 text-gray-400" />
                                <select
                                    value={logType}
                                    onChange={(e) => setLogType(e.target.value)}
                                    className="bg-gray-50 border border-gray-100 rounded-2xl p-3 font-bold text-gray-600 outline-none min-w-[140px]"
                                >
                                    <option value="Semua">Semua Tipe</option>
                                    <option value="Masuk">Stok Masuk</option>
                                    <option value="Keluar">Stok Keluar</option>
                                    <option value="Penyesuaian">Penyesuaian</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Menu</th>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Tipe</th>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Jumlah</th>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Petugas</th>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-5 text-gray-500 font-medium">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-700">{new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="font-black text-primary-900 group-hover:text-primary-600 transition-colors">{log.menu_items?.name}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter inline-flex items-center gap-1.5 ${log.type === 'Masuk' ? 'bg-green-100 text-green-700' :
                                                    log.type === 'Keluar' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {log.type === 'Masuk' ? <ArrowUpCircle className="w-3 h-3" /> :
                                                        log.type === 'Keluar' ? <ArrowDownCircle className="w-3 h-3" /> :
                                                            <RefreshCw className="w-3 h-3" />}
                                                    {log.type}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className={`font-black text-lg ${log.type === 'Masuk' ? 'text-green-600' : log.type === 'Keluar' ? 'text-red-600' : 'text-primary-900'}`}>
                                                    {log.type === 'Keluar' ? '-' : '+'}{log.quantity}
                                                </p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="font-bold text-gray-600">{log.staff_users?.full_name || 'System'}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-gray-400 italic font-medium leading-relaxed">{log.notes || '-'}</p>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-medium bg-gray-50/20">
                                                <History className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                                <p className="text-lg font-black text-gray-300">Data Tidak Ditemukan</p>
                                                <p className="text-sm">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL MENU ITEM */}
            {isMenuModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <header className="px-10 py-8 border-b bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-primary-900 leading-tight">
                                    {editingItem?.id ? 'Edit Item Menu' : 'Tambah Menu Baru'}
                                </h2>
                                <p className="text-sm font-medium text-gray-500">Atur harga, kategori, dan pelacakan stok.</p>
                            </div>
                            <button onClick={() => setIsMenuModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <form onSubmit={onSaveMenu} className="flex-1 overflow-y-auto px-10 py-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Menu *</label>
                                    <input required type="text" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white transition-all outline-none font-semibold" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Deskripsi Menu</label>
                                    <textarea value={editingItem.description || ''} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} placeholder="Keterangan singkat tentang menu ini..." rows={2} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white transition-all outline-none font-semibold" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Gambar Menu (Upload / URL)</label>
                                    <div className="flex gap-4 items-center">
                                        <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0 relative">
                                            {editingItem.image_url ? (
                                                <img src={editingItem.image_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-gray-300" />
                                            )}
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isUploading}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="bg-primary-50 text-primary-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-100 transition-all text-sm border border-primary-100 shadow-sm"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    Upload Gambar
                                                </button>
                                                <input
                                                    type="file"
                                                    hidden
                                                    ref={fileInputRef}
                                                    accept="image/*"
                                                    onChange={handleFileUpload}
                                                />
                                            </div>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                    <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Atau tempel URL gambar di sini..."
                                                    value={editingItem.image_url || ''}
                                                    onChange={e => setEditingItem({ ...editingItem, image_url: e.target.value })}
                                                    className="w-full bg-gray-50 rounded-xl py-2.5 pl-9 pr-4 border border-gray-100 focus:bg-white transition-all outline-none text-[11px] font-semibold"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium italic">* Maksimal 2MB. Format: JPG, PNG, WEBP.</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kategori</label>
                                    <select value={editingItem.category_id} onChange={e => setEditingItem({ ...editingItem, category_id: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white transition-all outline-none font-semibold">
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                                    <select value={editingItem.status} onChange={e => setEditingItem({ ...editingItem, status: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white transition-all outline-none font-semibold">
                                        <option value="Tersedia">Tersedia</option>
                                        <option value="Habis">Habis</option>
                                        <option value="Nonaktif">Nonaktif</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Harga Jual (Rp) *</label>
                                    <input required type="number" value={editingItem.price} onChange={e => setEditingItem({ ...editingItem, price: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white transition-all outline-none font-semibold" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Harga Modal (CMS)</label>
                                    <input type="number" value={editingItem.cost_price} onChange={e => setEditingItem({ ...editingItem, cost_price: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white transition-all outline-none font-semibold" />
                                </div>
                            </div>

                            <div className="p-6 bg-primary-50 rounded-[32px] border border-primary-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary-900 text-accent-400 p-2 rounded-xl"><Box className="w-5 h-5" /></div>
                                        <h4 className="font-black text-primary-950">Inventaris & Stok</h4>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={editingItem.track_stock} onChange={e => setEditingItem({ ...editingItem, track_stock: e.target.checked })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-900"></div>
                                        <span className="ml-3 text-sm font-bold text-primary-900">Lacak Stok</span>
                                    </label>
                                </div>
                                {editingItem.track_stock && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                                        <div>
                                            <label className="block text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1.5">Stok Saat Ini</label>
                                            <input type="number" value={editingItem.current_stock} onChange={e => setEditingItem({ ...editingItem, current_stock: e.target.value })} className="w-full bg-white rounded-xl p-3 border border-primary-100 outline-none font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1.5">Stok Minimum (Alert)</label>
                                            <input type="number" value={editingItem.min_stock} onChange={e => setEditingItem({ ...editingItem, min_stock: e.target.value })} className="w-full bg-white rounded-xl p-3 border border-primary-100 outline-none font-bold" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsMenuModalOpen(false)} className="flex-1 py-4 rounded-3xl font-bold bg-gray-100 text-gray-600">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-[2] py-4 rounded-3xl font-black bg-primary-900 text-accent-400 shadow-xl shadow-primary-900/20">
                                    {isLoading ? 'Menyimpan...' : 'Simpan Menu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CATEGORY */}
            {isCatModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <header className="px-10 py-8 border-b bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-primary-900 leading-tight">
                                    {editingCat?.id ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                                </h2>
                                <p className="text-sm font-medium text-gray-500">Kelompokkan menu agar lebih teratur.</p>
                            </div>
                            <button onClick={() => setIsCatModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <form onSubmit={onSaveCat} className="px-10 py-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Kategori *</label>
                                    <input required type="text" value={editingCat.name} onChange={e => setEditingCat({ ...editingCat, name: e.target.value })} placeholder="Contoh: Makanan Utama, Minuman, Snak..." className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white transition-all outline-none font-semibold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Urutan Tampil</label>
                                        <input type="number" value={editingCat.sequence_order} onChange={e => setEditingCat({ ...editingCat, sequence_order: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white transition-all outline-none font-semibold" />
                                    </div>
                                    <div className="flex items-center gap-3 pt-6">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={editingCat.is_pbjt_exempt} onChange={e => setEditingCat({ ...editingCat, is_pbjt_exempt: e.target.checked })} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                        </label>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-primary-900">Bebas Pajak</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">PBJT/PPN</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsCatModalOpen(false)} className="flex-1 py-4 rounded-3xl font-bold bg-gray-100 text-gray-600">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-[2] py-4 rounded-3xl font-black bg-primary-900 text-accent-400 shadow-xl shadow-primary-900/20">
                                    {isLoading ? 'Menyimpan...' : (editingCat?.id ? 'Simpan Perubahan' : 'Buat Kategori')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL STOCK ADJUSTMENT */}
            {isStockModalOpen && stockItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10">
                        <h2 className="text-2xl font-black text-primary-900 leading-tight mb-2">Penyesuaian Stok</h2>
                        <p className="text-gray-500 font-medium mb-8">{stockItem.name}</p>

                        <form onSubmit={onAdjustStockSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Jenis Perubahan</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="relative cursor-pointer group">
                                        <input type="radio" name="type" value="Masuk" required className="sr-only peer" defaultChecked />
                                        <div className="flex items-center gap-2 p-4 rounded-2xl border-2 border-gray-100 transition-all peer-checked:border-green-500 peer-checked:bg-green-50 text-gray-400 peer-checked:text-green-700">
                                            <ArrowUpCircle className="w-5 h-5" />
                                            <span className="font-bold">Masuk</span>
                                        </div>
                                    </label>
                                    <label className="relative cursor-pointer group">
                                        <input type="radio" name="type" value="Keluar" className="sr-only peer" />
                                        <div className="flex items-center gap-2 p-4 rounded-2xl border-2 border-gray-100 transition-all peer-checked:border-red-500 peer-checked:bg-red-50 text-gray-400 peer-checked:text-red-700">
                                            <ArrowDownCircle className="w-5 h-5" />
                                            <span className="font-bold">Keluar</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Jumlah</label>
                                <input name="quantity" required type="number" step="0.01" className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white outline-none text-2xl font-black" placeholder="0" />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Catatan / Alasan</label>
                                <textarea name="notes" placeholder="Contoh: Stok Baru, Rusak, atau Salah Input..." rows={2} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white outline-none font-semibold" />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold bg-gray-100">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-1 py-4 rounded-2xl font-black bg-primary-900 text-accent-400 shadow-xl">
                                    Update Stok
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
