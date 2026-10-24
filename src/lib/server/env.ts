const DEFAULT_BACKEND_API_URL = "http://localhost:3030";

export function getBackendApiUrl(): string {
  const raw = process.env.BACKEND_API_URL?.trim() || DEFAULT_BACKEND_API_URL;
  const url = new URL(raw);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("BACKEND_API_URL deve usar http ou https.");
  }

  return raw.replace(/\/+$/, "");
}
