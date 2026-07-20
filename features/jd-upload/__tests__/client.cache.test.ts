/**
 * jd-upload api/client.ts — cache metadata mapping (snake_case -> camelCase)
 * for smartUpload() and getPricingHistory().
 */

import { describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { getPricingHistory, smartUpload } from "@/features/jd-upload/api/client";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/auth/token-storage", () => ({
  getAccessToken: vi.fn(),
}));

// vitest.config.ts forces NEXT_PUBLIC_USE_MOCK=true globally; these tests
// exercise the real (non-mock) mapping path, so override IS_MOCK locally.
vi.mock("@/lib/api/config", () => ({
  IS_MOCK: false,
  API_BASE: "",
}));

describe("smartUpload — cache metadata mapping", () => {
  it("maps a cache hit through unchanged", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      source_filename: "jd.pdf",
      positions: [],
      cache: { hit: true, type: "extraction", tier: "file" },
    });
    const res = await smartUpload(new File(["x"], "jd.pdf"));
    expect(res.cache).toEqual({ hit: true, type: "extraction", tier: "file" });
  });

  it("maps a cache miss through unchanged", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      source_filename: "jd.pdf",
      positions: [],
      cache: { hit: false, type: "extraction", tier: null },
    });
    const res = await smartUpload(new File(["x"], "jd.pdf"));
    expect(res.cache).toEqual({ hit: false, type: "extraction", tier: null });
  });
});

describe("getPricingHistory — cache metadata mapping", () => {
  const rawVersion = (cache: unknown) => ({
    id: "v1",
    version_number: 1,
    prompt_name: null,
    prompt_snapshot: null,
    pay_rate_low: "50.00",
    pay_rate_high: "60.00",
    bill_rate_low: "70.00",
    bill_rate_high: "80.00",
    markup_pct: "25.0",
    confidence_score: 0.9,
    explanation: null,
    submission_status: "draft",
    created_at: new Date().toISOString(),
    cache,
  });

  it("maps a present cache field to a concrete CacheMeta", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      rawVersion({ hit: true, type: "pricing", tier: "fields" }),
    ]);
    const versions = await getPricingHistory("jd1");
    expect(versions[0].cache).toEqual({ hit: true, type: "pricing", tier: "fields" });
  });

  it("maps a missing cache field (legacy row) to null", async () => {
    vi.mocked(apiFetch).mockResolvedValue([rawVersion(undefined)]);
    const versions = await getPricingHistory("jd1");
    expect(versions[0].cache).toBeNull();
  });

  it("maps an explicit null cache field to null", async () => {
    vi.mocked(apiFetch).mockResolvedValue([rawVersion(null)]);
    const versions = await getPricingHistory("jd1");
    expect(versions[0].cache).toBeNull();
  });
});
