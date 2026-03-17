"use client";

import { useState } from "react";
import {
    Users,
    Search,
    Plus,
    Building2,
    User,
    MoreHorizontal,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    X,
    Trash2,
    Edit2,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { saveCustomer, deleteCustomer } from "../actions";

export default function CustomerClient({ initialCustomers, error }) {
    const [customers, setCustomers] = useState(initialCustomers);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("Semua");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [msg, setMsg] = useState({ text: "", type: "" });

    // Filter Logic
    const filteredCustomers = customers.filter(c => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.phone && c.phone.includes(searchTerm)) ||
            (c.npwpd && c.npwpd.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesType = filterType === "Semua" || c.type === filterType;
        return matchesSearch && matchesType;
    });

    const handleOpenForm = (customer = null) => {
        setEditingCustomer(customer ? { ...customer } : {
            name: "",
            type: "Personal",
            phone: "",
            email: "",
            address: "",
            npwpd: "",
            contact_person: "",
            credit_limit: 0
        });
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingCustomer(null);
        setMsg({ text: "", type: "" });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMsg({ text: "", type: "" });

        const res = await saveCustomer(editingCustomer);

        if (res.success) {
            setMsg({ text: res.message, type: "success" });
            // Optimistic update or just refresh
            // For simplicity, we can refresh the list or wait for revalidatePath to kick in if using useTransition
            // But here we'll just reload the page for a clean refresh or manual update state
            window.location.reload();
        } else {
            setMsg({ text: res.message, type: "error" });
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Hapus data pelanggan ini?")) return;

        setIsLoading(true);
        const res = await deleteCustomer(id);
        if (res.success) {
            window.location.reload();
        } else {
            alert(res.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* TOOLBAR */}
            <header className="bg-white px-8 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-primary-900 flex items-center gap-2">
                        <Users className="w-7 h-7 text-accent-500" />
                        Manajemen Pelanggan
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-0.5">Kelola data pelanggan personal dan instansi/kredit.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Cari nama, telp, atau NPWPD..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-80 bg-gray-50 rounded-xl py-2.5 pl-10 pr-4 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenForm()}
                        className="bg-primary-900 text-accent-400 hover:bg-primary-800 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-900/10 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Tambah
                    </button>
                </div>
            </header>

            {/* FILTERS & LIST */}
            <main className="flex-1 overflow-y-auto p-8">
                {/* Type Filter */}
                <div className="flex gap-2 mb-6">
                    {["Semua", "Personal", "Instansi"].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${filterType === type ? 'bg-primary-900 text-accent-400' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" /> {error}
                    </div>
                )}

                {filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                        <Users className="w-16 h-16 opacity-10 mb-4" />
                        <p className="font-semibold text-lg">Pelanggan tidak ditemukan</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredCustomers.map(customer => (
                            <div key={customer.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all p-6 group flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${customer.type === 'Instansi' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {customer.type === 'Instansi' ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenForm(customer)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(customer.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-1">{customer.name}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${customer.type === 'Instansi' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {customer.type}
                                    </span>
                                    {!customer.is_active && <span className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Nonaktif</span>}
                                </div>

                                <div className="space-y-3 flex-1">
                                    {customer.phone && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            {customer.phone}
                                        </div>
                                    )}
                                    {customer.email && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            {customer.email}
                                        </div>
                                    )}
                                    {customer.address && (
                                        <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{customer.address}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 pt-6 border-t border-dashed border-gray-100 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            <CreditCard className="w-3 h-3 text-accent-500" /> Limit Kredit
                                        </p>
                                        <p className="font-bold text-gray-900">Rp {Number(customer.credit_limit || 0).toLocaleString('id-ID')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sisa Hutang</p>
                                        <p className={`font-bold ${Number(customer.current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            Rp {Number(customer.current_debt || 0).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* MODAL FORM */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <header className="px-10 py-8 border-b bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-primary-900 leading-tight">
                                    {editingCustomer?.id ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
                                </h2>
                                <p className="text-sm font-medium text-gray-500">Lengkapi informasi profile dan limit kredit.</p>
                            </div>
                            <button onClick={handleCloseForm} className="p-3 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-10 py-8">
                            {msg.text && (
                                <div className={`p-4 rounded-2xl mb-6 flex items-center gap-3 font-bold border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                    {msg.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                                    {msg.text}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Pelanggan / Instansi *</label>
                                    <input
                                        required
                                        type="text"
                                        value={editingCustomer.name}
                                        onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                                        className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all outline-none font-semibold"
                                        placeholder="Contoh: Budi Santoso atau CV. Maju Bersama"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tipe</label>
                                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setEditingCustomer({ ...editingCustomer, type: 'Personal' })}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${editingCustomer.type === 'Personal' ? 'bg-white shadow-sm text-primary-900' : 'text-gray-400'}`}
                                        >
                                            Personal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingCustomer({ ...editingCustomer, type: 'Instansi' })}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${editingCustomer.type === 'Instansi' ? 'bg-white shadow-sm text-primary-900' : 'text-gray-400'}`}
                                        >
                                            Instansi
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Telepon / WhatsApp</label>
                                    <input
                                        type="text"
                                        value={editingCustomer.phone || ""}
                                        onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                                        className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all outline-none font-semibold"
                                        placeholder="0812..."
                                    />
                                </div>

                                {editingCustomer.type === 'Instansi' && (
                                    <>
                                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">NPWPD (Pajak Daerah)</label>
                                                <input
                                                    type="text"
                                                    value={editingCustomer.npwpd || ""}
                                                    onChange={e => setEditingCustomer({ ...editingCustomer, npwpd: e.target.value })}
                                                    className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all outline-none font-semibold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Contact Person</label>
                                                <input
                                                    type="text"
                                                    value={editingCustomer.contact_person || ""}
                                                    onChange={e => setEditingCustomer({ ...editingCustomer, contact_person: e.target.value })}
                                                    className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all outline-none font-semibold"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Alamat Lengkap</label>
                                    <textarea
                                        rows={3}
                                        value={editingCustomer.address || ""}
                                        onChange={e => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                                        className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all outline-none font-semibold"
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2 mt-4 p-8 bg-accent-50 rounded-[32px] border border-accent-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-accent-500 text-white p-2 rounded-xl">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-black text-accent-950">Konfigurasi Kredit & Piutang</h4>
                                    </div>
                                    <label className="block text-xs font-black text-accent-700 uppercase tracking-widest mb-2">Plafon Limit Kredit (Rp)</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-accent-400 text-lg">Rp</span>
                                        <input
                                            type="number"
                                            value={editingCustomer.credit_limit || ""}
                                            onChange={e => setEditingCustomer({ ...editingCustomer, credit_limit: e.target.value })}
                                            className="w-full bg-white rounded-2xl p-5 pl-14 border border-accent-200 focus:ring-4 focus:ring-accent-100 transition-all outline-none text-2xl font-black text-accent-950"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="mt-3 text-xs font-medium text-accent-600">Batas maksimal hutang yang diperbolehkan untuk pelanggan ini.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    className="flex-1 py-5 rounded-3xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all active:scale-[0.98]"
                                >
                                    Batal
                                </button>
                                <button
                                    disabled={isLoading}
                                    type="submit"
                                    className="flex-[2] py-5 rounded-3xl font-black bg-primary-900 text-accent-400 hover:bg-primary-800 shadow-xl shadow-primary-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isLoading ? 'Menyimpan...' : 'Simpan Pelanggan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

