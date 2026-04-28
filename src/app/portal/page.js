import { dbAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { BarChart3, Plus, ArrowUpRight, TrendingUp, Users, Store } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Dashboard Portal | AppKasir" };

export default async function PortalDashboard() {
    const cookieStore = await cookies();
    const tenantId = cookieStore.get('active_tenant_id')?.value;

    const { data: outlets } = await dbAdmin
        .from('outlets')
        .select('*')
        .eq('tenant_id', tenantId);

    const { data: staff } = await dbAdmin
        .from('staff_users')
        .select('id')
        .eq('tenant_id', tenantId);

    return (
        <div className="p-10 space-y-10">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h1 className="text-3xl font-black text-primary-900 tracking-tight">Ringkasan Usaha</h1>
                    <p className="text-gray-500 font-medium mt-1">Pantau perkembangan seluruh cabang dan kasir Anda.</p>
                </div>
                <div className="flex gap-4">
                    <Link href="/portal/cabang" className="bg-primary-900 text-accent-400 px-6 py-3 rounded-2xl font-black shadow-xl shadow-primary-900/20 hover:bg-primary-800 transition-all active:scale-95 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Buka Outlet Baru
                    </Link>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metrik Global Mockup */}
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-shadow">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                        <Store className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Outlet Aktif</p>
                        <p className="text-3xl font-black text-primary-900">{outlets?.length || 0} Cabang</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-shadow">
                    <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                        <Users className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Pengguna / Staff Kasir</p>
                        <p className="text-3xl font-black text-primary-900">{staff?.length || 0} Akun</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-shadow">
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Status Lisensi (SaaS)</p>
                        <p className="text-3xl font-black text-green-500 flex items-center gap-2">
                            Aktif <ArrowUpRight className="w-6 h-6" />
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 p-8 rounded-[32px] flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="font-bold text-gray-500">Grafik Penjualan Gabungan Outlet Belum Tersedia.</p>
                    <p className="text-sm text-gray-400 mt-2">Mulai lakukan transaksi di Kasir (POS) untuk melihat analitik di sini.</p>
                </div>
            </div>
        </div>
    );
}
