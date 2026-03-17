import StaffClient from "./components/StaffClient";
import { getStaffList } from "./actions";

export const metadata = {
    title: "Manajemen Pengguna | AppKasir",
};

export default async function StaffPage() {
    const res = await getStaffList();

    return (
        <div className="flex-1 h-full bg-gray-50 flex flex-col overflow-hidden">
            <StaffClient initialStaff={res.success && res.staff ? res.staff : []} />
        </div>
    );
}
