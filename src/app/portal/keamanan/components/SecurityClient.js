"use client";

import {
    ShieldCheck, Lock, Smartphone, Laptop, Globe,
    Trash2, AlertCircle, RefreshCw, Key, LogOut,
    CheckCircle2, XCircle, ShieldAlert, History
} from "lucide-react";
import { useState } from "react";
import { toggleTwoFactor, terminateSession } from "../actions";
import { useRouter } from "next/navigation";

export default function SecurityClient({ initial2FA, initialSessions }) {
    const router = useRouter();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(initial2FA);
    const [isLoading, setIsLoading] = useState(false);

    const onToggle2FA = async () => {
        setIsLoading(true);
        const res = await toggleTwoFactor(!twoFactorEnabled);
        if (res.success) {
            setTwoFactorEnabled(!twoFactorEnabled);
            alert(res.success ? `2FA Berhasil ${!twoFactorEnabled ? 'Diaktifkan' : 'Dinonaktifkan'}` : res.message);
        }
        setIsLoading(false);
    };

    const onTerminate = async (id) => {
        if (!confirm('Keluarkan perangkat ini? Sesi akan langsung dihentikan.')) return;
        const res = await terminateSession(id);
        if (res.success) router.refresh();
    };

    return (
        <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <header className="border-b pb-6">
                <h1 className="text-3xl font-black text-primary-900 tracking-tight flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-accent-500" /> Keamanan Akun
                </h1>
                <p className="text-gray-500 font-medium mt-1">Lindungi aset digital Anda dengan lapisan keamanan tambahan.</p>
            </header>

            <div className="grid grid-cols-1 gap-10">
                {/* Section 1: 2FA */}
                <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
                    <div className="flex flex-col md:flex-row gap-10 items-start">
                        <div className="w-24 h-24 bg-primary-50 rounded-[32px] flex items-center justify-center shrink-0 border border-primary-100">
                            {twoFactorEnabled ? (
                                <Smartphone className="w-10 h-10 text-primary-600 animate-bounce" />
                            ) : (
                                <ShieldAlert className="w-10 h-10 text-gray-300" />
                            )}
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-primary-900">Otentikasi Dua Faktor (2FA)</h2>
                                    <p className="text-gray-500 font-medium mt-1">Menambahkan lapisan keamanan ekstra ke akun Anda. Selain password, Anda akan diminta kode dari aplikasi otentikator.</p>
                                </div>
                                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {twoFactorEnabled ? 'Aktif' : 'Nonaktif'}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <h4 className="font-bold text-primary-900 mb-2 flex items-center gap-2 italic">
                                    <AlertCircle className="w-4 h-4 text-accent-500" /> Mengapa ini penting?
                                </h4>
                                <p className="text-xs text-gray-500 leading-relaxed font-medium">Bahkan jika seseorang mengetahui kata sandi Anda, mereka tidak akan bisa masuk tanpa akses fisik ke perangkat seluler Anda. Kami sangat menyarankan mengaktifkan fitur ini untuk akun Owner.</p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={onToggle2FA}
                                    disabled={isLoading}
                                    className={`px-8 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl flex items-center gap-2 ${twoFactorEnabled ? 'bg-white text-red-600 border-2 border-red-50' : 'bg-primary-900 text-accent-400'}`}
                                >
                                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    {twoFactorEnabled ? 'Nonaktifkan 2FA' : 'Aktifkan Sekarang'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Active Sessions */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-primary-900">Sesi Aktif</h2>
                            <p className="text-gray-500 font-medium mt-1">Daftar perangkat yang saat ini masuk ke akun Anda.</p>
                        </div>
                        <button onClick={() => router.refresh()} className="p-3 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-primary-900 transition-colors">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-10 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Perangkat / Browser</th>
                                    <th className="px-10 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Lokasi & IP</th>
                                    <th className="px-10 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Aktivitas Terakhir</th>
                                    <th className="px-10 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {initialSessions.map((sess) => (
                                    <tr key={sess.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                                                    {sess.device_name?.toLowerCase().includes('phone') ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-primary-900 flex items-center gap-2">
                                                        {sess.device_name || 'Browser Tidak Dikenal'}
                                                        {sess.is_active && (
                                                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {sess.is_active ? 'Sesi Aktif' : 'Telah Berakhir'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <p className="font-bold text-gray-700 flex items-center gap-1.5"><Globe className="w-4 h-4 text-gray-300" /> {sess.location || 'Unknown'}</p>
                                                <p className="text-xs font-medium text-gray-400">{sess.ip_address}</p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <p className="font-bold text-gray-600">{new Date(sess.last_active).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            {sess.is_active ? (
                                                <button
                                                    onClick={() => onTerminate(sess.id)}
                                                    className="p-3 text-red-100 bg-red-500 rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                                                    title="Keluarkan Perangkat"
                                                >
                                                    <LogOut className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <div className="p-3 text-gray-200">
                                                    <History className="w-5 h-5" />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {initialSessions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-10 py-20 text-center text-gray-300 font-medium">
                                            <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            Tidak ada riwayat sesi ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
