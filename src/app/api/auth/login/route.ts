import { z } from "zod";

import { setSessionCookies } from "@/lib/auth/cookies";
import { decodeAccessToken, isAccessTokenFresh } from "@/lib/auth/jwt";
import { extractApiMessage } from "@/lib/http/errors";
import { sanitizeEmail } from "@/lib/security/sanitize";
import { backendFetch } from "@/lib/server/backend";
import { jsonError, isSameOriginRequest } from "@/lib/server/http";
import type { LoginResponse } from "@/types";

const MIN_REFRESH_TOKEN_LENGTH = 20;
const MAX_REFRESH_TOKEN_LENGTH = 200;

function isValidOpaqueRefreshToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_REFRESH_TOKEN_LENGTH &&
    value.length <= MAX_REFRESH_TOKEN_LENGTH
  );
}

const MAX_BODY_BYTES = 16 * 1024;

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(6).max(200),
});

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

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      400,
      "Informe um e-mail válido e uma senha com pelo menos 6 caracteres.",
    );
  }

  const email = sanitizeEmail(parsed.data.email);

  try {
    const response = await backendFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: parsed.data.password }),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        return jsonError(401, "E-mail ou senha inválidos.");
      }

      if (response.status === 429) {
        return jsonError(
          429,
          "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
        );
      }

      if (response.status >= 500) {
        return jsonError(502, "O serviço de autenticação está indisponível.");
      }

      return jsonError(
        response.status === 400 ? 400 : 502,
        extractApiMessage(payload) ?? "Não foi possível entrar.",
      );
    }

    const loginResponse = payload as LoginResponse | null;

    if (!loginResponse || typeof loginResponse.accessToken !== "string") {
      return jsonError(502, "Resposta de autenticação inválida.");
    }

    if (!isValidOpaqueRefreshToken(loginResponse.refreshToken)) {
      return jsonError(502, "Resposta de autenticação inválida.");
    }

    const tokenPayload = decodeAccessToken(loginResponse.accessToken);

    if (!isAccessTokenFresh(tokenPayload)) {
      return jsonError(502, "O serviço retornou uma sessão inválida.");
    }

    await setSessionCookies(
      loginResponse.accessToken,
      loginResponse.refreshToken,
      tokenPayload,
    );

    return Response.json(
      {
        user: {
          id: tokenPayload.sub,
          name: tokenPayload.name ?? email,
          email,
          role: tokenPayload.role,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return jsonError(502, "Não foi possível conectar ao serviço.");
  }
}
