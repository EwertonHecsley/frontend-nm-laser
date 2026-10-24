import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CityForm } from "@/features/cities/components/city-form";
import {
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Nova cidade",
};

export default async function NewCityPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "cities:manage")) {
    redirect(FORBIDDEN_PATH);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova cidade"
        description="Cadastre uma cidade atendida pela clínica."
        actions={
          <Button variant="outline" asChild>
            <Link href="/cities">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <CityForm mode="create" />
    </div>
  );
}
