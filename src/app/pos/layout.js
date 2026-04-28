import POSSidebar from "./components/POSSidebar";
import { getSessionRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function POSLayout({ children }) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('session_user_id')?.value;
    const outletId = cookieStore.get('active_outlet_id')?.value;

    if (!userId || !outletId) {
        redirect('/');
    }

    const role = await getSessionRole();

    if (!role) {
        redirect('/');
    }

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
