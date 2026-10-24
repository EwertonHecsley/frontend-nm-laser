const DEFAULT_API_BASE_PATH = "/api/backend";

/**
 * Caminho same-origin do BFF. O navegador nunca recebe a URL interna do
 * backend nem o access token.
 */
export const API_BASE_PATH = (
  process.env.NEXT_PUBLIC_API_BASE_PATH?.trim() || DEFAULT_API_BASE_PATH
).replace(/\/+$/, "");
