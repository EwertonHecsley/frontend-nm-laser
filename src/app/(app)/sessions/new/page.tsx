import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SessionForm } from "@/features/sessions/components/session-form";
import {
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Nova sessão",
};

interface NewSessionPageProps {
  searchParams: Promise<{ patientId?: string | string[] }>;
}

export default async function NewSessionPage({
  searchParams,
}: NewSessionPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "sessions:write")) {
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
        title="Nova sessão"
        description="Registre a sessão realizada e os parâmetros técnicos."
        actions={
          <Button variant="outline" asChild>
            <Link href="/sessions">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <SessionForm initialPatientId={initialPatientId} />
    </div>
  );
}
