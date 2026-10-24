import { redirect } from "next/navigation";

import { PatientsView } from "@/features/patients/components/patients-view";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Pacientes",
};

export default async function PatientsPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return (
    <PatientsView
      canWrite={hasPermission(user.role, "patients:write")}
      canDelete={hasPermission(user.role, "patients:delete")}
    />
  );
}
