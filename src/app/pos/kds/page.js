import KDSClient from "./KDSClient";
import { getActiveOrders } from "../actions/activeOrders";

export const metadata = {
    title: "Kitchen Display System (KDS) | AppKasir",
};

export default async function KDSPage() {
    // Re-use active orders logic but we will filter/map it for kitchen needs
    const res = await getActiveOrders();

    return (
        <div className="flex-1 h-full overflow-hidden bg-gray-900 flex flex-col">
            <KDSClient initialOrders={res.success ? res.orders : []} />
        </div>
    );
}
