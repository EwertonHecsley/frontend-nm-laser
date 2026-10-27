import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

import { clearSessionCookies } from "@/lib/auth/cookies";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { decodeAccessToken, isAccessTokenFresh } from "@/lib/auth/jwt";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { jsonError, isSameOriginRequest } from "@/lib/server/http";
import { backendFetch } from "@/lib/server/backend";

const ALLOWED_RESOURCES = new Set([
  "cities",
  "patients",
  "appointments",
  "sessions",
  "areas",
  "packages",
  "sales",
  "users",
]);

const READ_PERMISSIONS: Partial<Record<string, Permission>> = {
  users: "users:read",
};

const METHOD_PERMISSIONS: Record<
  string,
  Partial<Record<"POST" | "PATCH" | "DELETE", Permission>>
> = {
  cities: {
    POST: "cities:manage",
    PATCH: "cities:manage",
    DELETE: "cities:manage",
  },
  patients: {
    POST: "patients:write",
    PATCH: "patients:write",
    DELETE: "patients:delete",
  },
  appointments: {
    POST: "appointments:write",
    PATCH: "appointments:write",
    DELETE: "appointments:delete",
  },
  sessions: {
    POST: "sessions:write",
    PATCH: "sessions:write",
    DELETE: "sessions:delete",
  },
  areas: {
    POST: "catalog:manage",
    PATCH: "catalog:manage",
    DELETE: "catalog:manage",
  },
  packages: {
    POST: "catalog:manage",
    PATCH: "catalog:manage",
    DELETE: "catalog:manage",
  },
  sales: {
    POST: "sales:write",
    PATCH: "sales:write",
    DELETE: "sales:delete",
  },
  users: {
    POST: "users:manage",
    PATCH: "users:manage",
    DELETE: "users:manage",
  },
};

const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_PATH_SEGMENT_LENGTH = 128;

type RouteContext = { params: Promise<{ path: string[] }> };
type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

async function handle(
  method: HttpMethod,
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? decodeAccessToken(token) : null;

  if (!token || !session || !isAccessTokenFresh(session)) {
    await clearSessionCookies();
    return jsonError(401, "Sessão não encontrada ou expirada.");
  }

  const { path } = await context.params;
  const [resource, ...rest] = path;

  if (
    !resource ||
    !ALLOWED_RESOURCES.has(resource) ||
    rest.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.length > MAX_PATH_SEGMENT_LENGTH ||
        segment.includes("/") ||
        segment.includes("\\"),
    )
  ) {
    return jsonError(404, "Recurso não encontrado.");
  }

  if (method === "GET") {
    const requiredPermission = READ_PERMISSIONS[resource];

    if (
      requiredPermission &&
      !hasPermission(session.role, requiredPermission)
    ) {
      return jsonError(403, "Você não tem permissão para executar esta ação.");
    }
  } else {
    const requiredPermission = METHOD_PERMISSIONS[resource]?.[method];

    if (!requiredPermission) {
      return jsonError(405, "Método não permitido para este recurso.");
    }

    if (!hasPermission(session.role, requiredPermission)) {
      return jsonError(403, "Você não tem permissão para executar esta ação.");
    }
  }

  if (method !== "GET" && !isSameOriginRequest(request)) {
    return jsonError(403, "Origem da requisição não permitida.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  let body: ArrayBuffer | undefined;

  if (method !== "GET") {
    const contentType = request.headers.get("content-type") ?? "";
    const hasJsonContentType = contentType.includes("application/json");
    const contentLength = Number(request.headers.get("content-length") ?? "0");

    if (contentLength > MAX_BODY_BYTES) {
      return jsonError(413, "Requisição muito grande.");
    }

    if (!hasJsonContentType && (method !== "DELETE" || contentLength > 0)) {
      return jsonError(415, "Envie os dados em JSON.");
    }

    body = await request.arrayBuffer();

    if (body.byteLength > MAX_BODY_BYTES) {
      return jsonError(413, "Requisição muito grande.");
    }

    if (body.byteLength > 0) {
      if (!hasJsonContentType) {
        return jsonError(415, "Envie os dados em JSON.");
      }

      headers["Content-Type"] = "application/json";
    } else {
      body = undefined;
    }
  }

  const upstreamPath = [resource, ...rest]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const upstreamUrl = `${upstreamPath}${request.nextUrl.search}`;

  try {
    const response = await backendFetch(upstreamUrl, {
      method,
      headers,
      body,
      signal: request.signal,
    });

    if (response.status === 401) {
      await clearSessionCookies();
    }

    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const contentType = response.headers.get("content-type");

    if (contentType) {
      responseHeaders.set("Content-Type", contentType);
    }

    const payload = await response.arrayBuffer();

    return new Response(payload.byteLength > 0 ? payload : null, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }

    return jsonError(502, "O serviço está temporariamente indisponível.");
  }
}

export function GET(request: NextRequest, context: RouteContext) {
  return handle("GET", request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return handle("POST", request, context);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return handle("PATCH", request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return handle("DELETE", request, context);
}
