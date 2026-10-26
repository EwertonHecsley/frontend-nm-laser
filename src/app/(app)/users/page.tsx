import { redirect } from "next/navigation";

import { UsersView } from "@/features/users/components/users-view";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Equipe",
};

export default async function UsersPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "users:read")) {
    redirect(FORBIDDEN_PATH);
  }

  return <UsersView />;
}
