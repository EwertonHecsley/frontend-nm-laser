import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/features/patients/components/patient-form";
import {
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

interface EditPatientPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editar paciente",
};

export default async function EditPatientPage({
  params,
}: EditPatientPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "patients:write")) {
    redirect(FORBIDDEN_PATH);
  }

  const { id } = await params;

  if (!id || id.length > 128) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar paciente"
        description="Atualize os dados cadastrais da paciente."
        actions={
          <Button variant="outline" asChild>
            <Link href="/patients">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <PatientForm mode="edit" patientId={id} />
    </div>
  );
}
