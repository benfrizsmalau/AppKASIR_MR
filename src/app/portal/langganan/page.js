import SubscriptionClient from "./components/SubscriptionClient";
import { dbAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { getInvoices } from "./actions";

export const metadata = { title: "Kelola Langganan SaaS | AppKasir Portal" };

export default async function SubscriptionPage() {
    const cookieStore = await cookies();
    const tenantId = cookieStore.get('active_tenant_id')?.value;

    const { data: tenant } = await dbAdmin
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

    const { invoices } = await getInvoices();

    return (
        <div className="p-10 min-h-full">
            <SubscriptionClient tenant={tenant} initialInvoices={invoices || []} />
        </div>
    );
}
