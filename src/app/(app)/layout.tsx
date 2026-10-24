import { redirect } from "next/navigation";

import { SessionHydrator } from "@/components/providers/session-hydrator";
import { AppShell } from "@/components/layout/app-shell";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { getServerSession } from "@/lib/auth/session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return (
    <>
      <SessionHydrator user={user} />
      <AppShell user={user}>{children}</AppShell>
    </>
  );
}
