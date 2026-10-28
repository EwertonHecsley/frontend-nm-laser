import { redirect } from "next/navigation";

import { SalesView } from "@/features/sales/components/sales-view";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Vendas",
};

interface SalesPageProps {
  searchParams: Promise<{ patientId?: string | string[] }>;
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "sales:read")) {
    redirect(FORBIDDEN_PATH);
  }

  const params = await searchParams;
  const rawPatientId = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId;
  const initialPatientId =
    rawPatientId && rawPatientId.length <= 128 ? rawPatientId : "";

  return (
    <SalesView
      initialPatientId={initialPatientId}
      canWrite={hasPermission(user.role, "sales:write")}
      role={user.role}
      userId={user.id}
    />
  );
}
