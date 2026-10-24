import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
} from "@/lib/auth/constants";
import { getSessionMaxAge } from "@/lib/auth/jwt";
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
  token: string,
  email: string,
  payload: AccessTokenPayload,
): Promise<void> {
  const cookieStore = await cookies();
  const maxAge = getSessionMaxAge(payload);

  cookieStore.set(SESSION_COOKIE, token, cookieOptions(maxAge));
  cookieStore.set(
    SESSION_HINT_COOKIE,
    encodeSessionHint(email),
    cookieOptions(maxAge),
  );
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, "", cookieOptions(0));
  cookieStore.set(SESSION_HINT_COOKIE, "", cookieOptions(0));
}
