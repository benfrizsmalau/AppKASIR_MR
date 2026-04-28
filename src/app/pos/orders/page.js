import { getActiveOrders } from '../actions/activeOrders';
import ActiveOrdersClient from './ActiveOrdersClient';

export default async function ActiveOrdersPage() {
    const { success, orders, message, outlet } = await getActiveOrders();

    return <ActiveOrdersClient initialOrders={success ? orders : []} error={message} outlet={outlet} />;
}
