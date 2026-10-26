import { redirect } from "next/navigation";

import { PackagesView } from "@/features/packages/components/packages-view";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Pacotes",
};

export default async function PackagesPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return (
    <PackagesView canManage={hasPermission(user.role, "catalog:manage")} />
  );
}
