import type { ApiErrorBody } from "@/types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Dados inválidos. Revise os campos e tente novamente.",
  401: "Sua sessão expirou. Entre novamente para continuar.",
  403: "Você não tem permissão para executar esta ação.",
  404: "Registro não encontrado.",
  408: "A requisição demorou demais. Tente novamente.",
  409: "Já existe um registro com esses dados ou o horário está indisponível.",
  429: "Muitas tentativas. Aguarde um momento e tente novamente.",
  500: "Não foi possível concluir a operação. Tente novamente.",
  502: "O serviço está temporariamente indisponível.",
  503: "O serviço está temporariamente indisponível.",
};

function collectMessages(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectMessages);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectMessages);
  }

  return [];
}

export function extractApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const { message } = payload as Partial<ApiErrorBody>;
  const messages = collectMessages(message).filter(
    (item) => item !== "Internal server error",
  );

  return messages.length > 0 ? messages.join(" ") : null;
}

export function normalizeApiError(status: number, payload?: unknown): ApiError {
  const fallback =
    STATUS_MESSAGES[status] ??
    (status >= 500
      ? "Não foi possível concluir a operação. Tente novamente."
      : "Não foi possível concluir a operação.");

  const serverMessage =
    status === 401 || status === 403 || status >= 500
      ? null
      : extractApiMessage(payload);

  return new ApiError(serverMessage ?? fallback, status, payload);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.name !== "AbortError") {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}
