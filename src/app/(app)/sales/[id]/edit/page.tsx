import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SaleForm } from "@/features/sales/components/sale-form";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

interface EditSalePageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editar venda",
};

export default async function EditSalePage({ params }: EditSalePageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "sales:write")) {
    redirect(FORBIDDEN_PATH);
  }

  const { id } = await params;

  if (!id || id.length > 128) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar venda"
        description="Atualize o valor, o desconto ou o consultor responsável."
        actions={
          <Button variant="outline" asChild>
            <Link href="/sales">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <SaleForm mode="edit" saleId={id} />
    </div>
  );
}
