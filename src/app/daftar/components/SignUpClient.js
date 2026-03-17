"use client";

import { useState } from "react";
import { ChevronRight, CheckCircle2, Building2, CreditCard, MailCheck, ShieldCheck, Mail, Phone, Lock, User, Check, Loader2 } from "lucide-react";
import { proceedRegistration, checkSubdomain } from "../actions";

export default function SignUpClient() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', phone: '', password: '',
        businessName: '', businessType: 'Restoran', province: 'DKI Jakarta', city: 'Jakarta Selatan', subdomain: '',
        plan: 'Starter', duration: 'Bulanan'
    });
    const [subdomainError, setSubdomainError] = useState('');

    const handleNext = async (e) => {
        if (e) e.preventDefault();

        if (step === 2) {
            setIsLoading(true);
            // Check subdomain availability
            const res = await checkSubdomain(form.subdomain);
            setIsLoading(false);
            if (!res.available) {
                setSubdomainError('Subdomain sudah terpakai. Pilih yang lain.');
                return;
            } else {
                setSubdomainError('');
            }
        }

        if (step < 4) setStep(step + 1);
    };

    const handleFinalSubmit = async () => {
        setIsLoading(true);
        const res = await proceedRegistration(form);
        setIsLoading(false);

        if (res.success) {
            alert("Pendaftaran berhasil! Mengalihkan ke Portal Pemilik.");
            window.location.href = "/masuk";
        } else {
            alert(res.message);
        }
    };

    const getStrengthLabel = (pwd) => {
        if (pwd.length < 5) return { label: 'Lemah', color: 'text-red-500', bg: 'bg-red-500', w: 'w-1/3' };
        if (pwd.length < 8) return { label: 'Sedang', color: 'text-orange-500', bg: 'bg-orange-500', w: 'w-2/3' };
        return { label: 'Kuat', color: 'text-green-500', bg: 'bg-green-500', w: 'w-full' };
    };

    const strength = getStrengthLabel(form.password);

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row bg-white rounded-[40px] shadow-2xl overflow-hidden min-h-[600px]">

            {/* Kiri: Kolom Info & Progress */}
            <div className="w-full md:w-[40%] bg-primary-900 text-white p-10 flex flex-col justify-between shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-primary-900 to-primary-900"></div>
                <div className="relative z-10">
                    <div className="w-14 h-14 bg-accent-500 rounded-2xl flex items-center justify-center font-black text-2xl text-primary-900 mb-10 shadow-lg shadow-accent-500/30">
                        AK
                    </div>
                    <h2 className="text-3xl font-black mb-4 leading-tight tracking-tight">Mulai digitalisasi<br />usaha kuliner Anda.</h2>
                    <p className="text-primary-200 mb-10 font-medium">Buat akun, pilih paket, dan jalankan kasir dalam 5 menit.</p>

                    <div className="space-y-6">
                        {[
                            { no: 1, title: 'Akun Pemilik', desc: 'Detail login khusus owner', icon: User },
                            { no: 2, title: 'Profil Usaha', desc: 'Informasi restoran & outlet', icon: Building2 },
                            { no: 3, title: 'Verifikasi', desc: 'Cek email & keamanan', icon: ShieldCheck },
                            { no: 4, title: 'Paket Berlangganan', desc: 'Coba gratis atau langganan', icon: CreditCard }
                        ].map((s) => (
                            <div key={s.no} className={`flex items-start gap-4 transition-all duration-300 ${step === s.no ? 'opacity-100 scale-105' : step > s.no ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold transition-colors ${step === s.no ? 'bg-accent-500 text-primary-900' : step > s.no ? 'bg-primary-800 text-green-400' : 'bg-primary-800 text-primary-400'}`}>
                                    {step > s.no ? <Check className="w-5 h-5" /> : s.no}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">{s.title}</h4>
                                    <p className="text-sm text-primary-300">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 mt-10 p-4 bg-primary-800/50 rounded-2xl border border-primary-700 backdrop-blur-sm">
                    <p className="text-xs font-bold text-primary-200 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" /> Dipercaya oleh +500 Restoran
                    </p>
                </div>
            </div>

            {/* Kanan: Formulir Utama */}
            <div className="w-full md:w-[60%] p-10 flex flex-col justify-center bg-gray-50/50">
                {step === 1 && (
                    <form onSubmit={handleNext} className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-2xl font-black text-primary-900 mb-2">Buat Akun Pemilik</h3>
                        <p className="text-gray-500 font-medium mb-8">Data ini akan digunakan untuk login ke Portal Pemilik SaaS.</p>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Lengkap Pemilik</label>
                                <div className="relative">
                                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white rounded-xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-bold text-gray-800 transition-all" placeholder="John Doe" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Valid</label>
                                    <div className="relative">
                                        <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-white rounded-xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-bold text-gray-800 transition-all" placeholder="john@email.com" />
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
                                    Kata Sandi
                                    {form.password && <span className={strength.color}>{strength.label}</span>}
                                </label>
                                <div className="relative">
                                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full bg-white rounded-xl py-3.5 pl-12 pr-4 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-black text-gray-800 tracking-wider transition-all" placeholder="Minimal 8 Karakter" />
                                </div>
                                {form.password && (
                                    <div className="h-1.5 w-full bg-gray-100 mt-2 rounded-full overflow-hidden">
                                        <div className={`h-full ${strength.bg} ${strength.w} transition-all duration-300`} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-10 flex justify-end">
                            <button type="submit" className="bg-primary-900 text-accent-400 px-8 py-3.5 rounded-2xl font-black hover:bg-primary-800 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-primary-900/20">
                                Lanjut Profil Usaha <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleNext} className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-2xl font-black text-primary-900 mb-2">Detail Identitas Usaha</h3>
                        <p className="text-gray-500 font-medium mb-8">Informasi ini akan terpasang sebagai outlet utama (pusat).</p>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Restoran / Brand</label>
                                <input required type="text" value={form.businessName} onChange={e => {
                                    const val = e.target.value;
                                    const genSub = val.toLowerCase().replace(/[^a-z0-9]/g, '');
                                    setForm({ ...form, businessName: val, subdomain: form.subdomain ? form.subdomain : genSub });
                                }} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 focus:border-primary-500 outline-none font-bold text-gray-800 transition-all text-lg" placeholder="Misal: Kedai Kopi Senja" />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Pilih URL Subdomain Anda</label>
                                <div className="flex bg-white rounded-xl border border-gray-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all overflow-hidden">
                                    <div className="px-4 py-3.5 bg-gray-50 border-r border-gray-200 font-black text-gray-400 text-sm">https://</div>
                                    <input required type="text" value={form.subdomain} onChange={e => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })} className="w-full bg-transparent px-4 py-3.5 outline-none font-bold text-primary-900 tracking-wider lowercase" placeholder="kedaikopi" />
                                    <div className="px-4 py-3.5 bg-gray-50 border-l border-gray-200 font-black text-gray-400 text-sm">.appkasir.id</div>
                                </div>
                                {subdomainError && <p className="text-sm text-red-500 font-bold mt-2 animate-pulse">{subdomainError}</p>}
                                <p className="text-[10px] text-gray-400 mt-2 italic">* Subdomain ini digunakan owner untuk akses portal.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Jenis Usaha</label>
                                    <select value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value })} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 outline-none font-bold text-gray-800 appearance-none">
                                        <option>Restoran</option><option>Kafe / Kedai Kopi</option><option>Rumah Makan</option><option>Food Truck / Kios</option><option>Katering</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Provinsi</label>
                                    <select value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} className="w-full bg-white rounded-xl p-3.5 border border-gray-200 outline-none font-bold text-gray-800 appearance-none">
                                        <option>DKI Jakarta</option><option>Jawa Barat</option><option>Jawa Tengah</option><option>Jawa Timur</option><option>Bali</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex justify-between">
                            <button type="button" onClick={() => setStep(1)} className="text-gray-500 font-bold px-4 py-2 hover:bg-gray-100 rounded-xl transition-colors">Kembali</button>
                            <button disabled={isLoading} type="submit" className="bg-primary-900 text-accent-400 px-8 py-3.5 rounded-2xl font-black hover:bg-primary-800 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-primary-900/20 disabled:opacity-50">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Lanjut Verifikasi <ChevronRight className="w-5 h-5" /></>}
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <div className="text-center animate-in fade-in zoom-in-95 duration-300 py-10">
                        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MailCheck className="w-12 h-12 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-black text-primary-900 mb-2">Verifikasi Email Anda</h3>
                        <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">Kami telah mengirimkan 6-digit kode (simulasi OTP sukses) ke <span className="font-bold text-primary-900">{form.email}</span>.</p>

                        <div className="flex justify-center gap-3 mb-10">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <input key={i} type="text" maxLength={1} defaultValue="1" disabled className="w-12 h-14 bg-white border-2 border-green-500 text-center text-2xl font-black rounded-xl text-primary-900" />
                            ))}
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <button type="button" onClick={() => setStep(4)} className="w-full bg-primary-900 text-accent-400 px-8 py-4 rounded-2xl font-black hover:bg-primary-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-primary-900/20">
                                Simulasi Berhasil: Pilih Paket <ChevronRight className="w-5 h-5" />
                            </button>
                            <button type="button" onClick={() => setStep(2)} className="text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">Koreksi Data Sebelumnya</button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h3 className="text-2xl font-black text-primary-900 mb-2">Pilih Siklus & Selesaikan</h3>
                        <p className="text-gray-500 font-medium mb-6">Pilih paket langganan SaaS yang akan aktif untuk usaha Anda.</p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {['Starter', 'Pro'].map(pkg => (
                                <button key={pkg} onClick={() => setForm({ ...form, plan: pkg })} className={`p-5 rounded-2xl border-2 text-left transition-all ${form.plan === pkg ? 'border-primary-900 bg-primary-50 ring-4 ring-primary-100 ring-offset-2' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-black text-primary-900 text-lg">{pkg}</h4>
                                        {form.plan === pkg && <CheckCircle2 className="w-5 h-5 text-primary-900" />}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 mb-3">{pkg === 'Starter' ? '1 Outlet, Max 3 Kasir' : 'Hingga 3 Outlet, Fitur Lengkap'}</p>
                                    <p className="text-xl font-black text-primary-900">
                                        Rp {pkg === 'Starter' ? '99rb' : '249rb'} <span className="text-xs text-gray-400">/ bln</span>
                                    </p>
                                </button>
                            ))}
                        </div>

                        <div className="bg-white border rounded-2xl p-5 mb-8 shadow-sm">
                            <h4 className="font-bold text-gray-800 mb-4 text-sm">Detail Pembayaran Pertama</h4>
                            <div className="space-y-2 text-sm text-gray-600 border-b pb-4 mb-4">
                                <div className="flex justify-between">
                                    <span>Paket {form.plan} (Bulan ke-1)</span>
                                    <span className="font-bold text-gray-900">Rp {form.plan === 'Starter' ? '99.000' : '249.000'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>PPN (11%)</span>
                                    <span className="font-bold text-gray-900">Rp {form.plan === 'Starter' ? '10.890' : '27.390'}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-black text-gray-800">Total Dibayar Nanti</span>
                                <span className="text-2xl font-black text-primary-900">Rp {form.plan === 'Starter' ? '109.890' : '276.390'}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <button type="button" onClick={() => setStep(3)} className="text-gray-500 font-bold px-4 py-2 hover:bg-gray-100 rounded-xl transition-colors">Kembali</button>
                            <button onClick={handleFinalSubmit} disabled={isLoading} className="bg-primary-900 text-accent-400 px-8 py-4 rounded-2xl font-black hover:bg-primary-800 transition-all active:scale-95 flex items-center gap-2 shadow-2xl shadow-primary-900/30 disabled:opacity-50">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Selesaikan & Masuk Kasir <ChevronRight className="w-5 h-5" /></>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
