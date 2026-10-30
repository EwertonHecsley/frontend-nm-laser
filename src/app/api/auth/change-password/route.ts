import { z } from "zod";

import { clearSessionCookies } from "@/lib/auth/cookies";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { decodeAccessToken, isAccessTokenFresh } from "@/lib/auth/jwt";
import { backendFetch } from "@/lib/server/backend";
import { isSameOriginRequest, jsonError } from "@/lib/server/http";
import { cookies } from "next/headers";

const MAX_BODY_BYTES = 16 * 1024;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

function extractBackendMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const message = (payload as { message?: unknown }).message;
  const candidate =
    message && typeof message === "object" && !Array.isArray(message)
      ? (message as { message?: unknown }).message
      : message;

  if (typeof candidate === "string") {
    const trimmed = candidate.trim();

    return trimmed && trimmed !== "Bad Request" ? trimmed : null;
  }

  if (Array.isArray(candidate)) {
    const messages = candidate.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );

    return messages.length > 0 ? messages.join(" ") : null;
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return jsonError(403, "Origem da requisição não permitida.");
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return jsonError(415, "Envie os dados em JSON.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (contentLength > MAX_BODY_BYTES) {
    return jsonError(413, "Requisição muito grande.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "JSON inválido.");
  }

  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      400,
      "Informe a senha atual e uma nova senha com pelo menos 8 caracteres.",
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? decodeAccessToken(token) : null;

  if (!token || !session || !isAccessTokenFresh(session)) {
    await clearSessionCookies();
    return jsonError(401, "Sessão não encontrada ou expirada.");
  }

  try {
    const response = await backendFetch("/auth/change-password", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      }),
      signal: request.signal,
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        await clearSessionCookies();
        return jsonError(401, "Sessão não encontrada ou expirada.");
      }

      if (response.status === 429) {
        return jsonError(
          429,
          "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        );
      }

      if (response.status === 400) {
        return jsonError(
          400,
          extractBackendMessage(payload) ??
            "Não foi possível alterar a senha.",
        );
      }

      return jsonError(
        502,
        "Não foi possível alterar a senha. Tente novamente.",
      );
    }

    // O backend revoga todos os refresh tokens do usuário após trocar a
    // senha: encerramos a sessão local e pedimos novo login.
    await clearSessionCookies();

    return Response.json(
      {
        message:
          extractBackendMessage(payload) ??
          "Senha alterada com sucesso. Faça login novamente.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }

    return jsonError(502, "Não foi possível conectar ao serviço.");
  }
}
