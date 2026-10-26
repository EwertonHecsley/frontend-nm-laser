import { redirect } from "next/navigation";

import { AreasView } from "@/features/areas/components/areas-view";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Áreas",
};

export default async function AreasPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return (
    <AreasView canManage={hasPermission(user.role, "catalog:manage")} />
  );
}
