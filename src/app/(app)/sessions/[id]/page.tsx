import { notFound, redirect } from "next/navigation";

import { SessionGroupDetailView } from "@/features/sessions/components/session-group-detail-view";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Tratamento pessoal",
};

interface SessionGroupPageProps {
  params: Promise<{ id?: string | string[] }>;
}

export default async function SessionGroupPage({
  params,
}: SessionGroupPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (!hasPermission(user.role, "sessions:read")) {
    redirect(FORBIDDEN_PATH);
  }

  const resolvedParams = await params;
  const rawId = Array.isArray(resolvedParams.id)
    ? resolvedParams.id[0]
    : resolvedParams.id;
  const groupId = rawId && rawId.length <= 128 ? rawId : "";

  if (!groupId) {
    notFound();
  }

  return (
    <SessionGroupDetailView
      groupId={groupId}
      canWrite={hasPermission(user.role, "sessions:write")}
      canDelete={hasPermission(user.role, "sessions:delete")}
      canCreateSale={hasPermission(user.role, "sales:write")}
    />
  );
}
