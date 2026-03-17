import POSClient from "./components/POSClient";
import { getPOSData } from "./actions/pos";
import { redirect } from "next/navigation";

export default async function POSPage() {
    const data = await getPOSData();

    if (!data.success) {
        // Redirection if No Active Session or Token Expires
        redirect("/");
    }

    return <POSClient initialData={data} />;
}
