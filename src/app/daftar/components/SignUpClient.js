"use client";

import { useState } from "react";
import {
    ChevronRight, CheckCircle2, Building2, MailCheck, ShieldCheck,
    Mail, Phone, Lock, User, Check, Loader2, Rocket, Gift, Zap, Star
} from "lucide-react";
import { proceedRegistration, checkSubdomain } from "../actions";

export default function SignUpClient() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [form, setForm] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: '',
        businessName: '', businessType: 'Restoran', 
        address: '', village: '', district: '', regency: '', province: '', postalCode: '',
        subdomain: '',
    });
    const [subdomainError, setSubdomainError] = useState('');

    const getStrengthLabel = (pwd) => {
        if (!pwd) return null;
        if (pwd.length < 5) return { label: 'Lemah', color: 'text-red-500', bg: 'bg-red-500', w: 'w-1/3' };
        if (pwd.length < 8) return { label: 'Sedang', color: 'text-orange-500', bg: 'bg-orange-500', w: 'w-2/3' };
        return { label: 'Kuat', color: 'text-green-500', bg: 'bg-green-500', w: 'w-full' };
    };
    const strength = getStrengthLabel(form.password);

    const handleStep1 = async (e) => {
        e.preventDefault();
        if (form.password.length < 8) {
            setErrorMsg('Kata sandi minimal 8 karakter.');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setErrorMsg('Konfirmasi kata sandi tidak cocok.');
            return;
        }
        setErrorMsg('');
        setStep(2);
    };

    const handleStep2 = async (e) => {
        e.preventDefault();
        if (!form.subdomain || form.subdomain.length < 3) {
            setSubdomainError('Subdomain minimal 3 karakter.');
            return;
        }
        setIsLoading(true);
        const res = await checkSubdomain(form.subdomain);
        setIsLoading(false);
        if (!res.available) {
            setSubdomainError('Subdomain sudah terpakai. Coba nama lain.');
            return;
        }
        setSubdomainError('');
        setStep(3);
    };

    // Step 3: Simulasi verifikasi → langsung ke step 4 (aktivasi)
    const handleStep4Submit = async () => {
        setIsLoading(true);
        setErrorMsg('');
        const res = await proceedRegistration(form);
        setIsLoading(false);
        if (res.success) {
            setIsSuccess(true);
        } else {
            setErrorMsg(res.message);
        }
    };

    const STEPS = [
        { no: 1, title: 'Akun Pemilik', desc: 'Detail login khusus owner', icon: User },
        { no: 2, title: 'Profil Usaha', desc: 'Nama restoran & subdomain', icon: Building2 },
        { no: 3, title: 'Verifikasi', desc: 'Konfirmasi identitas', icon: ShieldCheck },
        { no: 4, title: 'Aktivasi', desc: 'Akun gratis aktif selamanya', icon: Gift },
    ];

    // ── Layar Sukses ──────────────────────────────────────────────────────────
    if (isSuccess) {
        return (
            <div className="w-full max-w-lg mx-auto bg-white rounded-[40px] shadow-2xl p-14 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-28 h-28 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-green-100">
                    <Rocket className="w-14 h-14 text-green-500" />
                </div>
                <h2 className="text-3xl font-black text-primary-900 mb-3 tracking-tight">Akun Berhasil Dibuat!</h2>
                <p className="text-gray-500 font-medium mb-2">
                    Selamat datang di <span className="font-black text-primary-900">AppKasir</span>.<br />
                    Usaha <span className="font-black text-primary-900">{form.businessName}</span> siap beroperasi.
                </p>
                <div className="mt-8 p-5 bg-green-50 border border-green-100 rounded-3xl text-left space-y-3">
                    <p className="text-xs font-black text-green-600 uppercase tracking-widest">Info Akun Anda</p>
                    <div className="text-sm font-bold text-gray-700 space-y-1.5">
                        <p>📧 Email: <span className="text-primary-900">{form.email}</span></p>
                        <p>🌐 URL Portal: <span className="text-primary-900">{form.subdomain}.appkasir.id/portal</span></p>
                        <p>🎁 Paket: <span className="text-green-600">Gratis Selamanya</span></p>
                    </div>
                </div>
                <a
                    href="/masuk"
                    className="mt-8 w-full bg-primary-900 text-accent-400 py-4.5 rounded-2xl font-black shadow-xl shadow-primary-900/20 hover:bg-primary-800 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                >
                    Masuk ke Portal Pemilik <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <p className="mt-4 text-xs text-gray-400 font-medium">
                    Sudah login? Buka kasir di <a href="/pos" className="text-primary-600 underline underline-offset-4">appkasir.id/pos</a>
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row bg-white rounded-[40px] shadow-2xl overflow-hidden min-h-[600px]">

            {/* ── Kiri: Info & Progress ────────────────────────────────────── */}
            <div className="w-full md:w-[40%] bg-primary-900 text-white p-10 flex flex-col justify-between shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-primary-900 to-primary-900 pointer-events-none" />

                <div className="relative z-10">
                    <div className="w-14 h-14 bg-accent-500 rounded-2xl flex items-center justify-center font-black text-2xl text-primary-900 mb-10 shadow-lg shadow-accent-500/30">
                        AK
                    </div>
                    <h2 className="text-3xl font-black mb-4 leading-tight tracking-tight">
                        Mulai digitalisasi<br />usaha kuliner Anda.
                    </h2>
                    <p className="text-primary-200 mb-10 font-medium">Daftar gratis, setup dalam 5 menit, langsung operasikan kasir.</p>

                    <div className="space-y-6">
                        {STEPS.map((s) => {
                            const Icon = s.icon;
                            const isDone = step > s.no;
                            const isCurrent = step === s.no;
                            return (
                                <div key={s.no} className={`flex items-start gap-4 transition-all duration-300 ${isCurrent ? 'opacity-100 scale-105' : isDone ? 'opacity-80' : 'opacity-35'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold transition-colors ${isCurrent ? 'bg-accent-500 text-primary-900' : isDone ? 'bg-green-500/20 text-green-400' : 'bg-primary-800 text-primary-400'}`}>
                                        {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg leading-tight">{s.title}</h4>
                                        <p className="text-sm text-primary-300">{s.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="relative z-10 mt-10 p-4 bg-primary-800/50 rounded-2xl border border-primary-700 backdrop-blur-sm">
                    <p className="text-xs font-bold text-primary-200 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-4 h-4 text-accent-400" /> 100% Gratis · Tanpa Kartu Kredit
                    </p>
                </div>
            </div>

            {/* ── Kanan: Form Utama ────────────────────────────────────────── */}
            <div className="w-full md:w-[60%] p-10 flex flex-col justify-center bg-gray-50/50">

                {/* STEP 1 — Akun Pemilik */}
                {step === 1 && (
                    <form onSubmit={handleStep1} className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-2xl font-black text-primary-900 mb-2">Buat Akun Pemilik</h3>
                        <p className="text-gray-500 font-medium mb-8">Kredensial ini digunakan untuk login ke Portal Pemilik.</p>

                        {errorMsg && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600">
                                {errorMsg}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Lengkap Pemilik</label>
                                <div className="relative">
                                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white rounded-xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-bold text-gray-800 transition-all" placeholder="Budi Santoso" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Valid</label>
                                    <div className="relative">
                                        <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-white rounded-xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-bold text-gray-800 transition-all" placeholder="budi@email.com" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nomor WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-white rounded-xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-bold text-gray-800 transition-all" placeholder="0812..." />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                                    <span>Kata Sandi</span>
                                    {strength && <span className={strength.color}>{strength.label}</span>}
                                </label>
                                <div className="relative">
                                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full bg-white rounded-xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-black text-gray-800 tracking-wider transition-all" placeholder="Minimal 8 karakter" />
                                </div>
                                {strength && (
                                    <div className="h-1.5 w-full bg-gray-100 mt-2 rounded-full overflow-hidden">
                                        <div className={`h-full ${strength.bg} ${strength.w} transition-all duration-300`} />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Konfirmasi Kata Sandi</label>
                                <div className="relative">
                                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input required type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} className="w-full bg-white rounded-xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-black text-gray-800 tracking-wider transition-all" placeholder="Ulangi kata sandi" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex justify-end">
                            <button type="submit" className="bg-primary-900 text-accent-400 px-8 py-3.5 rounded-2xl font-black hover:bg-primary-800 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-primary-900/20">
                                Lanjut Profil Usaha <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="mt-6 text-sm font-bold text-gray-400 text-center">
                            Sudah punya akun? <a href="/masuk" className="text-primary-900 hover:text-primary-800 underline underline-offset-4">Masuk di sini</a>
                        </p>
                    </form>
                )}

                {/* STEP 2 — Profil Usaha */}
                {step === 2 && (
                    <form onSubmit={handleStep2} className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-2xl font-black text-primary-900 mb-2">Detail Identitas Usaha</h3>
                        <p className="text-gray-500 font-medium mb-8">Informasi ini akan menjadi data outlet utama (pusat).</p>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Restoran / Brand</label>
                                <input required type="text" value={form.businessName} onChange={e => {
                                    const val = e.target.value;
                                    const genSub = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
                                    setForm({ ...form, businessName: val, subdomain: form.subdomain || genSub });
                                }} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 focus:border-primary-500 outline-none font-bold text-gray-800 transition-all text-lg" placeholder="Kedai Kopi Senja" />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Subdomain Akses Portal</label>
                                <div className="flex bg-white rounded-xl border border-gray-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all overflow-hidden">
                                    <div className="px-4 py-3.5 bg-gray-50 border-r border-gray-200 font-black text-gray-400 text-sm whitespace-nowrap">https://</div>
                                    <input required type="text" value={form.subdomain} onChange={e => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) })} className="w-full bg-transparent px-4 py-3.5 outline-none font-bold text-primary-900 tracking-wider lowercase" placeholder="kedaikopi" />
                                    <div className="px-4 py-3.5 bg-gray-50 border-l border-gray-200 font-black text-gray-400 text-sm whitespace-nowrap">.appkasir.id</div>
                                </div>
                                {subdomainError && <p className="text-sm text-red-500 font-bold mt-2">{subdomainError}</p>}
                                <p className="text-[10px] text-gray-400 mt-1.5 italic">3–30 karakter, hanya huruf kecil, angka, dan tanda hubung.</p>
                            </div>

                            {/* Baris 3: Jenis Usaha & Alamat Jalan */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Jenis Usaha</label>
                                    <select value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value })} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 outline-none font-bold text-gray-800 appearance-none">
                                        <option>Restoran</option>
                                        <option>Kafe / Kedai Kopi</option>
                                        <option>Rumah Makan</option>
                                        <option>Food Truck / Kios</option>
                                        <option>Katering</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Alamat Jalan / Lokasi</label>
                                    <input required type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 outline-none font-bold text-gray-800" placeholder="Jl. Merdeka No. 123" />
                                </div>
                            </div>

                            {/* Baris 4: Kelurahan & Kecamatan */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kelurahan / Desa</label>
                                    <input required type="text" value={form.village} onChange={e => setForm({ ...form, village: e.target.value })} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 outline-none font-bold text-gray-800" placeholder="Kel. Gambir" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kecamatan</label>
                                    <input required type="text" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 outline-none font-bold text-gray-800" placeholder="Kec. Menteng" />
                                </div>
                            </div>

                            {/* Baris 5: Kabupaten/Kota & Provinsi */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kabupaten / Kota</label>
                                    <input required type="text" value={form.regency} onChange={e => setForm({ ...form, regency: e.target.value })} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 outline-none font-bold text-gray-800" placeholder="Jakarta Pusat" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Provinsi</label>
                                    <input required type="text" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 outline-none font-bold text-gray-800" placeholder="DKI Jakarta" />
                                </div>
                            </div>

                            {/* Baris 6: Kode Pos */}
                            <div className="w-full md:w-1/2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kode Pos</label>
                                <input required type="text" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 outline-none font-bold text-gray-800" placeholder="10110" />
                            </div>
                        </div>

                        <div className="mt-10 flex justify-between">
                            <button type="button" onClick={() => setStep(1)} className="text-gray-500 font-bold px-4 py-2 hover:bg-gray-100 rounded-xl transition-colors">← Kembali</button>
                            <button disabled={isLoading} type="submit" className="bg-primary-900 text-accent-400 px-8 py-3.5 rounded-2xl font-black hover:bg-primary-800 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-primary-900/20 disabled:opacity-50">
                                {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Memeriksa...</> : <>Cek Ketersediaan <ChevronRight className="w-5 h-5" /></>}
                            </button>
                        </div>
                    </form>
                )}

                {/* STEP 3 — Verifikasi (simulasi) */}
                {step === 3 && (
                    <div className="text-center animate-in fade-in zoom-in-95 duration-300 py-8">
                        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100">
                            <MailCheck className="w-12 h-12 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-black text-primary-900 mb-2">Verifikasi Identitas</h3>
                        <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">
                            Kode verifikasi dikirim ke <span className="font-bold text-primary-900">{form.email}</span>.
                            <br /><span className="text-xs">(Demo: kode otomatis diterima)</span>
                        </p>

                        <div className="flex justify-center gap-3 mb-10">
                            {['1', '2', '3', '4', '5', '6'].map((v, i) => (
                                <div key={i} className="w-12 h-14 bg-white border-2 border-green-400 rounded-xl flex items-center justify-center text-2xl font-black text-green-600 shadow-sm">
                                    {v}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <button type="button" onClick={() => setStep(4)} className="w-full bg-primary-900 text-accent-400 px-8 py-4 rounded-2xl font-black hover:bg-primary-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-primary-900/20">
                                <CheckCircle2 className="w-5 h-5" /> Verifikasi Berhasil — Lanjut Aktivasi
                            </button>
                            <button type="button" onClick={() => setStep(2)} className="text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors">← Koreksi Data Sebelumnya</button>
                        </div>
                    </div>
                )}

                {/* STEP 4 — Aktivasi Gratis */}
                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-sm font-black mb-4">
                                <Gift className="w-4 h-4" /> Gratis Selamanya — Tanpa Kartu Kredit
                            </div>
                            <h3 className="text-2xl font-black text-primary-900 mb-2">Aktifkan Akun Anda</h3>
                            <p className="text-gray-500 font-medium">Konfirmasi data di bawah, lalu klik Aktivasi.</p>
                        </div>

                        {errorMsg && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600">
                                {errorMsg}
                            </div>
                        )}

                        {/* Ringkasan Data */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6 space-y-3 text-sm">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Ringkasan Pendaftaran</p>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="font-bold text-gray-500">Nama Pemilik</span>
                                <span className="font-black text-primary-900">{form.name}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="font-bold text-gray-500">Email Login</span>
                                <span className="font-black text-primary-900">{form.email}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="font-bold text-gray-500">Nama Usaha</span>
                                <span className="font-black text-primary-900">{form.businessName}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="font-bold text-gray-500">Portal URL</span>
                                <span className="font-black text-primary-700 text-xs">{form.subdomain}.appkasir.id</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="font-bold text-gray-500">Paket</span>
                                <span className="font-black text-green-600 flex items-center gap-1"><Star className="w-4 h-4" /> Gratis Selamanya</span>
                            </div>
                        </div>

                        {/* Fitur gratis */}
                        <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-6">
                            <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-3">Yang Anda Dapatkan Gratis:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    '✅ Kasir POS Lengkap',
                                    '✅ Laporan PBJT Pajak',
                                    '✅ Manajemen Menu',
                                    '✅ Inventaris Bahan Baku',
                                    '✅ Manajemen Meja',
                                    '✅ Multi Kasir (PIN)',
                                ].map((f, i) => (
                                    <p key={i} className="text-xs font-bold text-gray-700">{f}</p>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <button type="button" onClick={() => setStep(3)} className="text-gray-500 font-bold px-4 py-2 hover:bg-gray-100 rounded-xl transition-colors">← Kembali</button>
                            <button
                                onClick={handleStep4Submit}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-2xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-2xl shadow-green-600/30 disabled:opacity-50"
                            >
                                {isLoading
                                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Membuat Akun...</>
                                    : <><Rocket className="w-5 h-5" /> Aktivasi Gratis Sekarang</>
                                }
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
