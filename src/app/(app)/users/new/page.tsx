import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/features/users/components/user-form";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Novo integrante",
};

export default async function NewUserPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "users:manage")) {
    redirect(FORBIDDEN_PATH);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo integrante"
        description="Cadastre uma aplicadora, vendedor(a) ou outro subordinado."
        actions={
          <Button variant="outline" asChild>
            <Link href="/users">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <UserForm mode="create" />
    </div>
  );
}
