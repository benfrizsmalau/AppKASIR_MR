import SignUpClient from "./components/SignUpClient";
import { proceedRegistration, checkSubdomain } from "./actions";

export const metadata = {
    title: "Daftar AppKasir | Platform SaaS Terpadu",
    description: "Mulai masa trial gratis 14 hari",
};

export default function DaftarPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <SignUpClient />
        </div>
    );
}
