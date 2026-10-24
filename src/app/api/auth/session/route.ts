import { getServerSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/server/http";

export async function GET(): Promise<Response> {
  const user = await getServerSession();

  if (!user) {
    return jsonError(401, "Sessão não encontrada ou expirada.");
  }

  return Response.json(
    { user },
    { headers: { "Cache-Control": "no-store" } },
  );
}
