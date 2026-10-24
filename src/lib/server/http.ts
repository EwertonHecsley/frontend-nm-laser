export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");

  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}

export function jsonError(status: number, message: string): Response {
  return Response.json(
    {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
