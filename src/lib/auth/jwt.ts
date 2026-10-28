import { isRole, type AccessTokenPayload } from "@/types";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

/**
 * Decodifica o payload sem verificar a assinatura. A verificação é sempre
 * responsabilidade do backend; aqui usamos apenas `sub`/`role`/`exp` para
 * experiência de navegação e para descartar sessões visivelmente expiradas.
 */
export function decodeAccessToken(token: string): AccessTokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as Record<
      string,
      unknown
    >;

    if (typeof payload.sub !== "string" || !isRole(payload.role)) {
      return null;
    }

    return {
      sub: payload.sub,
      role: payload.role,
      name: typeof payload.name === "string" ? payload.name : undefined,
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}

export function isAccessTokenFresh(
  payload: AccessTokenPayload | null,
  nowInSeconds = Math.floor(Date.now() / 1000),
): payload is AccessTokenPayload {
  return Boolean(payload && (!payload.exp || payload.exp > nowInSeconds));
}

export function getSessionMaxAge(payload: AccessTokenPayload): number {
  if (!payload.exp) {
    return 60 * 60 * 24;
  }

  const remaining = payload.exp - Math.floor(Date.now() / 1000);

  return Math.min(Math.max(remaining, 60), 60 * 60 * 24);
}
