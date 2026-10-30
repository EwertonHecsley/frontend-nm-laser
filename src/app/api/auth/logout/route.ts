import { cookies } from "next/headers";

import { REFRESH_COOKIE } from "@/lib/auth/constants";
import { clearSessionCookies } from "@/lib/auth/cookies";
import { backendFetch } from "@/lib/server/backend";
import { jsonError, isSameOriginRequest } from "@/lib/server/http";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return jsonError(403, "Origem da requisição não permitida.");
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value ?? null;

  if (refreshToken) {
    try {
      // Revoga o refresh token no backend antes de limpar os cookies; a
      // falha aqui não impedirá o logout local.
      await backendFetch("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: request.signal,
      });
    } catch {
      // Ignoramos erros de rede para garantir o logout local.
    }
  }

  await clearSessionCookies();

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
