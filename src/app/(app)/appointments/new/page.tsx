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

export default async function NewAppointmentPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "appointments:write")) {
    redirect(FORBIDDEN_PATH);
  }

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
      <AppointmentForm mode="create" />
    </div>
  );
}
