import POSSidebar from "./components/POSSidebar";

export default function POSLayout({ children }) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
            <POSSidebar />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {children}
            </main>
        </div>
    );
}
