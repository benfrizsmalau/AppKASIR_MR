import SecurityClient from "./components/SecurityClient";
import { getSecurityData } from "./actions";

export const metadata = {
    title: "Keamanan Akun | AppKasir Portal",
};

export default async function KeamananPage() {
    const data = await getSecurityData();

    return (
        <div className="p-10 bg-gray-50/50 min-h-screen">
            <SecurityClient
                initial2FA={data.twoFactorEnabled}
                initialSessions={data.sessions || []}
            />
        </div>
    );
}
