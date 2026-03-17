import ReportsClient from "./components/ReportsClient";
import { getSalesReport, getCreditReport, getPBJTLedger, getShiftSummary, getMasaPajakList } from "./actions";
import { getSessionRole, hasAccess } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Laporan & Analitik | AppKasir",
};

export default async function ReportsPage({ searchParams }) {
    const role = await getSessionRole();
    if (!hasAccess(role, 'Manajer')) redirect('/pos');

    const params = await searchParams;
    const startDate = params?.start;
    const endDate = params?.end;
    const shiftDate = params?.shift;

    const [salesRes, creditRes, pbjtRes, shiftRes, masaPajakRes] = await Promise.all([
        getSalesReport(startDate, endDate),
        getCreditReport(),
        getPBJTLedger(startDate, endDate),
        getShiftSummary(shiftDate),
        getMasaPajakList(),
    ]);

    return (
        <div className="flex-1 h-full overflow-hidden bg-gray-50 flex flex-col">
            <ReportsClient
                initialSalesData={salesRes.success ? salesRes : null}
                initialCreditData={creditRes.success ? creditRes.data : []}
                initialPBJTData={pbjtRes.success ? pbjtRes.data : []}
                initialShiftData={shiftRes.success ? shiftRes : null}
                initialMasaPajakData={masaPajakRes.success ? masaPajakRes.data : []}
                error={!salesRes.success ? salesRes.message : null}
            />
        </div>
    );
}
