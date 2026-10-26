import { notFound, redirect } from "next/navigation";

import { SessionGroupDetailView } from "@/features/sessions/components/session-group-detail-view";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Sessão mãe",
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
      canCreateSale={hasPermission(user.role, "sales:write")}
    />
  );
}
