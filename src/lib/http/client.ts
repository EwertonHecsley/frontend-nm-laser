import { API_BASE_PATH } from "@/lib/config/api";
import { ApiError, isAbortError, normalizeApiError } from "./errors";

type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export interface RequestOptions
  extends Omit<RequestInit, "body" | "headers" | "method"> {
  query?: QueryParams;
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/** Caminhos de autenticação que não devem tentar renovação em loop. */
const AUTH_PATHS = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
];

let refreshInFlight: Promise<boolean> | null = null;

function startRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_PATH}/auth/refresh`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => {
        return response.ok;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

function buildQueryString(query?: QueryParams): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const value of values) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      params.append(key, String(value));
    }
  }

  const serialized = params.toString();

  return serialized ? `?${serialized}` : "";
}

function createSignal(options: RequestOptions): AbortSignal {
  const timeout = AbortSignal.timeout(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  return options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
}

async function executeRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  options: RequestOptions,
): Promise<T> {
  const { body, headers: customHeaders, timeoutMs, ...init } = options;
  const headers = new Headers(customHeaders);

  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
      signal: createSignal({ ...options, timeoutMs }),
    });
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (isAbortError(error)) {
      throw new ApiError(
        "A requisição demorou demais. Tente novamente.",
        408,
      );
    }

    throw new ApiError(
      "Não foi possível conectar ao serviço. Verifique sua conexão.",
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && isLoginRequest) {
      throw new ApiError("E-mail ou senha inválidos.", 401, payload);
    }

    if (
      response.status === 401 &&
      !isLoginRequest &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("nm:unauthorized"));
    }

    throw normalizeApiError(response.status, payload);
  }

  return payload as T;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, "");
  const basePath = normalizedPath.startsWith("api/")
    ? `/${normalizedPath}`
    : `${API_BASE_PATH}/${normalizedPath}`;
  const url = `${basePath}${buildQueryString(options.query)}`;

  try {
    return await executeRequest<T>(method, url, options);
  } catch (error) {
    const isAuthPath = AUTH_PATHS.some((authPath) => url.includes(authPath));

    // Interceptor de renovação: um 401 em rota protegida dispara uma
    // única tentativa de renovar o access token via cookie de refresh.
    // Em caso de sucesso, a requisição original é reenviada.
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !isAuthPath &&
      !options.signal?.aborted &&
      typeof window !== "undefined"
    ) {
      const refreshed = await startRefresh();

      if (refreshed) {
        return executeRequest<T>(method, url, options);
      }
    }

    throw error;
  }
}

export const http = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>("GET", path, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("POST", path, { ...options, body });
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PATCH", path, { ...options, body });
  },
  delete<T = void>(path: string, options?: RequestOptions) {
    return request<T>("DELETE", path, options);
  },
};
