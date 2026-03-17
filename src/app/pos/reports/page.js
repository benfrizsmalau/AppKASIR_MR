import ReportsClient from "./components/ReportsClient";
import { getSalesReport, getCreditReport, getPBJTLedger } from "./actions";

export const metadata = {
    title: "Laporan & Analitik | AppKasir",
};

export default async function ReportsPage({ searchParams }) {
    // Basic date filtering from query (awaiting searchParams for Next.js 15)
    const params = await searchParams;
    const startDate = params?.start;
    const endDate = params?.end;

    const salesRes = await getSalesReport(startDate, endDate);
    const creditRes = await getCreditReport();
    const pbjtRes = await getPBJTLedger(startDate, endDate);

    return (
        <div className="flex-1 h-full overflow-hidden bg-gray-50 flex flex-col">
            <ReportsClient
                initialSalesData={salesRes.success ? salesRes : null}
                initialCreditData={creditRes.success ? creditRes.data : []}
                initialPBJTData={pbjtRes.success ? pbjtRes.data : []}
                error={!salesRes.success ? salesRes.message : null}
            />
        </div>
    );
}
