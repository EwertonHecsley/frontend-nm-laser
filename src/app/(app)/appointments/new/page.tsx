import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import {
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Novo agendamento",
};

interface NewAppointmentPageProps {
  searchParams: Promise<{ patientId?: string | string[] }>;
}

export default async function NewAppointmentPage({
  searchParams,
}: NewAppointmentPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "appointments:create")) {
    redirect(FORBIDDEN_PATH);
  }

  const params = await searchParams;
  const rawPatientId = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId;
  const initialPatientId =
    rawPatientId && rawPatientId.length <= 128 ? rawPatientId : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo agendamento"
        description="Reserve um horário para a paciente em uma cidade atendida."
        actions={
          <Button variant="outline" asChild>
            <Link href="/appointments">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <AppointmentForm
        mode="create"
        initialPatientId={initialPatientId}
        currentUserId={user.id}
        currentUserEmail={user.email}
      />
    </div>
  );
}
