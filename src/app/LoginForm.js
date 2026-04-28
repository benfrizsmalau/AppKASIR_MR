"use client";

import { useState } from "react";
import { Lock, User, TerminalSquare, AlertCircle, ArrowRight } from "lucide-react";
import { loginWithPin } from "./actions/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm({ users = [] }) {
    const [pin, setPin] = useState("");
    const [selectedUser, setSelectedUser] = useState(users.length > 0 ? users[0].id : "");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (!selectedUser) {
            setErrorMsg("Pilih pengguna terlebih dahulu.");
            return;
        }

        setLoading(true);
        const result = await loginWithPin(selectedUser, pin);
        setLoading(false);

        if (result.success) {
            router.push("/pos"); // Redirect ke halaman POS
        } else {
            setErrorMsg(result.message);
            setPin("");
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Left side: Branding / Illustration (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative flex-col justify-between overflow-hidden">
                {/* Decorative background shapes */}
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-primary-800 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[30rem] h-[30rem] bg-accent-500 rounded-full blur-3xl opacity-20"></div>

                <div className="relative z-10 p-12 flex flex-col h-full">
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-accent-500 p-2 rounded-lg">
                            <TerminalSquare className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">AppKasir</span>
                        <span className="text-primary-300 text-sm font-medium mt-1">PRO</span>
                    </div>

                    <div className="mt-auto mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                            Sistem Kasir Pintar <br />
                            <span className="text-accent-400">untuk Bisnis Anda.</span>
                        </h1>
                        <p className="text-primary-100 text-lg max-w-md leading-relaxed">
                            Kelola pesanan, meja, inventaris, dan kepatuhan pajak PBJT dengan mudah dalam satu platform cloud.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-primary-200/80 text-sm font-medium">
                        <span>Server: Online</span>
                        <span className="w-1 h-1 bg-primary-400 rounded-full"></span>
                        <span>v1.1.0-beta</span>
                    </div>
                </div>
            </div>

            {/* Right side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white shadow-[0_0_40px_rgba(0,0,0,0.02)] relative z-10 rounded-l-3xl lg:-ml-6">
                <div className="w-full max-w-md">
                    {/* Mobile Header */}
                    <div className="flex lg:hidden items-center justify-center gap-3 mb-10 text-primary-900">
                        <div className="bg-accent-500 p-2 rounded-lg">
                            <TerminalSquare className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-3xl font-bold tracking-tight">AppKasir</span>
                    </div>

                    <div className="text-center lg:text-left mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Selamat Datang</h2>
                        <p className="text-gray-500">Silakan masukkan PIN kasir Anda untuk memulai shift operasional.</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Pilih Pengguna
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <select
                                        value={selectedUser}
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-sm bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                                    >
                                        {users.length === 0 && <option value="">--- Pilih Toko Dulu ---</option>}
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                                {users.length === 0 && (
                                    <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col gap-3">
                                        <p className="text-xs font-bold text-amber-800 leading-relaxed text-center">
                                            Sistem tidak mendeteksi Toko yang aktif di browser ini. 
                                            Harap login sebagai <span className="text-primary-900 underline">Admin Utama</span> terlebih dahulu untuk mengidentifikasi toko Anda.
                                        </p>
                                        <Link href="/masuk" className="w-full py-2 bg-amber-500 text-white rounded-xl text-center text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md active:scale-95">
                                            Login Admin Utama Disini
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    PIN Akses
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-lg tracking-[0.5em] bg-gray-50 focus:bg-white"
                                        placeholder="••••"
                                        maxLength={6}
                                        required
                                        disabled={loading}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? "Memverifikasi..." : "Masuk ke POS"}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between font-bold">
                        <Link href="/masuk" className="text-sm text-primary-600 hover:text-primary-800 transition-colors flex items-center gap-1">
                            <ArrowRight className="w-4 h-4" /> Buka Portal Admin Utama
                        </Link>
                        <Link href="/lupa-pin" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                            Lupa PIN?
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
