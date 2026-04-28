"use client";

import { Home, ClipboardList, History, Settings, Users, UtensilsCrossed, BarChart3, Layout, Monitor, Package, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Role hierarchy
const ROLES = ['Kasir', 'Supervisor', 'Manajer', 'Admin', 'Owner'];

function hasAccess(userRole, minRole) {
    const u = ROLES.indexOf(userRole);
    const m = ROLES.indexOf(minRole);
    return u >= 0 && m >= 0 && u >= m;
}

const ALL_NAV_ITEMS = [
    { icon: Home, label: "Kasir", href: "/pos", minRole: "Kasir" },
    { icon: ClipboardList, label: "Pesanan Masuk", href: "/pos/orders", minRole: "Kasir" },
    { icon: Monitor, label: "KDS", href: "/pos/kds", minRole: "Kasir" },
    { icon: History, label: "Riwayat", href: "/pos/history", minRole: "Kasir" },
    { icon: Layout, label: "Meja", href: "/pos/tables", minRole: "Kasir" },
    { icon: Users, label: "Pelanggan", href: "/pos/customers", minRole: "Supervisor" },
    { icon: UtensilsCrossed, label: "Menu & Stok", href: "/pos/menu", minRole: "Supervisor" },
    { icon: Package, label: "Inventaris", href: "/pos/inventory", minRole: "Supervisor" },
    { icon: BarChart3, label: "Laporan", href: "/pos/reports", minRole: "Manajer" },
];

export default function POSSidebar({ userRole }) {
    const pathname = usePathname();

    // Sembunyikan sidebar khusus untuk halaman pelaporan SPTPD agar clean (sesuai request)
    if (pathname?.includes('/pos/reports/sptpd')) return null;

    const navItems = ALL_NAV_ITEMS.filter(item => hasAccess(userRole || 'Kasir', item.minRole));

    return (
        <aside className="w-20 lg:w-24 bg-primary-900 text-white flex flex-col items-center py-6 hidden md:flex shrink-0 z-20 shadow-2xl print:hidden">
            <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center font-bold text-xl mb-8 shadow-lg shadow-accent-500/30">
                AK
            </div>

            <nav className="flex-1 flex flex-col gap-6 w-full px-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    // Strict match for POS, startsWith for others to keep active state on subpages
                    const isActive = item.href === '/pos' ? pathname === item.href : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group relative
                                ${isActive
                                    ? 'bg-primary-800 text-accent-400 shadow-inner'
                                    : 'text-primary-300 hover:bg-primary-800/50 hover:text-white'
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-accent-400 rounded-r-full" />
                            )}
                            <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-bold text-center leading-tight mt-1">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto w-full px-4 space-y-2">
                {hasAccess(userRole || 'Kasir', 'Admin') && (
                    <Link
                        href="/pengaturan"
                        className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 text-primary-300 hover:bg-primary-800/50 hover:text-white transition-all group"
                    >
                        <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform duration-300" />
                        <span className="text-[10px] font-bold">Setting</span>
                    </Link>
                )}
                <div className="w-full text-center pb-2 flex flex-col items-center gap-2">
                    <span className="text-[9px] font-black text-primary-500 uppercase tracking-widest">{userRole || 'Kasir'}</span>
                    <button
                        onClick={async () => {
                            if (confirm('Apakah Anda yakin ingin keluar?')) {
                                await logout();
                            }
                        }}
                        className="p-2 text-primary-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all group"
                        title="Keluar / Ganti User"
                    >
                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
