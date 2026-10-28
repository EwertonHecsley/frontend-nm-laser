import { cookies } from "next/headers";

import { decodeAccessToken, isAccessTokenFresh } from "@/lib/auth/jwt";
import {
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
} from "@/lib/auth/constants";
import type { AuthUser } from "@/types";

export function encodeSessionHint(email: string): string {
  return Buffer.from(JSON.stringify({ email }), "utf8").toString("base64url");
}

export function decodeSessionHint(value: string | undefined): string {
  if (!value) {
    return "";
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as { email?: unknown };

    return typeof parsed.email === "string" ? parsed.email : "";
  } catch {
    return "";
  }
}

export async function getServerSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = token ? decodeAccessToken(token) : null;

  if (!isAccessTokenFresh(payload)) {
    return null;
  }

  const email = decodeSessionHint(
    cookieStore.get(SESSION_HINT_COOKIE)?.value,
  );

  return {
    id: payload.sub,
    name: payload.name || email,
    role: payload.role,
    email,
  };
}
