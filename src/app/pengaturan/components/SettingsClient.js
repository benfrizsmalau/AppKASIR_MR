"use client";

import { useState } from "react";
import { Settings, Save, Home, Phone, Mail, FileText, Percent, Info, AlertCircle } from "lucide-react";
import { updateOutletSettings } from "../actions";

export default function SettingsClient({ initialSettings }) {
    const [settings, setSettings] = useState(initialSettings);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const res = await updateOutletSettings(settings);
        setIsLoading(false);
        setMessage({ type: res.success ? 'success' : 'error', text: res.message });

        if (res.success) {
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="flex-1 flex flex-col">
            <header className="bg-white px-8 py-8 border-b shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-primary-900 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-accent-500" />
                        Pengaturan Outlet
                    </h1>
                    <p className="text-gray-500 font-medium">Konfigurasi informasi bisnis dan sistem perpajakan.</p>
                </div>
                <div className="flex gap-3">
                    <a href="/pos" className="bg-gray-100 text-gray-700 px-5 py-3 rounded-2xl font-black hover:bg-gray-200 transition-all">
                        Kembali ke Kasir
                    </a>
                    <a href="/pengaturan/staff" className="bg-accent-500 text-primary-900 px-5 py-3 rounded-2xl font-black hover:bg-accent-400 transition-all flex items-center gap-2 shadow-lg shadow-accent-500/20">
                        Kelola Pengguna / Kasir
                    </a>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {message.type === 'success' ? <Info className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <p className="font-bold">{message.text}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section 1: Profil Bisnis */}
                        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Home className="w-5 h-5 text-primary-900" />
                                <h2 className="text-lg font-black text-primary-900 uppercase tracking-tight">Profil Bisnis</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nama Outlet</label>
                                    <input required type="text" value={settings.name || ''} onChange={e => setSettings({ ...settings, name: e.target.value })} className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-200 focus:bg-white text-primary-950 outline-none font-bold transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Alamat Lengkap</label>
                                    <textarea rows={3} value={settings.address || ''} onChange={e => setSettings({ ...settings, address: e.target.value })} className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-200 focus:bg-white text-primary-950 outline-none font-bold transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Telepon</label>
                                        <input type="text" value={settings.phone || ''} onChange={e => setSettings({ ...settings, phone: e.target.value })} className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-200 focus:bg-white text-primary-950 outline-none font-bold transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Email</label>
                                        <input type="email" value={settings.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })} className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-200 focus:bg-white text-primary-950 outline-none font-bold transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Pajak & Legal */}
                        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Percent className="w-5 h-5 text-primary-900" />
                                <h2 className="text-lg font-black text-primary-900 uppercase tracking-tight">Pajak & PBJT</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">NPWPD (Legal)</label>
                                    <input type="text" value={settings.npwpd || ''} onChange={e => setSettings({ ...settings, npwpd: e.target.value })} className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-200 focus:bg-white text-primary-950 outline-none font-bold transition-all" placeholder="P-000000..." />
                                </div>

                                <div className="p-5 bg-primary-50 rounded-2xl border border-primary-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="font-bold text-primary-900">Aktifkan PBJT 10%</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={settings.pbjt_active} onChange={e => setSettings({ ...settings, pbjt_active: e.target.checked })} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-900"></div>
                                        </label>
                                    </div>

                                    {settings.pbjt_active && (
                                        <div className="space-y-4 animate-in fade-in duration-200">
                                            <div>
                                                <label className="block text-[10px] font-black text-primary-400 uppercase mb-1.5 leading-none">Nilai Pajak (%)</label>
                                                <input type="number" value={settings.pbjt_rate || 10} onChange={e => setSettings({ ...settings, pbjt_rate: e.target.value })} className="w-full bg-white rounded-lg p-2.5 border border-primary-100 outline-none font-bold text-primary-900" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-primary-400 uppercase mb-2 leading-none">Metode Perhitungan</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button type="button" onClick={() => setSettings({ ...settings, pbjt_mode: 'Inklusif' })} className={`py-2 px-3 rounded-lg text-xs font-black border-2 transition-all ${settings.pbjt_mode === 'Inklusif' ? 'bg-primary-900 text-accent-400 border-primary-900 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
                                                        INKLUSIF
                                                    </button>
                                                    <button type="button" onClick={() => setSettings({ ...settings, pbjt_mode: 'Eksklusif' })} className={`py-2 px-3 rounded-lg text-xs font-black border-2 transition-all ${settings.pbjt_mode === 'Eksklusif' ? 'bg-primary-900 text-accent-400 border-primary-900 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
                                                        EKSKLUSIF
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-primary-300 mt-2 font-medium italic">
                                                    {settings.pbjt_mode === 'Inklusif' ? '* Harga Menu sudah termasuk pajak.' : '* Pajak ditambahkan di akhir struk.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button disabled={isLoading} type="submit" className="bg-primary-900 text-accent-400 hover:bg-primary-800 px-10 py-4 rounded-[20px] font-black flex items-center gap-3 shadow-2xl shadow-primary-900/30 transition-all active:scale-95 disabled:opacity-50">
                            <Save className="w-5 h-5" />
                            {isLoading ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
