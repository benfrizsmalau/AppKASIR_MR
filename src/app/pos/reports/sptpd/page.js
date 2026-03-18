import { redirect } from 'next/navigation';
import { getSPTPDData } from './actions';
import { getSessionRole } from '@/lib/rbac';
import { hasAccess } from '@/lib/rbac';
import SPTPDClient from './SPTPDClient';

export const metadata = { title: 'SPTPD Pajak Restoran — AppKasir' };

export default async function SPTPDPage({ searchParams }) {
    // RBAC: hanya Manajer ke atas
    const role = await getSessionRole();
    if (!hasAccess(role, 'Manajer')) redirect('/pos');

    const params = await searchParams;
    const year = params?.year;
    const month = params?.month;

    if (!year || !month) {
        redirect('/pos/reports');
    }

    const result = await getSPTPDData(year, month);

    if (!result.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-red-100 max-w-md">
                    <p className="text-red-500 font-bold text-lg mb-2">Gagal memuat data SPTPD</p>
                    <p className="text-gray-500 text-sm">{result.message}</p>
                    <a href="/pos/reports" className="mt-6 inline-block px-6 py-3 bg-primary-900 text-white font-bold rounded-xl">
                        Kembali ke Laporan
                    </a>
                </div>
            </div>
        );
    }

    return <SPTPDClient data={result.data} />;
}
