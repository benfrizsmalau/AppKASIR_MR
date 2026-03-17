"use client";

import { useState } from "react";
import { Users, Plus, Edit2, ShieldAlert, KeyRound, Check, X, Shield, History } from "lucide-react";
import { saveStaff, deleteStaff } from "../actions";

export default function StaffClient({ initialStaff }) {
    const [staffList, setStaffList] = useState(initialStaff);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [formData, setFormData] = useState({ name: '', pin: '', access_role: 'Kasir', is_active: true });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const filteredStaff = staffList.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.access_role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openAddModal = () => {
        setEditingStaff(null);
        setFormData({ name: '', pin: '', access_role: 'Kasir', is_active: true });
        setErrorMsg(null);
        setIsModalOpen(true);
    };

    const openEditModal = (staff) => {
        setEditingStaff(staff);
        setFormData({ name: staff.name, pin: staff.pin, access_role: staff.access_role, is_active: staff.is_active });
        setErrorMsg(null);
        setIsModalOpen(true);
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg(null);

        // Validasi PIN
        if (formData.pin.length < 4 || formData.pin.length > 6) {
            setErrorMsg("PIN harus terdiri dari 4 hingga 6 digit.");
            setIsSubmitting(false);
            return;
        }

        const payload = editingStaff ? { id: editingStaff.id, ...formData } : formData;
        const res = await saveStaff(payload);

        if (res.success) {
            window.location.reload(); // Hard reload to fetch new data via server component
        } else {
            setErrorMsg(res.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
            <header className="bg-white px-8 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-primary-900 flex items-center gap-3">
                        <Users className="w-7 h-7 text-accent-500" />
                        Manajemen Pengguna
                    </h1>
                    <p className="text-gray-500 font-medium text-sm mt-1">Kelola akses, PIN, dan peran staf (Kasir, Supervisor, Manajer, Admin, Owner).</p>
                </div>

                <div className="flex gap-2">
                    <button onClick={openAddModal} className="bg-primary-900 text-accent-400 px-5 py-2.5 rounded-xl font-bold hover:bg-primary-800 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-primary-900/20">
                        <Plus className="w-4 h-4" />
                        Tambah Pengguna Baru
                    </button>
                    <a href="/pengaturan" className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-300 transition-all active:scale-95">
                        <History className="w-4 h-4 sm:hidden block" />
                        <span className="hidden sm:inline">Kembali ke Setelan</span>
                    </a>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="bg-white rounded-[32px] p-2 flex items-center max-w-sm border border-gray-100 shadow-sm">
                        <input
                            type="text"
                            placeholder="Cari nama atau peran..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent px-4 py-2 outline-none font-semibold text-gray-700"
                        />
                    </div>

                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Nama Lengkap</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Peran Sistem</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredStaff.map(staff => (
                                    <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center font-black text-primary-900 uppercase">
                                                    {staff.name.substring(0, 2)}
                                                </div>
                                                <p className="font-bold text-primary-900">{staff.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                {staff.access_role === 'Owner' && <Shield className="w-4 h-4 text-purple-500" />}
                                                {staff.access_role === 'Admin' && <Shield className="w-4 h-4 text-orange-500" />}
                                                {staff.access_role === 'Manajer' && <ShieldAlert className="w-4 h-4 text-blue-500" />}
                                                {staff.access_role === 'Supervisor' && <ShieldAlert className="w-4 h-4 text-teal-500" />}
                                                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-lg ${
                                                    staff.access_role === 'Owner' ? 'bg-purple-100 text-purple-600' :
                                                    staff.access_role === 'Admin' ? 'bg-orange-100 text-orange-600' :
                                                    staff.access_role === 'Manajer' ? 'bg-blue-100 text-blue-600' :
                                                    staff.access_role === 'Supervisor' ? 'bg-teal-100 text-teal-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {staff.access_role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {staff.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-600">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Non-Aktif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => openEditModal(staff)}
                                                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors font-bold text-sm inline-flex items-center gap-2"
                                            >
                                                <Edit2 className="w-4 h-4" /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStaff.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-20 text-gray-400 font-medium">
                                            Tidak ada pengguna ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal Tambah/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                        <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-primary-900 flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-accent-500" />
                                {editingStaff ? 'Edit Hak Akses' : 'Tambah Kasir Baru'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white hover:bg-red-50 hover:text-red-500 rounded-full transition-colors shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleActionSubmit} className="p-8 space-y-6">
                            {errorMsg && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Lengkap</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-100 focus:bg-white outline-none font-bold text-gray-800 transition-all"
                                    placeholder="Misal: Budi Santoso"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">PIN Login</label>
                                    <input
                                        required
                                        type="password"
                                        maxLength="6"
                                        value={formData.pin}
                                        onChange={e => setFormData({ ...formData, pin: e.target.value.replace(/[^0-9]/g, '') })}
                                        className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-100 focus:bg-white outline-none font-bold tracking-widest text-center transition-all"
                                        placeholder="4-6 Digit Angka"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 italic leading-tight">* Digunakan untuk login ke layar Kasir.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Peran</label>
                                    <select
                                        value={formData.access_role}
                                        onChange={e => setFormData({ ...formData, access_role: e.target.value })}
                                        className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-100 focus:bg-white outline-none font-bold text-gray-800 transition-all appearance-none"
                                    >
                                        <option value="Kasir">Kasir</option>
                                        <option value="Supervisor">Supervisor</option>
                                        <option value="Manajer">Manajer</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Owner">Owner</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Akun Aktif</p>
                                    <p className="text-[10px] font-medium text-gray-400">Kasir dapat login ke sistem.</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all">
                                    Batal
                                </button>
                                <button disabled={isSubmitting} type="submit" className="flex-1 px-4 py-3 bg-primary-900 text-accent-400 hover:bg-primary-800 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                                    <Check className="w-5 h-5" />
                                    {isSubmitting ? 'Memproses...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
