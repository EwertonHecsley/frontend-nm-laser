import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PackageForm } from "@/features/packages/components/package-form";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Novo pacote",
};

export default async function NewPackagePage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "catalog:manage")) {
    redirect(FORBIDDEN_PATH);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo pacote"
        description="Defina as áreas e a quantidade de sessões contratadas."
        actions={
          <Button variant="outline" asChild>
            <Link href="/packages">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <PackageForm mode="create" />
    </div>
  );
}
