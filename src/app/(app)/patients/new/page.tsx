import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/features/patients/components/patient-form";
import {
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Novo paciente",
};

export default async function NewPatientPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "patients:write")) {
    redirect(FORBIDDEN_PATH);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo paciente"
        description="Cadastre a paciente para vincular agendamentos e sessões."
        actions={
          <Button variant="outline" asChild>
            <Link href="/patients">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <PatientForm mode="create" />
    </div>
  );
}
