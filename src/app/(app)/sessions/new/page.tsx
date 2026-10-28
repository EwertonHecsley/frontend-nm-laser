import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SessionForm } from "@/features/sessions/components/session-form";
import {
  FORBIDDEN_PATH,
  LOGIN_PATH,
  SESSION_COOKIE,
} from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";
import { backendFetch } from "@/lib/server/backend";
import type { AuthUser } from "@/types";

export const metadata = {
  title: "Nova sessão",
};

async function withCurrentName(user: AuthUser): Promise<AuthUser> {
  if (user.role !== "aplicadora" || user.name !== user.email) {
    return user;
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return user;
  }

  try {
    const response = await backendFetch("auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return user;
    }

    const payload = (await response.json()) as { name?: unknown };

    return typeof payload.name === "string"
      ? { ...user, name: payload.name }
      : user;
  } catch {
    return user;
  }
}

interface NewSessionPageProps {
  searchParams: Promise<{
    patientId?: string | string[];
    saleId?: string | string[];
    groupId?: string | string[];
  }>;
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
  const getParam = (value?: string | string[]) => {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw && raw.length <= 128 ? raw : "";
  };
  const initialPatientId = getParam(params.patientId);
  const initialSaleId = getParam(params.saleId);
  const initialGroupId = getParam(params.groupId);
  const currentUser = await withCurrentName(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova sessão"
        description="Registre a sessão realizada e os parâmetros técnicos."
        actions={
          <Button variant="outline" asChild>
            <Link
              href={
                initialGroupId
                  ? `/sessions/${encodeURIComponent(initialGroupId)}`
                  : "/sessions"
              }
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <SessionForm
        currentUser={currentUser}
        initialPatientId={initialPatientId}
        initialSaleId={initialSaleId}
        initialGroupId={initialGroupId}
        canCreateSale={hasPermission(user.role, "sales:write")}
      />
    </div>
  );
}
