import { redirect } from "next/navigation";

import { CitiesView } from "@/features/cities/components/cities-view";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Cidades",
};

export default async function CitiesPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return (
    <CitiesView canManage={hasPermission(user.role, "cities:manage")} />
  );
}
