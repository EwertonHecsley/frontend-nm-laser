import type { Role } from "@/types";

interface RouteAccessRule {
  pattern: RegExp;
  roles: readonly Role[];
}

/**
 * Regras de experiência de navegação. A API continua sendo a autoridade de
 * autorização; o proxy apenas evita renderizar telas de escrita sem perfil.
 */
const ROUTE_ACCESS_RULES: readonly RouteAccessRule[] = [
  { pattern: /^\/cities\/new\/?$/, roles: ["gestora"] },
  { pattern: /^\/cities\/[^/]+\/edit\/?$/, roles: ["gestora"] },
];

export function getAllowedRoles(pathname: string): readonly Role[] | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const rule = ROUTE_ACCESS_RULES.find(({ pattern }) =>
    pattern.test(normalized),
  );

  return rule?.roles ?? null;
}
