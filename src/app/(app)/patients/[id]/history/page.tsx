import { notFound, redirect } from "next/navigation";

import { PatientHistoryView } from "@/features/patients/components/patient-history-view";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Histórico do cliente",
};

interface PatientHistoryPageProps {
  params: Promise<{ id?: string | string[] }>;
}

export default async function PatientHistoryPage({
  params,
}: PatientHistoryPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "patients:read")) {
    redirect(FORBIDDEN_PATH);
  }

  const resolvedParams = await params;
  const rawId = Array.isArray(resolvedParams.id)
    ? resolvedParams.id[0]
    : resolvedParams.id;
  const patientId = rawId && rawId.length <= 128 ? rawId : "";

  if (!patientId) {
    notFound();
  }

  return <PatientHistoryView patientId={patientId} />;
}
