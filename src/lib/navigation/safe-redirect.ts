/**
 * Evita open redirect: só aceita caminhos internos absolutos.
 */
export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.startsWith("/login")) {
    return fallback;
  }

  return value;
}
