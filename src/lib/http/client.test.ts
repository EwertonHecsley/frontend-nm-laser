import { describe, it, expect, vi, afterEach } from "vitest";

import { ApiError, isAbortError } from "./errors";
import { buildQueryString, http } from "./client";

// Simple helper to fake fetch responses
function jsonResponse(
  body: unknown,
  init: { status?: number; contentType?: string } = {},
): Response {
  const status = init.status ?? 200;
  const contentType = init.contentType ?? "application/json";

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      "content-type": contentType,
    }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe("HTTP Client - buildQueryString", () => {
  it("should return empty string for undefined query", () => {
    expect(buildQueryString(undefined)).toBe("");
  });

  it("should return empty string for empty object", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("should skip null, undefined and empty-string values", () => {
    const result = buildQueryString({
      a: undefined,
      b: null,
      c: "",
      d: "value",
    });

    expect(result).toBe("?d=value");
  });

  it("should serialize booleans and numbers", () => {
    const result = buildQueryString({ a: true, b: false, c: 0, d: 42 });

    expect(result).toBe("?a=true&b=false&c=0&d=42");
  });

  it("should serialize arrays as repeated keys", () => {
    const result = buildQueryString({ tag: ["a", "b"] });

    expect(result).toBe("?tag=a&tag=b");
  });

  it("should URL-encode special characters", () => {
    const result = buildQueryString({ q: "São Paulo & Cia." });

    // URLSearchParams encodes spaces as "+" and & as %26
    expect(result).toBe("?q=S%C3%A3o+Paulo+%26+Cia.");
  });

  it("should URL-encode potential injection payloads", () => {
    const result = buildQueryString({
      q: "<script>alert('xss')</script>",
      url: "https://evil.com/?steal=1",
    });

    expect(result).not.toContain("<script>");
    expect(result).not.toContain("://evil.com");
  });

  it("should not mutate the input object", () => {
    const query = { a: 1, b: undefined };
    const snapshot = { ...query };

    buildQueryString(query);

    expect(query).toEqual(snapshot);
  });
});

describe("HTTP Client - fetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should make GET requests to relative paths", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));

    const result = await http.get("/patients");

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/patients");
    expect((init as RequestInit).method).toBe("GET");
  });

  it("should include query params in GET URL", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse([]));

    await http.get("/patients", { query: { city: "Patos", page: 2 } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain("city=Patos");
    expect(url).toContain("page=2");
  });

  it("should send POST with json body", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse({ id: 1 }, { status: 201 }));

    const result = await http.post("/patients", { name: "Maria" });

    expect(result).toEqual({ id: 1 });
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).body).toBe(JSON.stringify({ name: "Maria" }));
  });

  it("should send PATCH with json body", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse({ id: 1 }));

    await http.patch("/patients/1", { name: "Nova" });

    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).method).toBe("PATCH");
  });

  it("should send DELETE", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse(undefined, { status: 204 }));

    const result = await http.delete("/patients/1");

    expect(result).toBeUndefined();
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).method).toBe("DELETE");
  });

  it("should use same-origin credentials only (security)", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse({}));

    await http.get("/me");

    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).credentials).toBe("same-origin");
  });

  it("should disable HTTP cache on requests (stale data protection)", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse({}));

    await http.get("/me");

    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).cache).toBe("no-store");
  });

  it("should set Accept: application/json header", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse({}));

    await http.get("/me");

    const [, init] = fetchSpy.mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("should dispatch nm:unauthorized event on 401 response", async () => {
    const listener = vi.fn();
    window.addEventListener("nm:unauthorized", listener);

    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({ message: "Session expired" }, { status: 401 }),
    );

    await expect(http.get("/me")).rejects.toThrow(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("nm:unauthorized", listener);
  });

  it("should not treat a login 401 as an expired session", async () => {
    const listener = vi.fn();
    window.addEventListener("nm:unauthorized", listener);

    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(
        { message: "E-mail ou senha inválidos." },
        { status: 401 },
      ),
    );

    await expect(
      http.post("api/auth/login", {
        email: "user@example.com",
        password: "password123",
      }),
    ).rejects.toMatchObject({
      message: "E-mail ou senha inválidos.",
      status: 401,
    });
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener("nm:unauthorized", listener);
  });

  it("should throw ApiError with generic message for 500 responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(
        { message: "SELECT * FROM users WHERE '1'='1';" },
        { status: 500 },
      ),
    );

    await expect(http.get("/users")).rejects.toThrow(ApiError);

    const error = await http.get("/users").catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    // Should not leak SQL details
    expect((error as ApiError).message).not.toContain("SELECT");
  });

  it("should throw ApiError with generic message for 403 responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(
        { message: "Secret admin info accidentally leaked" },
        { status: 403 },
      ),
    );

    await expect(http.get("/admin")).rejects.toThrow(ApiError);

    const error = await http.get("/admin").catch((err) => err);
    // Auth errors should use safe fallback message
    expect((error as ApiError).message).not.toContain("Secret admin");
  });

  it("should surface server field validation messages for 422", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(
        { message: ["Nome é obrigatório", "Telefone é obrigatório"] },
        { status: 422 },
      ),
    );

    await expect(
      http.post("/patients", {}),
    ).rejects.toThrow("Nome é obrigatório Telefone é obrigatório");
  });

  it("should throw generic ApiError on network failure (status 0)", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(http.get("/anything")).rejects.toThrow(ApiError);

    const error = await http.get("/anything").catch((err) => err);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).message).toContain("Não foi possível conectar");
  });

  it("should propagate caller abort signals", async () => {
    const abortController = new AbortController();
    abortController.abort();

    vi.spyOn(global, "fetch").mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );

    await expect(
      http.get("/anything", { signal: abortController.signal }),
    ).rejects.toSatisfy((error: unknown) => {
      return isAbortError(error) || error instanceof ApiError;
    });
  });

  it("should convert timeout errors to 408 ApiError", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(
      new DOMException("Timeout signal", "AbortError"),
    );

    await expect(http.get("/anything", { timeoutMs: 50 })).rejects.toThrow(
      "A requisição demorou demais. Tente novamente.",
    );
  });

  it("should return undefined for 204 responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(undefined, { status: 204 }),
    );

    const result = await http.delete("/patients/1");

    expect(result).toBeUndefined();
  });

  it("should surface text payload for non-JSON 200 content", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse("<h1>Unexpected</h1>", { contentType: "text/html" }),
    );

    const result = await http.get("/strange");

    expect(result).toContain("Unexpected");
  });

  it("should return null when JSON parsing fails on 200", async () => {
    const badResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
    } as unknown as Response;

    vi.spyOn(global, "fetch").mockResolvedValue(badResponse);

    const result = await http.get("/broken-json");

    expect(result).toBeNull();
  });

  it("should preserve custom headers passed by callers", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse({}));

    await http.get("/patients", {
      headers: { "X-Request-Id": "123" },
    });

    const [, init] = fetchSpy.mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("X-Request-Id")).toBe("123");
  });

  it("should not leak request bodies between calls", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    fetchSpy.mockResolvedValue(jsonResponse({}, { status: 200 }));

    await http.post("/a", { secret: "one" });
    await http.post("/b", { secret: "two" });

    const [, firstInit] = fetchSpy.mock.calls[0];
    const [, secondInit] = fetchSpy.mock.calls[1];

    expect(firstInit?.body).not.toContain("two");
    expect(secondInit?.body).not.toContain("one");
  });

  it("should strip leading slashes from paths", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse({}));

    await http.get("///patients");

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).not.toContain("///");
  });

  it("should handle payloads with many nested objects without crashing", async () => {
    const deepPayload = {
      data: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        nested: { a: { b: { c: i } } },
      })),
    };

    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(deepPayload));

    const result = await http.get("/large");

    expect((result as typeof deepPayload).data.length).toBe(100);
  });

  it("should not leak credentials in error message", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(
      Object.assign(new Error("Connection refused"), {
        // Try to trick the client into leaking auth data
        config: { password: "super-secret-123" },
        password: "super-pass-456",
      }),
    );

    await expect(http.get("/login", { body: { password: "hidden" } })).rejects
      .toBeDefined();

    try {
      await http.post("/login", { password: "super-secret-123" });
    } catch (error) {
      expect(String(error)).not.toContain("super-secret");
      expect(String(error)).not.toContain("super-pass");
    }
  });
});
