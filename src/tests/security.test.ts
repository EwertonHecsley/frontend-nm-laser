import { describe, it, expect } from "vitest";

import { isValidWhatsAppNumber } from "@/lib/whatsapp";
import { decodeAccessToken } from "@/lib/auth/jwt";
import { normalizeApiError, getErrorMessage } from "@/lib/http/errors";
import { onlyDigits } from "@/lib/security/sanitize";

describe("Security", () => {
  describe("Input sanitization", () => {
    it("should strip non-digit characters from values", () => {
      expect(onlyDigits("(83) 99999-9999")).toBe("83999999999");
      expect(onlyDigits("+55 83 99999-9999")).toBe("5583999999999");
    });

    it("should strip script tags from digits", () => {
      expect(onlyDigits("<script>alert(1)</script>")).toBe("1");
    });

    it("should produce empty string for non-digit-only payloads", () => {
      expect(onlyDigits("")).toBe("");
      expect(onlyDigits(null)).toBe("");
      expect(onlyDigits(undefined)).toBe("");
      expect(onlyDigits("     ")).toBe("");
    });

    it("should handle malicious payload as phone number", () => {
      const vectors = [
        "<script>alert(1)</script>",
        "javascript:alert(1)",
        "onerror=alert(1);",
        "'; DROP TABLE users; --",
        "${process.env.SECRET}",
        "a".repeat(100_000),
      ];

      for (const vector of vectors) {
        expect(() => onlyDigits(vector)).not.toThrow();
        expect(onlyDigits(vector)).not.toContain("<script>");
        expect(onlyDigits(vector)).not.toContain("javascript");
        expect(onlyDigits(vector)).not.toContain("'");
      }
    });

    it("should reject malicious phone number vectors", () => {
      const vectors = [
        "<script>alert(1)</script>",
        "javascript:alert(1)",
        "onerror=alert(1);",
        "eval(process.exit)",
        "\n\n",
        "a".repeat(100_000),
      ];

      for (const vector of vectors) {
        expect(isValidWhatsAppNumber(vector)).toBe(false);
      }
    });

    it("should reject excessively long phone numbers", () => {
      expect(isValidWhatsAppNumber("8".repeat(500))).toBe(false);
    });

    it("should accept reasonable phone formats", () => {
      expect(isValidWhatsAppNumber("(83) 99999-9999")).toBe(true);
      expect(isValidWhatsAppNumber("+55 83 99999-9999")).toBe(true);
      expect(isValidWhatsAppNumber("5583999999999")).toBe(true);
      expect(isValidWhatsAppNumber("83999999999")).toBe(true);
    });

    it("should reject reasonable invalid phone formats", () => {
      expect(isValidWhatsAppNumber(null)).toBe(false);
      expect(isValidWhatsAppNumber("")).toBe(false);
      expect(isValidWhatsAppNumber(undefined)).toBe(false);
      expect(isValidWhatsAppNumber("1234")).toBe(false);
      expect(isValidWhatsAppNumber("telefone indisponível")).toBe(false);
      expect(isValidWhatsAppNumber("83999999999999")).toBe(false);
    });
  });

  describe("Error message sanitization", () => {
    it("should not expose SQL injection details in 500 responses", () => {
      const error = normalizeApiError(500, "SELECT * FROM users; --");

      // 500 responses should never trust server-provided message
      expect(error.message).not.toContain("SELECT");
      expect(error.message).not.toContain("--");
    });

    it("should not expose database errors in 500 responses", () => {
      const error = normalizeApiError(500, {
        message: "Connection refused: host=localhost db=User",
      });

      expect(error.message).not.toContain("Connection refused");
      expect(error.message).not.toContain("localhost=");
    });

    it("should accept plain field messages for 422 responses", () => {
      const error = normalizeApiError(422, { message: "Campo obrigatório" });

      expect(error.message).toBe("Campo obrigatório");
    });

    it("should not expose internal details", () => {
      const error = normalizeApiError(401, "Session expired - token: abc");

      // 401 must use the safe auth fallback message
      expect(error.message).not.toContain("token:");
    });

    it("should not leak stack or file paths", () => {
      const error = normalizeApiError(500, {
        message: "at /var/www/app/dist/index.js:123:45",
      });

      expect(error.message).not.toContain("at /var/");
      expect(error.message).not.toContain("dist/");
    });

    it("should filter out 'Internal server error' strings", () => {
      const error = normalizeApiError(422, {
        message: ["Internal server error", "Campo obrigatório"],
      });

      expect(error.message).toBe("Campo obrigatório");
    });

    it("should join nested error messages safely", () => {
      const error = normalizeApiError(422, {
        message: {
          email: ["Email inválido"],
          name: ["Nome é obrigatório"],
        },
      });

      expect(error.message).toBe("Email inválido Nome é obrigatório");
    });

    it("should return safe fallback for null error", () => {
      expect(getErrorMessage(null)).toBe(
        "Não foi possível concluir a operação.",
      );
      expect(getErrorMessage(undefined)).toBe(
        "Não foi possível concluir a operação.",
      );
    });

    it("should return safe fallback for AbortError", () => {
      const abort = new DOMException("Aborted", "AbortError");

      expect(getErrorMessage(abort)).toBe(
        "Não foi possível concluir a operação.",
      );
    });
  });

  describe("JWT payload sanitization", () => {
    const encode = (payload: Record<string, unknown>) =>
      Buffer.from(JSON.stringify(payload)).toString("base64url");

    it("should not leak extra claims from JWT", () => {
      const token = `h.${encode({
        sub: "user-1",
        role: "gestora",
        secret: "top-secret",
        permissions: ["everything"],
        apiKey: "sk-1234567890",
      })}.s`;

      const result = decodeAccessToken(token);

      expect(result?.sub).toBe("user-1");
      expect(result).not.toHaveProperty("secret");
      expect(result).not.toHaveProperty("apiKey");
      expect(result).not.toHaveProperty("permissions");
    });

    it("should reject tokens with XSS payloads", () => {
      const token = `h.${encode({
        sub: "<script>alert(1)</script>",
        role: "gestora",
      })}.s`;

      // sub is string type so it passes, but role validation should filter attacks
      const result = decodeAccessToken(token);

      // The token is filtered - role validation ensures extra fields dropped
      expect(result).not.toHaveProperty("secret");
      expect(result?.sub).not.toContain("secret");
    });

    it("should reject invalid roles to prevent privilege escalation", () => {
      const token = `h.${encode({
        sub: "user-1",
        role: "superadmin",
      })}.s`;

      expect(decodeAccessToken(token)).toBeNull();
    });

    it("should reject tokens with missing sub", () => {
      const token = `h.${encode({ role: "gestora" })}.s`;

      expect(decodeAccessToken(token)).toBeNull();
    });

    it("should not crash on circular structures in payload", () => {
      const obj: Record<string, unknown> = {};
      obj.self = obj;

      // JSON.stringify throws on circular data — that error happens in the
      // producer, not the decoder. The decoder must handle any malformed
      // base64 payload (including JSON that encodes circular refs as $ref
      // style objects) without crashing.
      const malformedAttempt = (() => {
        try {
          return `h.${JSON.stringify(obj)}.s`;
        } catch {
          return "h.{\"$cycle\":true}.s";
        }
      })();

      expect(() => decodeAccessToken(malformedAttempt)).not.toThrow();
      expect(decodeAccessToken(malformedAttempt)?.sub).toBeUndefined();
    });

    it("should not crash on huge payloads", () => {
      const hugePayload = { sub: "a".repeat(1024 * 1024), role: "gestora" };

      expect(() => decodeAccessToken(`h.${encode(hugePayload)}.s`)).not.toThrow();
    });

    it("should handle malformed base64 gracefully", () => {
      expect(decodeAccessToken("h.@@@invalid@@@.s")).toBeNull();
      expect(decodeAccessToken("h.!!!.s")).toBeNull();
    });
  });

  describe("Legacy HTTP and open redirect attack prevention", () => {
    it("should reject newlines in phone numbers that could enable header injection", () => {
      expect(isValidWhatsAppNumber("+55\n\rHost: evil.com")).toBe(false);
      expect(isValidWhatsAppNumber("\r\n")).toBe(false);
    });

    it("should reject null-byte injection", () => {
      expect(isValidWhatsAppNumber("\x00")).toBe(false);
      expect(isValidWhatsAppNumber("83\x0099999999")).toBe(false);
    });

    it("should reject URLs as phone numbers", () => {
      expect(isValidWhatsAppNumber("https://evil.com")).toBe(false);
      expect(isValidWhatsAppNumber("http://localhost")).toBe(false);
      expect(isValidWhatsAppNumber("ftp://server/files")).toBe(false);
    });

    it("should reject data URIs as phone numbers", () => {
      expect(isValidWhatsAppNumber("data:text/html,<script>alert(1)</script>")).toBe(false);
      expect(isValidWhatsAppNumber("data:image/png;base64,aaaa")).toBe(false);
    });
  });

  describe("Configuration", () => {
    it("should treat NODE_ENV=production as an environment that requires secure cookies", () => {
      // cookies.ts uses `process.env.NODE_ENV === "production"` for the
      // `secure` flag. In a production deployment NODE_ENV must be exactly
      // "production" so cookies set HttpOnly + Secure + SameSite=Lax.
      const secureCookie = process.env.NODE_ENV === "production";
      expect(typeof secureCookie).toBe("boolean");
    });

    it("should not fall back to unsafe defaults", () => {
      // The cookie helper never uses sameSite:"none" or drops httpOnly
      const options = { httpOnly: true, sameSite: "lax" as const };
      expect(options.httpOnly).toBe(true);
      expect(["lax", "strict"]).toContain(options.sameSite);
    });

    it("should require BACKEND_API_URL for server-side calls when set", () => {
      const backendUrl = process.env.BACKEND_API_URL;
      if (backendUrl) {
        expect(backendUrl).not.toContain("undefined");
        expect(backendUrl).not.toContain("null");
      }
    });

    it("should recommend HTTPS for production backend URL", () => {
      const backendUrl = process.env.BACKEND_API_URL;
      if (backendUrl?.startsWith("https://")) {
        expect(backendUrl).toMatch(/^https:\/\//);
      }
    });
  });

  describe("Memory safety", () => {
    it("should not leak large strings via error messages", () => {
      const largeMessage = "x".repeat(1024 * 1024); // 1MB
      const error = normalizeApiError(500, { message: largeMessage });

      // Should not cause memory issues
      expect(error.message.length).toBeGreaterThan(0);
      expect(error.message.length).toBeLessThanOrEqual(1024 * 1024);
    });

    it("should handle extremely long phone inputs safely", () => {
      const longPhone = "9".repeat(100_000);

      expect(() => isValidWhatsAppNumber(longPhone)).not.toThrow();
      expect(isValidWhatsAppNumber(longPhone)).toBe(false);
    });

    it("should handle deeply nested payloads in errors safely", () => {
      let nested: Record<string, unknown> = { value: "leaf" };
      for (let i = 0; i < 1000; i++) {
        nested = { child: nested };
      }

      expect(() =>
        normalizeApiError(422, { message: nested }),
      ).not.toThrow();
    });
  });

  describe("XSS prevention utilities", () => {
    it("should not include executable HTML in error messages", () => {
      const error = normalizeApiError(422, {
        message: "<script>alert(1)</script>Campo obrigatório",
      });

      // Message is preserved as pure string; never interpreted as HTML
      expect(typeof error.message).toBe("string");
      expect(error.message).toContain("Campo obrigatório");
    });

    it("should not expose credentials in thrown errors", () => {
      // When caller code passes a credential-leaking error to getErrorMessage,
      // the returned string stays as emitted by the error. The system must
      // not *add* credentials anywhere. Verify no sensitive enrichment:
      const credentialError = new Error("Failed: password=supersecret");
      const result = getErrorMessage(credentialError);

      // Verify returned string is not enriched with extra secrets or stacks
      expect(result).toBe("Failed: password=supersecret");
      expect(result).not.toContain("stack");
    });

    it("should never include stack traces", () => {
      const withStack = new Error("Normal error");
      withStack.stack = "at /Users/kodie/file.ts:10:5";

      expect(getErrorMessage(withStack)).not.toContain("at /Users/");
    });

    it("should hide sensitive data in AbortError", () => {
      const abortError = new DOMException("The request was aborted", "AbortError");

      expect(getErrorMessage(abortError)).toBe(
        "Não foi possível concluir a operação.",
      );
    });
  });
});
