import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/auth/constants";
import {
  decodeRefreshToken,
  isRefreshTokenFresh,
  getSessionMaxAge,
  REFRESH_MAX_AGE_SECONDS,
} from "@/lib/auth/jwt";
import { encodeSessionHint } from "@/lib/auth/session";
import type { AccessTokenPayload } from "@/types";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    priority: "high" as const,
  };
}

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string,
  payload: AccessTokenPayload,
): Promise<void> {
  const cookieStore = await cookies();
  const maxAge = getSessionMaxAge(payload);

  cookieStore.set(SESSION_COOKIE, accessToken, cookieOptions(maxAge));
  cookieStore.set(
    SESSION_HINT_COOKIE,
    encodeSessionHint(payload.sub),
    cookieOptions(maxAge),
  );
  cookieStore.set(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions(getRefreshMaxAge(refreshToken)),
  );
}

/**
 * O backend emite refresh tokens opacos (sem `exp` decodificável). Quando for
 * possível extrair a expiração, usamos o restante; caso contrário, o default
 * de 7 dias. A validade real é sempre conferida pelo backend.
 */
function getRefreshMaxAge(refreshToken: string): number {
  const payload = decodeRefreshToken(refreshToken);

  if (!isRefreshTokenFresh(payload) || !payload.exp) {
    return REFRESH_MAX_AGE_SECONDS;
  }

  const remaining = payload.exp - Math.floor(Date.now() / 1000);

  return Math.min(Math.max(remaining, 60), REFRESH_MAX_AGE_SECONDS);
}

export async function getSessionRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(REFRESH_COOKIE)?.value ?? null;
}

export async function setRefreshCookie(refreshToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions(getRefreshMaxAge(refreshToken)),
  );
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, "", cookieOptions(0));
  cookieStore.set(SESSION_HINT_COOKIE, "", cookieOptions(0));
  cookieStore.set(REFRESH_COOKIE, "", cookieOptions(0));
}
