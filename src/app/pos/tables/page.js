import TableManagerClient from "./components/TableManagerClient";
import { getTables } from "./actions";

export const metadata = {
    title: "Manajemen Meja | AppKasir",
};

export default async function TablePage() {
    const res = await getTables();

    return (
        <div className="flex-1 h-full overflow-hidden bg-gray-50 flex flex-col">
            <TableManagerClient initialTables={res.tables || []} />
        </div>
    );
}
