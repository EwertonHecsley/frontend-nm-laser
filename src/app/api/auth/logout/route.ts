import { clearSessionCookies } from "@/lib/auth/cookies";
import { jsonError, isSameOriginRequest } from "@/lib/server/http";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return jsonError(403, "Origem da requisição não permitida.");
  }

  await clearSessionCookies();

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
