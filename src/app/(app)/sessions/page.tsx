import { redirect } from "next/navigation";

import { SessionsView } from "@/features/sessions/components/sessions-view";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Sessões",
};

interface SessionsPageProps {
  searchParams: Promise<{ patientId?: string | string[] }>;
}

export default async function SessionsPage({
  searchParams,
}: SessionsPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  const params = await searchParams;
  const rawPatientId = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId;
  const initialPatientId =
    rawPatientId && rawPatientId.length <= 128 ? rawPatientId : "";

  return (
    <SessionsView
      initialPatientId={initialPatientId}
      canWrite={hasPermission(user.role, "sessions:write")}
      canCreateSale={hasPermission(user.role, "sales:write")}
      canSchedule={hasPermission(user.role, "appointments:write")}
    />
  );
}
