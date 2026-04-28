import CustomerClient from "./components/CustomerClient";
import { getCustomers } from "./actions";

export const metadata = {
    title: "Manajemen Pelanggan | AppKasir",
};

export default async function CustomerPage() {
    const data = await getCustomers();

    return (
        <div className="flex-1 h-full overflow-hidden bg-gray-50 flex flex-col">
            <CustomerClient initialCustomers={data.customers || []} error={data.success ? null : data.message} />
        </div>
    );
}
