import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import {
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

interface EditAppointmentPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editar agendamento",
};

export default async function EditAppointmentPage({
  params,
}: EditAppointmentPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "appointments:write")) {
    redirect(FORBIDDEN_PATH);
  }

  const { id } = await params;

  if (!id || id.length > 128) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar agendamento"
        description="Atualize os dados do atendimento e o status."
        actions={
          <Button variant="outline" asChild>
            <Link href="/appointments">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <AppointmentForm mode="edit" appointmentId={id} />
    </div>
  );
}
