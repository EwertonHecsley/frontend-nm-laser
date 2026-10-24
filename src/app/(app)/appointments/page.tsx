import { redirect } from "next/navigation";

import { AppointmentsView } from "@/features/appointments/components/appointments-view";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Agendamentos",
};

export default async function AppointmentsPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return (
    <AppointmentsView
      canWrite={hasPermission(user.role, "appointments:write")}
    />
  );
}
