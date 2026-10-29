import { describe, it, expect } from "vitest";
import type { AccessTokenPayload } from "@/types";

import {
  decodeAccessToken,
  isAccessTokenFresh,
  getSessionMaxAge,
} from "@/lib/auth/jwt";

function encodePayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

type AccessPayloadOverrides = Partial<Record<string, unknown>>;

function buildToken(overrides: AccessPayloadOverrides = {}): string {
  const payload = {
    sub: "user-123",
    role: "gestora",
    name: "Test User",
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };

  return `header.${encodePayload(payload)}.signature`;
}

describe("Jwt", () => {
  describe("decodeAccessToken", () => {
    it("should decode a valid token with all claims", () => {
      const result = decodeAccessToken(buildToken());

      expect(result?.sub).toBe("user-123");
      expect(result?.role).toBe("gestora");
      expect(result?.name).toBe("Test User");
      expect(typeof result?.exp).toBe("number");
    });

    it("should return null when parts length is invalid", () => {
      expect(decodeAccessToken("onlyone")).toBeNull();
      expect(decodeAccessToken("two.parts")).toBeNull();
      expect(decodeAccessToken("a.b.c.d")).toBeNull();
    });

    it("should return null when payload is not valid JSON", () => {
      const invalid = Buffer.from("not-json").toString("base64url");

      expect(decodeAccessToken(`a.${invalid}.c`)).toBeNull();
    });

    it("should return null when sub is not a string", () => {
      expect(decodeAccessToken(buildToken({ sub: 123 }))).toBeNull();
    });

    it("should return null when role is invalid", () => {
      expect(decodeAccessToken(buildToken({ role: "superadmin" }))).toBeNull();
    });

    it("should ignore non-string name", () => {
      const result = decodeAccessToken(buildToken({ name: 42 }));

      expect(result?.name).toBeUndefined();
    });

    it("should ignore non-number iat/exp", () => {
      const result = decodeAccessToken(
        buildToken({ iat: "yesterday", exp: { then: 1 } }),
      );

      expect(result?.iat).toBeUndefined();
      expect(result?.exp).toBeUndefined();
    });

    it("should never leak extra claims", () => {
      const result = decodeAccessToken(
        buildToken({ admin: true, internal: "secret" }),
      );

      expect(result).not.toHaveProperty("admin");
      expect(result).not.toHaveProperty("internal");
    });

    it("should return null for empty token", () => {
      expect(decodeAccessToken("")).toBeNull();
    });

    it("should return null for malformed base64url", () => {
      expect(decodeAccessToken("header.@@@@.signature")).toBeNull();
    });
  });

  describe("isAccessTokenFresh", () => {
    const now = Math.floor(Date.now() / 1000);

    it("should be true when exp is in the future", () => {
      const payload: AccessTokenPayload = {
        sub: "user-123",
        role: "gestora",
        exp: now + 3600,
      };

      expect(isAccessTokenFresh(payload)).toBe(true);
    });

    it("should be false when exp is in the past", () => {
      const payload: AccessTokenPayload = {
        sub: "user-123",
        role: "gestora",
        exp: now - 100,
      };

      expect(isAccessTokenFresh(payload)).toBe(false);
    });

    it("should be false when exp equals now (>= not >)", () => {
      const payload: AccessTokenPayload = {
        sub: "user-123",
        role: "gestora",
        exp: now,
      };

      expect(isAccessTokenFresh(payload, now)).toBe(false);
    });

    it("should be true when exp is undefined", () => {
      const payload: AccessTokenPayload = {
        sub: "user-123",
        role: "gestora",
      };

      expect(isAccessTokenFresh(payload, now)).toBe(true);
    });

    it("should be false when payload is null", () => {
      expect(isAccessTokenFresh(null, now)).toBe(false);
    });
  });

  describe("getSessionMaxAge", () => {
    it("should return remaining seconds for valid exp", () => {
      const payload: AccessTokenPayload = {
        sub: "user-123",
        role: "gestora",
        exp: Math.floor(Date.now() / 1000) + 7200,
      };

      const result = getSessionMaxAge(payload);

      expect(result).toBeGreaterThanOrEqual(7199);
      expect(result).toBeLessThanOrEqual(7200);
    });

    it("should clamp minimum to 60 seconds", () => {
      const payload: AccessTokenPayload = {
        sub: "user-123",
        role: "gestora",
        exp: Math.floor(Date.now() / 1000) + 10,
      };

      const result = getSessionMaxAge(payload);

      expect(result).toBe(60);
    });

    it("should clamp maximum to 24 hours", () => {
      const payload: AccessTokenPayload = {
        sub: "user-123",
        role: "gestora",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      };

      const result = getSessionMaxAge(payload);

      expect(result).toBe(60 * 60 * 24);
    });

    it("should return 24 hours when exp is undefined", () => {
      const payload: AccessTokenPayload = {
        sub: "user-123",
        role: "gestora",
      };

      expect(getSessionMaxAge(payload)).toBe(60 * 60 * 24);
    });

    it("should clamp minimum for expired token", () => {
      const payload: AccessTokenPayload = {
        sub: "user-123",
        role: "gestora",
        exp: Math.floor(Date.now() / 1000) - 3600,
      };

      expect(getSessionMaxAge(payload)).toBe(60);
    });
  });
});