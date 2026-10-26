import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AreaForm } from "@/features/areas/components/area-form";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

interface EditAreaPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editar área",
};

export default async function EditAreaPage({ params }: EditAreaPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "catalog:manage")) {
    redirect(FORBIDDEN_PATH);
  }

  const { id } = await params;

  if (!id || id.length > 128) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar área"
        description="Atualize o nome da região tratada."
        actions={
          <Button variant="outline" asChild>
            <Link href="/areas">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <AreaForm mode="edit" areaId={id} />
    </div>
  );
}
