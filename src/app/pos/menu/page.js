import MenuClient from "./components/MenuClient";
import { getCategories, getMenuItems, getInventoryLogs } from "./actions";

export const metadata = {
    title: "Manajemen Menu & Stok | AppKasir",
};

export default async function MenuPage() {
    const catRes = await getCategories();
    const menuRes = await getMenuItems();
    const logsRes = await getInventoryLogs();

    return (
        <div className="flex-1 h-full overflow-hidden bg-gray-50 flex flex-col">
            <MenuClient
                initialCategories={catRes.categories || []}
                initialMenuItems={menuRes.menuItems || []}
                initialLogs={logsRes.logs || []}
                error={(!catRes.success || !menuRes.success) ? (catRes.message || menuRes.message) : null}
            />
        </div>
    );
}
