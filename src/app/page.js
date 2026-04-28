import LoginForm from "./LoginForm";
import { getActiveStaffUsers } from "./actions/auth";

export default async function Home() {
  const users = await getActiveStaffUsers();

  return <LoginForm users={users} />;
}
