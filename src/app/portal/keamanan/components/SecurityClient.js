"use client";

import {
    ShieldCheck, Lock, Smartphone, Laptop, Globe,
    LogOut, AlertCircle, RefreshCw, Key,
    ShieldAlert, History, CheckCircle2, Eye, EyeOff, Save
} from "lucide-react";
import { useState } from "react";
import { toggleTwoFactor, terminateSession, changePassword } from "../actions";
import { useRouter } from "next/navigation";

export default function SecurityClient({ initial2FA, initialSessions }) {
    const router = useRouter();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(initial2FA);
    const [isLoading2FA, setIsLoading2FA] = useState(false);

    // Change password state
    const [pwdForm, setPwdForm] = useState({ old: '', new: '', confirm: '' });
    const [showPwd, setShowPwd] = useState({ old: false, new: false });
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdMsg, setPwdMsg] = useState(null); // { type: 'success'|'error', text }

    const onToggle2FA = async () => {
        setIsLoading2FA(true);
        const res = await toggleTwoFactor(!twoFactorEnabled);
        if (res.success) setTwoFactorEnabled(!twoFactorEnabled);
        setIsLoading2FA(false);
    };

    const onTerminate = async (id) => {
        if (!confirm('Keluarkan perangkat ini? Sesi akan langsung dihentikan.')) return;
        const res = await terminateSession(id);
        if (res.success) router.refresh();
    };

    const onChangePassword = async (e) => {
        e.preventDefault();
        setPwdMsg(null);
        if (pwdForm.new.length < 8) {
            setPwdMsg({ type: 'error', text: 'Kata sandi baru minimal 8 karakter.' });
            return;
        }
        if (pwdForm.new !== pwdForm.confirm) {
            setPwdMsg({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
            return;
        }
        setPwdLoading(true);
        const res = await changePassword(pwdForm.old, pwdForm.new);
        setPwdLoading(false);
        if (res.success) {
            setPwdMsg({ type: 'success', text: res.message });
            setPwdForm({ old: '', new: '', confirm: '' });
        } else {
            setPwdMsg({ type: 'error', text: res.message });
        }
    };

    return (
        <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <header className="border-b pb-6">
                <h1 className="text-3xl font-black text-primary-900 tracking-tight flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-accent-500" /> Keamanan Akun
                </h1>
                <p className="text-gray-500 font-medium mt-1">Lindungi aset digital Anda dengan lapisan keamanan tambahan.</p>
            </header>

            {/* ── Ganti Kata Sandi ──────────────────────────────────────── */}
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center">
                        <Key className="w-6 h-6 text-primary-700" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-primary-900">Ubah Kata Sandi</h2>
                        <p className="text-sm font-medium text-gray-500">Gunakan kata sandi yang kuat dan unik.</p>
                    </div>
                </div>

                <form onSubmit={onChangePassword} className="space-y-5 max-w-md">
                    {pwdMsg && (
                        <div className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-bold ${pwdMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {pwdMsg.type === 'success'
                                ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                                : <AlertCircle className="w-5 h-5 shrink-0" />
                            }
                            {pwdMsg.text}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kata Sandi Lama</label>
                        <div className="relative">
                            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                required
                                type={showPwd.old ? 'text' : 'password'}
                                value={pwdForm.old}
                                onChange={e => setPwdForm({ ...pwdForm, old: e.target.value })}
                                className="w-full bg-gray-50 rounded-2xl py-3.5 pl-12 pr-12 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-black text-gray-800 tracking-wider transition-all"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPwd(p => ({ ...p, old: !p.old }))} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPwd.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kata Sandi Baru</label>
                        <div className="relative">
                            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                required
                                type={showPwd.new ? 'text' : 'password'}
                                value={pwdForm.new}
                                onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })}
                                className="w-full bg-gray-50 rounded-2xl py-3.5 pl-12 pr-12 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-black text-gray-800 tracking-wider transition-all"
                                placeholder="Minimal 8 karakter"
                            />
                            <button type="button" onClick={() => setShowPwd(p => ({ ...p, new: !p.new }))} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPwd.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Konfirmasi Kata Sandi Baru</label>
                        <div className="relative">
                            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                required
                                type="password"
                                value={pwdForm.confirm}
                                onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                                className="w-full bg-gray-50 rounded-2xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-black text-gray-800 tracking-wider transition-all"
                                placeholder="Ulangi kata sandi baru"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={pwdLoading}
                        className="flex items-center gap-2 px-8 py-3.5 bg-primary-900 text-accent-400 rounded-2xl font-black shadow-xl shadow-primary-900/20 hover:bg-primary-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {pwdLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {pwdLoading ? 'Memperbarui...' : 'Simpan Kata Sandi Baru'}
                    </button>
                </form>
            </section>

            {/* ── 2FA ───────────────────────────────────────────────────── */}
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
                <div className="flex flex-col md:flex-row gap-10 items-start">
                    <div className="w-20 h-20 bg-primary-50 rounded-[28px] flex items-center justify-center shrink-0 border border-primary-100">
                        {twoFactorEnabled
                            ? <Smartphone className="w-10 h-10 text-primary-600 animate-bounce" />
                            : <ShieldAlert className="w-10 h-10 text-gray-300" />
                        }
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-black text-primary-900">Autentikasi Dua Faktor (2FA)</h2>
                                <p className="text-gray-500 font-medium text-sm mt-1">Lapisan keamanan ekstra — kode dari aplikasi Authenticator diperlukan saat login.</p>
                            </div>
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {twoFactorEnabled ? 'Aktif' : 'Nonaktif'}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                            <p className="text-xs font-bold text-primary-900 mb-1.5 flex items-center gap-2 italic">
                                <AlertCircle className="w-4 h-4 text-accent-500" /> Mengapa ini penting?
                            </p>
                            <p className="text-xs text-gray-500 leading-relaxed font-medium">Bahkan jika kata sandi Anda bocor, penyerang tetap tidak bisa masuk tanpa akses ke perangkat Anda. Sangat disarankan untuk akun Owner.</p>
                        </div>
                        <button
                            onClick={onToggle2FA}
                            disabled={isLoading2FA}
                            className={`px-8 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg flex items-center gap-2 ${twoFactorEnabled ? 'bg-white text-red-600 border-2 border-red-100 hover:bg-red-50' : 'bg-primary-900 text-accent-400 shadow-primary-900/20'}`}
                        >
                            {isLoading2FA ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            {twoFactorEnabled ? 'Nonaktifkan 2FA' : 'Aktifkan 2FA Sekarang'}
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Sesi Aktif ────────────────────────────────────────────── */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-primary-900">Sesi Aktif</h2>
                        <p className="text-gray-500 font-medium text-sm mt-1">Daftar perangkat yang saat ini masuk ke akun Anda.</p>
                    </div>
                    <button onClick={() => router.refresh()} className="p-3 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-primary-900 transition-colors">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                    {initialSessions.length === 0 ? (
                        <div className="px-10 py-20 text-center text-gray-300">
                            <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-medium text-gray-400">Tidak ada riwayat sesi ditemukan.</p>
                            <p className="text-sm text-gray-300 mt-1">Sesi aktif akan muncul di sini saat fitur manajemen sesi diaktifkan.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Perangkat</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Lokasi & IP</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Aktivitas</th>
                                    <th className="px-8 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {initialSessions.map((sess) => (
                                    <tr key={sess.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                                                    {sess.device_name?.toLowerCase().includes('phone') ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-primary-900 text-sm flex items-center gap-2">
                                                        {sess.device_name || 'Browser Tidak Dikenal'}
                                                        {sess.is_active && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />}
                                                    </p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sess.is_active ? 'Sesi Aktif' : 'Berakhir'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-gray-700 text-sm flex items-center gap-1.5"><Globe className="w-4 h-4 text-gray-300" />{sess.location || 'Unknown'}</p>
                                            <p className="text-xs font-medium text-gray-400 mt-0.5">{sess.ip_address}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-gray-600 text-sm">{new Date(sess.last_active).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {sess.is_active ? (
                                                <button onClick={() => onTerminate(sess.id)} className="p-2.5 text-red-100 bg-red-500 rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95">
                                                    <LogOut className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <div className="p-2.5 text-gray-200"><History className="w-4 h-4" /></div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    );
}
