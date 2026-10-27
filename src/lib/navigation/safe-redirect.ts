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

  const internalOrigin = "https://safe-redirect.invalid";

  try {
    const redirectUrl = new URL(value, internalOrigin);

    if (
      redirectUrl.origin !== internalOrigin ||
      redirectUrl.pathname.startsWith("/login")
    ) {
      return fallback;
    }

    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return fallback;
  }
}
