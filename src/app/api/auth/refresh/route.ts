import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/auth/constants";
import { encodeSessionHint } from "@/lib/auth/session";
import {
  decodeAccessToken,
  isAccessTokenFresh,
  getSessionMaxAge,
} from "@/lib/auth/jwt";
import { setRefreshCookie, clearSessionCookies } from "@/lib/auth/cookies";
import { backendFetch } from "@/lib/server/backend";
import { isSameOriginRequest, jsonError } from "@/lib/server/http";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return jsonError(403, "Origem da requisição não permitida.");
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value ?? null;

  if (!refreshToken) {
    await clearSessionCookies();
    return jsonError(401, "Sessão não encontrada ou expirada.");
  }

  try {
    const response = await backendFetch("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: request.signal,
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      await clearSessionCookies();

      if (response.status === 401) {
        return jsonError(401, "Sessão não encontrada ou expirada.");
      }

      return jsonError(502, "Não foi possível renovar a sessão.");
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as { accessToken?: unknown }).accessToken !== "string" ||
      typeof (payload as { refreshToken?: unknown }).refreshToken !==
        "string" ||
      !isValidOpaqueRefreshToken(
        (payload as { refreshToken?: unknown }).refreshToken,
      )
    ) {
      return jsonError(502, "Resposta de autenticação inválida.");
    }

    const { accessToken, refreshToken: newRefreshToken } = payload as {
      accessToken: string;
      refreshToken: string;
    };

    const tokenPayload = decodeAccessToken(accessToken);

    if (!isAccessTokenFresh(tokenPayload)) {
      return jsonError(502, "O serviço retornou uma sessão inválida.");
    }

    const maxAge = getSessionMaxAge(tokenPayload);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      priority: "high" as const,
    };

    cookieStore.set(
      SESSION_COOKIE,
      accessToken,
      { ...cookieOptions, maxAge },
    );
    cookieStore.set(
      SESSION_HINT_COOKIE,
      encodeSessionHint(tokenPayload.sub),
      { ...cookieOptions, maxAge },
    );
    setRefreshCookie(newRefreshToken);

    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }

    return jsonError(502, "Não foi possível conectar ao serviço.");
  }
}

const MIN_REFRESH_TOKEN_LENGTH = 20;
const MAX_REFRESH_TOKEN_LENGTH = 200;

function isValidOpaqueRefreshToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_REFRESH_TOKEN_LENGTH &&
    value.length <= MAX_REFRESH_TOKEN_LENGTH
  );
}
