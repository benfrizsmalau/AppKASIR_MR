import POSSidebar from "./components/POSSidebar";
import { getSessionRole } from "@/lib/rbac";

export default async function POSLayout({ children }) {
    const role = await getSessionRole();

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 font-sans print:overflow-visible print:h-auto">
            <POSSidebar userRole={role} />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-y-auto print:overflow-visible">
                {children}
            </main>
        </div>
    );
}
