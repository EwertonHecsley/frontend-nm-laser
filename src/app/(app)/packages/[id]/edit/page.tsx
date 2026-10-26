import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PackageForm } from "@/features/packages/components/package-form";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

interface EditPackagePageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editar pacote",
};

export default async function EditPackagePage({
  params,
}: EditPackagePageProps) {
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
        title="Editar pacote"
        description="Atualize as áreas e as sessões incluídas no pacote."
        actions={
          <Button variant="outline" asChild>
            <Link href="/packages">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <PackageForm mode="edit" packageId={id} />
    </div>
  );
}
