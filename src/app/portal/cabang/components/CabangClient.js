"use client";

import {
    Store, Plus, MapPin, Phone, Mail, FileText,
    Settings2, ShieldCheck, CheckCircle2, XCircle,
    Edit3, Power, MoreVertical, X, Save, AlertCircle,
    ChevronRight, ArrowRight
} from "lucide-react";
import { useState } from "react";
import { saveOutlet, toggleOutletStatus } from "../actions";
import { useRouter } from "next/navigation";

export default function CabangClient({ initialOutlets, subscriptionPlan }) {
    const router = useRouter();
    const [outlets, setOutlets] = useState(initialOutlets);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const limits = {
        'Starter': 1,
        'Pro': 3,
        'Enterprise': 'Unlimited'
    };

    const handleOpenModal = (outlet = null) => {
        setEditingOutlet(outlet ? { ...outlet } : {
            name: "",
            address: "",
            phone: "",
            email: "",
            npwpd: "",
            nib: "",
            pbjt_active: true,
            pbjt_rate: 10,
            pbjt_mode: "Eksklusif",
            service_charge_active: false,
            service_charge_rate: 0,
            is_active: true
        });
        setIsModalOpen(true);
    };

    const onSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const res = await saveOutlet(editingOutlet);
        if (res.success) {
            setIsModalOpen(false);
            router.refresh();
            setIsLoading(false);
        } else {
            alert(res.message);
            setIsLoading(false);
        }
    };

    const onToggleStatus = async (id, currentStatus) => {
        if (!confirm('Apakah Anda yakin ingin ' + (currentStatus ? 'Menonaktifkan' : 'Mengaktifkan') + ' cabang ini?')) return;
        const res = await toggleOutletStatus(id, currentStatus);
        if (res.success) router.refresh();
    };

    return (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
                <div>
                    <h1 className="text-3xl font-black text-primary-900 tracking-tight flex items-center gap-3">
                        <Store className="w-8 h-8 text-accent-500" /> Manajemen Cabang
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Kelola informasi operasional dan pengaturan pajak di setiap outlet Anda.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="px-4 py-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status Kuota</p>
                        <p className="text-sm font-black text-primary-900 leading-none">
                            {initialOutlets.length} / {limits[subscriptionPlan]} Cabang
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        disabled={subscriptionPlan !== 'Enterprise' && initialOutlets.length >= limits[subscriptionPlan]}
                        className="bg-primary-900 text-accent-400 px-6 py-3 rounded-xl font-black shadow-lg hover:bg-primary-800 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-5 h-5" /> Buka Cabang Baru
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {initialOutlets.map((outlet) => (
                    <div key={outlet.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group">
                        <div className="p-8 flex flex-col md:flex-row gap-8">
                            <div className="w-full md:w-48 h-48 rounded-[32px] bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 relative overflow-hidden">
                                {outlet.logo_url ? (
                                    <img src={outlet.logo_url} alt={outlet.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Store className="w-16 h-16 text-gray-200" />
                                )}
                                <div className={`absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${outlet.is_active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${outlet.is_active ? 'bg-white animate-pulse' : 'bg-white'}`} />
                                    {outlet.is_active ? 'Aktif' : 'Nonaktif'}
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black text-primary-900 leading-tight">{outlet.name}</h3>
                                        <p className="text-sm font-medium text-gray-400 mt-1 flex items-center gap-1">
                                            <MapPin className="w-4 h-4" /> {outlet.address || 'Alamat belum diatur'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(outlet)}
                                            className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-primary-900 hover:text-accent-400 transition-all border border-transparent"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => onToggleStatus(outlet.id, outlet.is_active)}
                                            className={`p-3 rounded-2xl transition-all border border-transparent ${outlet.is_active ? 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-green-50 text-green-400 hover:bg-green-500 hover:text-white'}`}
                                        >
                                            <Power className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Pajak PBJT</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${outlet.pbjt_active ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>
                                                {outlet.pbjt_active ? 'Aktif' : 'Off'}
                                            </span>
                                            <span className="text-sm font-black text-primary-900">{outlet.pbjt_rate}% ({outlet.pbjt_mode})</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Service Charge</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${outlet.service_charge_active ? 'bg-blue-500 text-white' : 'bg-gray-300 text-white'}`}>
                                                {outlet.service_charge_active ? 'Aktif' : 'Off'}
                                            </span>
                                            <span className="text-sm font-black text-primary-900">{outlet.service_charge_rate}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-2">
                                    {outlet.phone && (
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-xl">
                                            <Phone className="w-3.5 h-3.5" /> {outlet.phone}
                                        </div>
                                    )}
                                    {outlet.email && (
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-xl">
                                            <Mail className="w-3.5 h-3.5" /> {outlet.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-primary-900/5 px-8 py-4 border-t border-gray-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold text-primary-900/40">ID: {outlet.id}</span>
                            <button className="text-sm font-black text-primary-900 flex items-center gap-1 hover:gap-2 transition-all">
                                Atur Detail Operasional <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {initialOutlets.length === 0 && (
                    <div className="col-span-full py-20 bg-white rounded-[40px] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Store className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900">Belum ada Cabang Terdaftar</h3>
                        <p className="text-gray-400 font-medium mt-2 max-w-sm">Mulai kembangkan usaha Anda dengan menambahkan cabang outlet pertama.</p>
                        <button
                            onClick={() => handleOpenModal()}
                            className="mt-8 bg-primary-900 text-accent-400 px-8 py-4 rounded-2xl font-black shadow-xl"
                        >
                            Tambah Cabang Utama
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Edit/Tambah Cabang */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <header className="px-10 py-8 border-b bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-primary-900 leading-tight">
                                    {editingOutlet?.id ? 'Edit Detail Cabang' : 'Pendaftaran Cabang Baru'}
                                </h2>
                                <p className="text-sm font-medium text-gray-500">Konfigurasi identitas dan aturan pajak outlet.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <form onSubmit={onSave} className="flex-1 overflow-y-auto px-10 py-8 space-y-10">
                            {/* Identitas */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                                    <h4 className="font-black text-primary-950 uppercase tracking-widest text-xs">Identitas & Kontak</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Cabang / Outlet *</label>
                                        <input required type="text" value={editingOutlet.name} onChange={e => setEditingOutlet({ ...editingOutlet, name: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white focus:ring-4 ring-primary-900/5 transition-all outline-none font-bold" placeholder="Contoh: AppKasir Sudirman" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Alamat Lengkap</label>
                                        <textarea rows={2} value={editingOutlet.address} onChange={e => setEditingOutlet({ ...editingOutlet, address: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white outline-none font-bold" placeholder="Jln. Raya No..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Telepon</label>
                                        <input type="text" value={editingOutlet.phone} onChange={e => setEditingOutlet({ ...editingOutlet, phone: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white outline-none font-bold" placeholder="081..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Operasional</label>
                                        <input type="email" value={editingOutlet.email} onChange={e => setEditingOutlet({ ...editingOutlet, email: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white outline-none font-bold" placeholder="cabang@example.com" />
                                    </div>
                                </div>
                            </section>

                            {/* Legalitas & Pajak */}
                            <section className="space-y-6 pt-6 border-t">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></div>
                                    <h4 className="font-black text-primary-950 uppercase tracking-widest text-xs">Aturan Pajak (PBJT) & Legalitas</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-black text-primary-900 uppercase tracking-widest">Aktivasi PBJT (Pajak Daerah)</label>
                                                <input type="checkbox" checked={editingOutlet.pbjt_active} onChange={e => setEditingOutlet({ ...editingOutlet, pbjt_active: e.target.checked })} className="w-5 h-5 accent-primary-900" />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium">Aktifkan jika outlet Anda memungut Pajak Barang Jasa Tertentu (ex. Restoran/Hotel).</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tarif (%)</label>
                                                <input type="number" step="0.01" value={editingOutlet.pbjt_rate} onChange={e => setEditingOutlet({ ...editingOutlet, pbjt_rate: e.target.value })} className="w-full bg-white rounded-xl p-3 border border-gray-100 outline-none font-black" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mode</label>
                                                <select value={editingOutlet.pbjt_mode} onChange={e => setEditingOutlet({ ...editingOutlet, pbjt_mode: e.target.value })} className="w-full bg-white rounded-xl p-3 border border-gray-100 outline-none font-black text-xs">
                                                    <option value="Eksklusif">Eksklusif (Tambah)</option>
                                                    <option value="Inklusif">Inklusif (Dalam Harga)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6 md:border-l md:pl-8 border-gray-200">
                                        <div>
                                            <label className="block text-xs font-black text-primary-900 uppercase tracking-widest mb-2">NPWPD (ID Pajak Daerah)</label>
                                            <input type="text" value={editingOutlet.npwpd} onChange={e => setEditingOutlet({ ...editingOutlet, npwpd: e.target.value })} className="w-full bg-white rounded-xl p-3 border border-gray-100 outline-none font-bold" placeholder="P.1.000..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-primary-900 uppercase tracking-widest mb-2">NIB (Nomor Induk Berusaha)</label>
                                            <input type="text" value={editingOutlet.nib} onChange={e => setEditingOutlet({ ...editingOutlet, nib: e.target.value })} className="w-full bg-white rounded-xl p-3 border border-gray-100 outline-none font-bold" />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-3xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">Batal</button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[2] py-5 rounded-3xl font-black bg-primary-900 text-accent-400 shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
                                >
                                    {isLoading ? 'Menyimpan...' : (editingOutlet?.id ? 'Perbarui Data Cabang' : 'Daftarkan Cabang')} <Save className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
