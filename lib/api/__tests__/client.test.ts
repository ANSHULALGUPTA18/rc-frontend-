import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/tests/msw/server";

const API_BASE_URL = "http://localhost:8000";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_BASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/lib/auth/token-storage");
});

describe("apiFetch — mock mode (NEXT_PUBLIC_USE_MOCK=true)", () => {
  it("returns parsed JSON on success and sends no Authorization header", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");

    let authHeader: string | null = "unset";
    server.use(
      http.get(`${API_BASE_URL}/v1/ping`, ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ ok: true });
      })
    );

    const { apiFetch } = await import("@/lib/api/client");
    const result = await apiFetch<{ ok: boolean }>("/v1/ping");

    expect(result).toEqual({ ok: true });
    expect(authHeader).toBeNull();
  });

  it("sends application/json Content-Type for a string body", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");

    let contentType: string | null = null;
    server.use(
      http.post(`${API_BASE_URL}/v1/echo`, ({ request }) => {
        contentType = request.headers.get("content-type");
        return HttpResponse.json({ ok: true });
      })
    );

    const { apiFetch } = await import("@/lib/api/client");
    await apiFetch("/v1/echo", { method: "POST", body: JSON.stringify({ a: 1 }) });

    expect(contentType).toContain("application/json");
  });

  it("throws ApiError with the parsed detail on a non-OK response", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");

    server.use(
      http.get(`${API_BASE_URL}/v1/missing`, () =>
        HttpResponse.json({ detail: "JD not found" }, { status: 404 })
      )
    );

    const { apiFetch } = await import("@/lib/api/client");

    await expect(apiFetch("/v1/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      detail: "JD not found",
    });
  });

  it("returns undefined for a 204 No Content response", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");

    server.use(
      http.delete(`${API_BASE_URL}/v1/items/1`, () => new HttpResponse(null, { status: 204 }))
    );

    const { apiFetch } = await import("@/lib/api/client");
    const result = await apiFetch("/v1/items/1", { method: "DELETE" });

    expect(result).toBeUndefined();
  });
});

describe("apiFetch — Azure mode (NEXT_PUBLIC_USE_MOCK=false)", () => {
  it("attaches the Authorization header from getAccessToken", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.doMock("@/lib/auth/token-storage", () => ({
      getAccessToken: vi.fn().mockResolvedValue("az-token-xyz"),
    }));

    let authHeader: string | null = null;
    server.use(
      http.get(`${API_BASE_URL}/v1/secure`, ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ ok: true });
      })
    );

    const { apiFetch } = await import("@/lib/api/client");
    await apiFetch("/v1/secure");

    expect(authHeader).toBe("Bearer az-token-xyz");
  });

  it("omits the Authorization header when getAccessToken returns null", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.doMock("@/lib/auth/token-storage", () => ({
      getAccessToken: vi.fn().mockResolvedValue(null),
    }));

    let authHeader: string | null = "unset";
    server.use(
      http.get(`${API_BASE_URL}/v1/secure`, ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ ok: true });
      })
    );

    const { apiFetch } = await import("@/lib/api/client");
    await apiFetch("/v1/secure");

    expect(authHeader).toBeNull();
  });
});
