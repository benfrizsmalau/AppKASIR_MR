"use client";

import { useState } from "react";
import { Mail, Lock, Settings, ChevronRight, AlertCircle, Loader2, X, Eye, EyeOff } from "lucide-react";
import { processOwnerSignIn, resetPassword as doResetPassword } from "../actions";

export default function SignInClient() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // State modal lupa sandi
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetPassword, setResetPasswordVal] = useState('');
    const [resetConfirm, setResetConfirm] = useState('');
    const [showResetPwd, setShowResetPwd] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMsg, setResetMsg] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        const res = await processOwnerSignIn(email, password);
        setIsLoading(false);

        if (res.success) {
            window.location.href = res.redirectUrl;
        } else {
            setErrorMsg(res.message);
        }
    };

    const handleOpenReset = () => {
        setResetEmail(email); // pre-fill dari email login jika ada
        setResetPasswordVal('');
        setResetConfirm('');
        setResetMsg({ type: '', text: '' });
        setShowResetModal(true);
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setResetMsg({ type: '', text: '' });

        if (resetPassword !== resetConfirm) {
            setResetMsg({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
            return;
        }

        setResetLoading(true);
        const res = await doResetPassword(resetEmail, resetPassword);
        setResetLoading(false);

        if (res.success) {
            setResetMsg({ type: 'success', text: res.message });
            setTimeout(() => {
                setShowResetModal(false);
                setEmail(resetEmail);
            }, 2000);
        } else {
            setResetMsg({ type: 'error', text: res.message });
        }
    };

    return (
        <>
        {/* Modal Lupa Sandi */}
        {showResetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 relative animate-in zoom-in-95 duration-200">
                    <button
                        onClick={() => setShowResetModal(false)}
                        className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h3 className="text-2xl font-black text-primary-900 mb-1 tracking-tighter">Reset Kata Sandi</h3>
                    <p className="text-sm text-gray-500 font-medium mb-6">Masukkan email dan kata sandi baru Anda.</p>

                    <form onSubmit={handleReset} className="space-y-4">
                        {resetMsg.text && (
                            <div className={`p-3 rounded-2xl text-sm font-bold flex items-center gap-2 ${resetMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {resetMsg.text}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Terdaftar</label>
                            <div className="relative">
                                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    required
                                    type="email"
                                    value={resetEmail}
                                    onChange={e => setResetEmail(e.target.value)}
                                    className="w-full bg-gray-50 rounded-2xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none font-bold text-gray-800 transition-all font-sans"
                                    placeholder="owner@domain.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kata Sandi Baru</label>
                            <div className="relative">
                                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    required
                                    type={showResetPwd ? 'text' : 'password'}
                                    value={resetPassword}
                                    onChange={e => setResetPasswordVal(e.target.value)}
                                    className="w-full bg-gray-50 rounded-2xl py-3.5 pl-12 pr-12 border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none font-bold text-gray-800 transition-all"
                                    placeholder="Min. 6 karakter"
                                />
                                <button type="button" onClick={() => setShowResetPwd(!showResetPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Konfirmasi Kata Sandi</label>
                            <div className="relative">
                                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    required
                                    type={showResetPwd ? 'text' : 'password'}
                                    value={resetConfirm}
                                    onChange={e => setResetConfirm(e.target.value)}
                                    className="w-full bg-gray-50 rounded-2xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none font-bold text-gray-800 transition-all"
                                    placeholder="Ulangi kata sandi baru"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={resetLoading}
                            className="w-full bg-primary-900 text-accent-400 py-4 rounded-2xl font-black shadow-lg hover:bg-primary-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {resetLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Memperbarui...</> : 'Perbarui Kata Sandi'}
                        </button>
                    </form>
                </div>
            </div>
        )}

        <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row bg-white rounded-[40px] shadow-2xl overflow-hidden min-h-[600px] animate-in fade-in zoom-in-95 duration-500">

            {/* Kiri: Cover Brand / Visual */}
            <div className="hidden md:flex w-[45%] bg-primary-900 text-white p-12 flex-col justify-between shrink-0 relative overflow-hidden text-center items-center">
                <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white via-primary-900 to-primary-900"></div>
                <div className="relative z-10 w-full flex flex-col items-center">
                    <div className="w-20 h-20 bg-accent-500 rounded-[24px] flex items-center justify-center mb-8 shadow-2xl shadow-accent-500/40 transform -rotate-6 transition-transform hover:rotate-0 duration-300">
                        <Settings className="w-10 h-10 text-primary-900" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 tracking-tighter leading-tight w-full max-w-sm">
                        Portal Pemilik <br /><span className="text-accent-400">AppKasir</span>
                    </h2>
                    <p className="text-primary-200 font-medium">Satu dashboard untuk memantau semua outlet, tagihan, dan konfigurasi utama.</p>
                </div>

                <div className="relative z-10 p-6 bg-primary-800/50 rounded-3xl border border-primary-700 backdrop-blur-md w-full max-w-[280px]">
                    <div className="flex gap-2 justify-center mb-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    </div>
                    <p className="text-xs font-black text-primary-200 uppercase tracking-widest leading-relaxed">
                        Sistem Berjalan Normal • Uptime 99.9%
                    </p>
                </div>
            </div>

            {/* Kanan: Login Form */}
            <div className="w-full md:w-[55%] p-10 flex flex-col justify-center bg-gray-50/50 relative">
                <div className="max-w-[400px] w-full mx-auto">
                    <div className="mb-10 text-center md:text-left">
                        <h3 className="text-3xl font-black text-primary-900 mb-2 tracking-tighter">Selamat Datang</h3>
                        <p className="text-gray-500 font-medium">Masuk menggunakan email terdaftar.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {errorMsg && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-sm font-bold leading-relaxed">{errorMsg}</p>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Alamat Email</label>
                                <div className="relative">
                                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        required
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none font-bold text-gray-800 transition-all font-sans"
                                        placeholder="owner@domain.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                                    <span>Kata Sandi</span>
                                                    <button type="button" onClick={handleOpenReset} className="text-accent-600 hover:text-accent-700 transition-colors font-black">Lupa Sandi?</button>
                                </label>
                                <div className="relative">
                                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        required
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none font-black text-gray-800 tracking-wider transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            disabled={isLoading}
                            type="submit"
                            className="w-full mt-4 bg-primary-900 text-accent-400 py-4.5 rounded-2xl font-black shadow-xl shadow-primary-900/20 hover:bg-primary-800 transition-all active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>Mengecek Kredensial <Loader2 className="w-5 h-5 animate-spin" /></>
                            ) : (
                                <>Akses Dashboard <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    {/* Quick Link Login Kasir */}
                    <div className="mt-12 text-center">
                        <p className="text-sm font-bold text-gray-400">
                            Bukan pemilik usaha? <a href="/" className="text-primary-900 hover:text-primary-800 transition-colors underline decoration-2 underline-offset-4">Gunakan Login Kasir (PIN)</a>
                        </p>
                    </div>

                    <div className="mt-4 text-center">
                        <p className="text-sm font-bold text-gray-400">
                            Belum menggunakan AppKasir? <a href="/daftar" className="text-accent-600 hover:text-accent-700 transition-colors underline decoration-2 underline-offset-4">Daftar Sekarang</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
