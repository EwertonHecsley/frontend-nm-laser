import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/features/users/components/user-form";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editar integrante",
};

export default async function EditUserPage({ params }: EditUserPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "users:manage")) {
    redirect(FORBIDDEN_PATH);
  }

  const { id } = await params;

  if (!id || id.length > 128) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar integrante"
        description="Atualize os dados, o perfil ou a senha de acesso."
        actions={
          <Button variant="outline" asChild>
            <Link href="/users">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <UserForm mode="edit" userId={id} />
    </div>
  );
}
