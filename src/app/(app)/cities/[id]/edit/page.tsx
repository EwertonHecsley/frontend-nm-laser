import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CityForm } from "@/features/cities/components/city-form";
import {
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

interface EditCityPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editar cidade",
};

export default async function EditCityPage({ params }: EditCityPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "cities:manage")) {
    redirect(FORBIDDEN_PATH);
  }

  const { id } = await params;

  if (!id || id.length > 128) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar cidade"
        description="Atualize o nome exibido nos cadastros da clínica."
        actions={
          <Button variant="outline" asChild>
            <Link href="/cities">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <CityForm mode="edit" cityId={id} />
    </div>
  );
}
