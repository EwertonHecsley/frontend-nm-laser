import { getBackendApiUrl } from "@/lib/server/env";

const DEFAULT_TIMEOUT_MS = 15_000;

export async function backendFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${getBackendApiUrl()}/${path.replace(/^\/+/, "")}`;
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;

  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal,
  });
}
