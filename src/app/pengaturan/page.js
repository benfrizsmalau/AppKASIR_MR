import SettingsClient from "./components/SettingsClient";
import { getOutletSettings } from "./actions";

export const metadata = {
    title: "Pengaturan Outlet | AppKasir",
};

export default async function SettingsPage() {
    const res = await getOutletSettings();

    return (
        <div className="flex-1 h-full bg-gray-50 flex flex-col overflow-hidden">
            <SettingsClient initialSettings={res.settings || {}} />
        </div>
    );
}
