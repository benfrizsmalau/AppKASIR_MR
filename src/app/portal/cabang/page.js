import { Store } from "lucide-react";
import CabangClient from "./components/CabangClient";
import { getOutlets } from "./actions";
import { dbAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export const metadata = {
    title: "Manajemen Cabang | AppKasir Portal",
};

export default async function CabangPage() {
    const cookieStore = await cookies();
    const tenantId = cookieStore.get('active_tenant_id')?.value;

    const { outlets } = await getOutlets();
    const { data: tenant } = await dbAdmin
        .from('tenants')
        .select('subscription_plan')
        .eq('id', tenantId)
        .single();

    return (
        <div className="p-10 flex flex-col h-full bg-gray-50/50">
            <CabangClient initialOutlets={outlets || []} subscriptionPlan={tenant?.subscription_plan} />
        </div>
    );
}
