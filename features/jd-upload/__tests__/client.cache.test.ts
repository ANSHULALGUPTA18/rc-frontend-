/**
 * jd-upload api/client.ts — cache metadata mapping (snake_case -> camelCase)
 * for smartUpload() and getPricingHistory().
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import {
  confirmPositions,
  getPricingHistory,
  priceJdBatch,
  smartUpload,
} from "@/features/jd-upload/api/client";
import type { ConfirmPositionItem } from "@/features/jd-upload/types";

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

beforeEach(() => {
  vi.mocked(apiFetch).mockClear();
});

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

describe("confirmPositions — client field passthrough", () => {
  const item = (client: string | null): ConfirmPositionItem => ({
    tempId: "pos_0",
    title: "Project Manager",
    rawText: "Project Manager role.",
    location: "Vermont",
    sector: "Government",
    skills: [],
    mandatorySkills: [],
    experienceLevel: null,
    employmentType: "Contract",
    client,
    detectionSource: "gemini",
  });

  it("sends the requesting organization through to confirm-positions", async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);
    await confirmPositions([item("State of Vermont")]);
    const body = JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]?.body as string);
    expect(body.positions[0].client).toBe("State of Vermont");
  });

  it("sends null when no client was detected", async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);
    await confirmPositions([item(null)]);
    const body = JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]?.body as string);
    expect(body.positions[0].client).toBeNull();
  });
});

describe("priceJdBatch", () => {
  const config = {
    promptTemplateId: "1",
    promptContent: "Price these roles.",
    promptName: "Prompt_1",
    locationOverride: "Montgomery County, MD",
    sectorOverride: "Public Sector",
    rateTiers: ["remote" as const],
  };

  it("posts every jd id with the shared prompt config", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ results: [] });
    await priceJdBatch(["jd1", "jd2"], config);

    const [url, init] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe("/v1/jds/price-batch");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      jd_ids: ["jd1", "jd2"],
      prompt_content: "Price these roles.",
      prompt_name: "Prompt_1",
      location_override: "Montgomery County, MD",
      sector_override: "Public Sector",
      // Sent on every request; null when the recruiter left it blank.
      client_override: null,
      rate_tiers: ["remote"],
    });
  });

  it("maps snake_case results to camelCase, preserving per-position errors", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      results: [
        { jd_id: "jd1", status: "pending_review", error: null },
        { jd_id: "jd2", status: "failed", error: "quota exceeded" },
      ],
    });

    const res = await priceJdBatch(["jd1", "jd2"], config);

    expect(res).toEqual([
      { jdId: "jd1", status: "pending_review", error: null },
      { jdId: "jd2", status: "failed", error: "quota exceeded" },
    ]);
  });
});
