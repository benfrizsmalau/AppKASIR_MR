import { Building2, CreditCard, LogOut, Settings2, BarChart3, Receipt, HeartHandshake, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/supabase";

export default async function PortalLayout({ children }) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('session_user_id')?.value;
    const tenantId = cookieStore.get('active_tenant_id')?.value;

    if (!userId || !tenantId) {
        redirect('/masuk');
    }

    // Ambil data tenant untuk header
    const { data: tenant } = await dbAdmin
        .from('tenants')
        .select('name, subscription_plan, status')
        .eq('id', tenantId)
        .single();

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            {/* Sidebar Portal */}
            <aside className="w-64 bg-primary-900 text-white flex flex-col shrink-0">
                <div className="p-8 pb-4">
                    <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center font-black text-xl text-primary-900 mb-6 shadow-lg shadow-accent-500/30">
                        AK
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Owner Portal</p>
                    <h2 className="text-xl font-black truncate">{tenant?.name || 'Usaha Anda'}</h2>

                    <span className={`mt-3 inline-block px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${tenant?.status === 'Aktif' ? 'bg-green-500/20 text-green-400' : tenant?.status === 'Trial' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                        {tenant?.status} - {tenant?.subscription_plan}
                    </span>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2">
                    <Link href="/portal" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all group">
                        <BarChart3 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Ringkasan
                    </Link>
                    <Link href="/portal/cabang" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all group">
                        <Store className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Kelola Cabang
                    </Link>
                    <Link href="/portal/langganan" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all group">
                        <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Langganan & Tagihan
                    </Link>
                    <Link href="/portal/keamanan" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all group">
                        <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Keamanan & Akun
                    </Link>

                    <Link href="/pos" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-accent-500 bg-accent-500/10 hover:bg-accent-500/20 transition-all mt-4">
                        <Receipt className="w-5 h-5" />
                        Buka Aplikasi Kasir
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <form action={async () => {
                        'use server';
                        const cookieStore = await cookies();
                        cookieStore.delete('session_user_id');
                        cookieStore.delete('active_tenant_id');
                        cookieStore.delete('active_outlet_id');
                        redirect('/masuk');
                    }}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
                            <LogOut className="w-5 h-5" /> Keluar Portal
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
