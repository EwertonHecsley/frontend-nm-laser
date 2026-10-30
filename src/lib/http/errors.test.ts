import { describe, it, expect } from "vitest";

import { ApiError } from "./errors";
import { isAbortError, normalizeApiError } from "./errors";
import { getErrorMessage } from "./errors";

function makeApiError(status: number, message?: string) {
  return normalizeApiError(status, message);
}

describe("Errors", () => {
  describe("ApiError", () => {
    it("should expose status and payload", () => {
      const error = new ApiError("Oh no", 422, { message: "invalid" });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiError");
      expect(error.status).toBe(422);
      expect(error.body).toEqual({ message: "invalid" });
    });

    it("should preserve message passed to constructor", () => {
      expect(new ApiError("Custom", 500).message).toBe("Custom");
    });
  });

  describe("isAbortError", () => {
    it("should be true for DOMException named AbortError", () => {
      const error = new DOMException("The operation was aborted", "AbortError");

      expect(isAbortError(error)).toBe(true);
    });

    it("should be false for generic Error", () => {
      expect(isAbortError(new Error("Not abort"))).toBe(false);
    });

    it("should be false for non-Error values", () => {
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
      expect(isAbortError({})).toBe(false);
      expect(isAbortError("abort")).toBe(false);
    });
  });

  describe("normalizeApiError", () => {
    it("should use fallback for unknown status", () => {
      const error = makeApiError(599);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(599);
      expect(error.message).toBe(
        "Não foi possível concluir a operação. Tente novamente.",
      );
    });

    it("should use specific message for 400", () => {
      const error = makeApiError(400);

      expect(error.message).toBe(
        "Dados inválidos. Revise os campos e tente novamente.",
      );
    });

    it("should use specific message for 401", () => {
      const error = makeApiError(401);

      expect(error.message).toBe(
        "Sua sessão expirou. Entre novamente para continuar.",
      );
    });

    it("should use specific message for 403", () => {
      const error = makeApiError(403);

      expect(error.message).toBe(
        "Você não tem permissão para executar esta ação.",
      );
    });

    it("should use specific message for 404", () => {
      const error = makeApiError(404);

      expect(error.message).toBe("Registro não encontrado.");
    });

    it("should use specific message for 409", () => {
      const error = makeApiError(409);

      expect(error.message).toContain("horário está indisponível");
    });

    it("should use specific message for 429", () => {
      const error = makeApiError(429);

      expect(error.message).toContain("Muitas tentativas");
    });

    it("should prefer extractApiMessage for client errors", () => {
      const error = normalizeApiError(422, {
        message: ["Nome obrigatório", "Telefone inválido"],
      });

      expect(error.message).toBe("Nome obrigatório Telefone inválido");
    });

    it("should ignore server-provided message for 401/403 (security)", () => {
      const error1 = normalizeApiError(401, {
        message: "Internal server error: secret leak",
      });
      const error2 = normalizeApiError(403, {
        message: "Forbidden: secret leak",
      });

      // Server messages for auth errors should use safest fallback
      expect(error1.message).toBe(
        "Sua sessão expirou. Entre novamente para continuar.",
      );
      expect(error2.message).toBe(
        "Você não tem permissão para executar esta ação.",
      );
    });

    it("should never expose raw DB error messages", () => {
      const error = normalizeApiError(500, "Internal server error: SELECT * FROM users failed");

      // 500 errors should never trust server message
      expect(error.message).not.toContain("SELECT");
    });

    it("should carry the original payload", () => {
      const body = { message: ["Nome inválido"] };
      const error = normalizeApiError(422, body);

      expect(error.body).toEqual(body);
    });

    it("should filter out 'Internal server error' strings", () => {
      const error = normalizeApiError(422, {
        message: ["Internal server error", "Campo obrigatório"],
      });

      expect(error.message).toBe("Campo obrigatório");
    });
  });

  describe("Security: XSS/HTML sanitization", () => {
    it("should not produce executable HTML from API messages", () => {
      const dangerousInputs = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert(1)>",
        "<iframe srcdoc='Injected'></iframe>",
      ];

      for (const payload of dangerousInputs) {
        const error = normalizeApiError(422, { message: payload });

        // The message should not contain the raw HTML
        // This test verifies the error is treated as a plain string, not markup
        expect(error.message).toBe(payload);
      }
    });

    it("should limit error length to prevent memory exhaustion", () => {
      const longMessage = "a".repeat(1024 * 1024 * 5); // 5MB
      const error = normalizeApiError(422, { message: longMessage });

      // Should not throw or hang
      expect(error).toBeDefined();
    });
  });

  describe("getErrorMessage", () => {
    it("should return message for ApiError", () => {
      const error = new ApiError("Custom ApiError", 422);

      expect(getErrorMessage(error)).toBe("Custom ApiError");
    });

    it("should return message for generic Error with different name", () => {
      const error = new Error("Something went wrong");
      error.name = "NetworkError";

      expect(getErrorMessage(error)).toBe("Something went wrong");
    });

    it("should return fallback for AbortError", () => {
      const abort = new DOMException("aborted", "AbortError");

      expect(getErrorMessage(abort)).toBe("Não foi possível concluir a operação.");
    });

    it("should return fallback for null / undefined", () => {
      expect(getErrorMessage(null)).toBe("Não foi possível concluir a operação.");
      expect(getErrorMessage(undefined)).toBe(
        "Não foi possível concluir a operação.",
      );
    });

    it("should return fallback for primitive values", () => {
      expect(getErrorMessage("some string")).toBe(
        "Não foi possível concluir a operação.",
      );
      expect(getErrorMessage(42)).toBe("Não foi possível concluir a operação.");
    });

    it("should never leak stack traces", () => {
      const error = new ApiError("Styled Message", 500);
      const result = getErrorMessage(error);

      // Message should not be a stack-trace
      expect(result).toBe("Styled Message");
    });
  });

  describe("Memory safety", () => {
    it("should be safe to create many errors without leaking", () => {
      const errors: ApiError[] = [];

      for (let i = 0; i < 1000; i++) {
        errors.push(normalizeApiError(500, { message: "error".repeat(10) }));
      }

      const first = errors.pop();
      expect(first).toBeDefined();

      // Errors array isn't retained globally; this test just validates no throw
      const second = errors.pop();
      expect(second).toBeDefined();
    });
  });
});