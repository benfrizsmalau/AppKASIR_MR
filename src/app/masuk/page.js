import SignInClient from "./components/SignInClient";

export const metadata = {
    title: "Masuk Portal Pemilik | AppKasir",
    description: "Login dashboard manajemen usaha",
};

export default function SignInPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <SignInClient />
        </div>
    );
}
