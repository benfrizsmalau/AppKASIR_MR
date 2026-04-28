"use client";

import {
    Users, Plus, Mail, ShieldCheck, Key,
    Edit3, Power, X, Save, AlertCircle,
    ChevronRight, CheckCircle2, UserCheck, UserMinus, Hash
} from "lucide-react";
import { useState } from "react";
import { saveStaff, toggleStaffStatus } from "../actions";
import { useRouter } from "next/navigation";

export default function StaffClient({ initialStaff, outlets }) {
    const router = useRouter();
    const [staff, setStaff] = useState(initialStaff);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleOpenModal = (user = null) => {
        setEditingStaff(user ? { ...user, pin: "" } : {
            full_name: "",
            role: "Kasir",
            email: "",
            pin: "",
            outlet_id: outlets[0]?.id || null,
            is_active: true
        });
        setIsModalOpen(true);
    };

    const onSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const res = await saveStaff(editingStaff);
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
        if (!confirm('Apakah Anda yakin ingin mengubah status staff ini?')) return;
        const res = await toggleStaffStatus(id, currentStatus);
        if (res.success) router.refresh();
    };

    const roles = ['Owner', 'Admin', 'Manajer', 'Supervisor', 'Kasir', 'Pramusaji'];

    return (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
                <div>
                    <h1 className="text-3xl font-black text-primary-900 tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-accent-500" /> Kelola Staff & PIN
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Atur akses kasir, supervisor, dan ganti PIN keamanan mereka di sini.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-900 text-accent-400 px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-primary-800 transition-all active:scale-95 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Daftarkan Staff Baru
                </button>
            </header>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-10 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Nama & Jabatan</th>
                                <th className="px-10 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Kontak / Email</th>
                                <th className="px-10 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Lokasi Outlet</th>
                                <th className="px-10 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-10 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {initialStaff.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center font-black text-primary-600">
                                                {user.full_name[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-primary-900">{user.full_name}</p>
                                                <p className="text-[10px] font-black text-accent-600 uppercase tracking-widest">{user.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <p className="font-bold text-gray-600 flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-300" /> {user.email || 'Hanya Login PIN'}
                                        </p>
                                    </td>
                                    <td className="px-10 py-8">
                                        <p className="font-bold text-gray-600">{user.outlets?.name || 'Semua Outlet'}</p>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {user.is_active ? <UserCheck className="w-3 h-3" /> : <UserMinus className="w-3 h-3" />}
                                            {user.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenModal(user)}
                                                className="p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-primary-900 hover:text-accent-400 transition-all shadow-sm"
                                                title="Edit Staff"
                                            >
                                                <Edit3 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onToggleStatus(user.id, user.is_active)}
                                                className={`p-3 rounded-2xl transition-all shadow-sm ${user.is_active ? 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-green-50 text-green-400 hover:bg-green-500 hover:text-white'}`}
                                                title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                            >
                                                <Power className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Edit/Tambah Staff */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <header className="px-10 py-8 border-b bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-primary-900 leading-tight">
                                    {editingStaff?.id ? 'Edit Detail Staff' : 'Daftarkan Staff Baru'}
                                </h2>
                                <p className="text-sm font-medium text-gray-500">Atur peran dan kredensial login mereka.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <form onSubmit={onSave} className="flex-1 overflow-y-auto px-10 py-8 space-y-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Lengkap Staff *</label>
                                    <input required type="text" value={editingStaff.full_name || ""} onChange={e => setEditingStaff({ ...editingStaff, full_name: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white focus:ring-4 ring-primary-900/5 transition-all outline-none font-bold text-primary-950 text-lg" placeholder="Contoh: Ahmad Kasir" />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Jabatan / Role</label>
                                        <select value={editingStaff.role} onChange={e => setEditingStaff({ ...editingStaff, role: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white outline-none font-black text-primary-950">
                                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Penempatan Outlet</label>
                                        <select value={editingStaff.outlet_id || ""} onChange={e => setEditingStaff({ ...editingStaff, outlet_id: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white outline-none font-black text-primary-950">
                                            <option value="">Semua Outlet (Admin Tenant)</option>
                                            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email (Opsional)</label>
                                    <input type="email" value={editingStaff.email || ""} onChange={e => setEditingStaff({ ...editingStaff, email: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:bg-white outline-none font-bold text-primary-950" placeholder="staff@example.com" />
                                    <p className="text-[10px] text-gray-400 mt-2 font-medium leading-relaxed italic">Email hanya wajib diisi jika staff butuh akses ke dashboard portal manajemen (Admin/Owner).</p>
                                </div>

                                <div className="bg-primary-50 rounded-3xl p-8 border border-primary-100 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center"><Hash className="w-4 h-4" /></div>
                                        <h4 className="font-black text-primary-950 uppercase tracking-widest text-xs">Atur PIN Keamanan</h4>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-[10px] font-black text-primary-900 uppercase tracking-widest mb-2">
                                            {editingStaff.id ? 'Ganti PIN (Kosongkan jika tidak diubah)' : 'Tentukan PIN Login *'}
                                        </label>
                                        <input 
                                            type="password" 
                                            value={editingStaff.pin || ""} 
                                            onChange={e => setEditingStaff({ ...editingStaff, pin: e.target.value })} 
                                            className="w-full bg-white rounded-2xl p-4 border border-gray-200 focus:bg-white outline-none font-black text-primary-950 text-2xl tracking-[1em]" 
                                            placeholder="••••"
                                            maxLength={6}
                                        />
                                        <p className="text-[10px] text-gray-500 mt-2 font-medium">Bisa berupa 4-6 angka. PIN digunakan staff untuk masuk di layar POS.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-3xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">Batal</button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[2] py-5 rounded-3xl font-black bg-primary-900 text-accent-400 shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
                                >
                                    {isLoading ? 'Menyimpan...' : (editingStaff?.id ? 'Perbarui Data Staff' : 'Simpan Staff Baru')} <Save className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
