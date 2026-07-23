/**
 * RecommendationsView pooled-pricing tests (Module 6).
 *
 * Verifies the shift from "every card prices itself on mount" to a single
 * 5-wide worker pool owned by the view:
 *  - concurrency never exceeds 5 (the whole point — no 120-at-once storm)
 *  - every JD ends up priced and its rates render
 *  - a failed JD surfaces Retry, which re-prices just that JD
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { RecommendationsView } from "@/features/jd-upload/components/RecommendationsView";
import type { PricingVersion, ResolvedPromptConfig, SubmittedJd } from "@/features/jd-upload/types";
import * as client from "@/features/jd-upload/api/client";

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/features/jd-upload/components/WorkshopStages", () => ({
  WorkshopStages: () => null,
}));
vi.mock("@/lib/auth/useMsalTokenContext", () => ({
  useMsalTokenContext: () => ({}),
}));

vi.mock("@/features/jd-upload/api/client", () => ({
  priceJd: vi.fn(),
  priceJdBatch: vi.fn(),
  getPricingHistory: vi.fn(),
  submitForApproval: vi.fn(),
  exportPricingExcel: vi.fn(),
}));

/** Default: the batch call succeeds for every requested JD. */
const batchSucceeds = () =>
  vi
    .mocked(client.priceJdBatch)
    .mockImplementation(async (jdIds: string[]) =>
      jdIds.map((jdId) => ({ jdId, status: "pending_review", error: null })),
    );

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const version = (jdId: string): PricingVersion => ({
  id: `rec-${jdId}`,
  versionNumber: 1,
  promptName: "Prompt_1",
  promptSnapshot: null,
  payRateLow: "55.00",
  payRateHigh: "65.00",
  billRateLow: "85.00",
  billRateHigh: "95.00",
  markupPct: "32.5",
  confidenceScore: 0.87,
  explanation: null,
  submissionStatus: "draft",
  createdAt: new Date().toISOString(),
});

const makeJds = (n: number): SubmittedJd[] =>
  Array.from({ length: n }, (_, i) => ({
    fileId: `f${i}`,
    fileName: `Position ${i}`,
    jdId: `jd${i}`,
    extractedFields: {
      jobTitle: `Position ${i}`,
      experienceRequired: null,
      skills: [],
      mandatorySkills: [],
      location: "Remote",
      employmentType: "Contract",
      sector: "Tech",
      confidence: 0.9,
    },
  }));

const configsFor = (jds: SubmittedJd[]): Record<string, ResolvedPromptConfig> =>
  Object.fromEntries(
    jds.map((jd) => [
      jd.fileId,
      {
        promptTemplateId: "1",
        promptContent: "Price it.",
        promptName: "Prompt_1",
        locationOverride: null,
        sectorOverride: null,
      },
    ]),
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RecommendationsView — batch pricing", () => {
  it("prices JDs sharing one prompt config in a single batch call", async () => {
    batchSucceeds();
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);

    const jds = makeJds(12);
    render(
      <RecommendationsView submittedJds={jds} promptConfigs={configsFor(jds)} onDone={() => {}} />,
    );

    await waitFor(() => expect(screen.getAllByText(/\/hr/).length).toBeGreaterThanOrEqual(12), {
      timeout: 5000,
    });

    // One shared signature → exactly one request covering all 12.
    expect(client.priceJdBatch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(client.priceJdBatch).mock.calls[0][0]).toHaveLength(12);
    expect(client.priceJd).not.toHaveBeenCalled();
  });

  it("splits positions with different prompts into separate batch calls", async () => {
    batchSucceeds();
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);

    const jds = makeJds(3);
    const configs = configsFor(jds);
    // One position gets a custom prompt → its own group.
    configs["f2"] = { ...configs["f2"], promptContent: "Different prompt." };

    render(<RecommendationsView submittedJds={jds} promptConfigs={configs} onDone={() => {}} />);

    await waitFor(() => expect(screen.getAllByText(/\/hr/).length).toBeGreaterThanOrEqual(3));

    expect(client.priceJdBatch).toHaveBeenCalledTimes(2);
    const sizes = vi
      .mocked(client.priceJdBatch)
      .mock.calls.map((c) => c[0].length)
      .sort();
    expect(sizes).toEqual([1, 2]);
  });

  it("falls back to per-JD pricing when the batch request itself fails", async () => {
    vi.mocked(client.priceJdBatch).mockRejectedValue(new Error("network down"));
    vi.mocked(client.priceJd).mockResolvedValue({ jdId: "x", status: "pending_review" });
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);

    const jds = makeJds(3);
    render(
      <RecommendationsView submittedJds={jds} promptConfigs={configsFor(jds)} onDone={() => {}} />,
    );

    await waitFor(() => expect(screen.getAllByText(/\/hr/).length).toBeGreaterThanOrEqual(3));
    // Every position still priced, one call each.
    expect(client.priceJd).toHaveBeenCalledTimes(3);
  });

  it("never runs more than 5 concurrent calls in the fallback pool", async () => {
    vi.mocked(client.priceJdBatch).mockRejectedValue(new Error("network down"));
    let inFlight = 0;
    let peak = 0;
    vi.mocked(client.priceJd).mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await delay(15);
      inFlight -= 1;
      return { jdId: "x", status: "pending_review" };
    });
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);

    const jds = makeJds(12);
    render(
      <RecommendationsView submittedJds={jds} promptConfigs={configsFor(jds)} onDone={() => {}} />,
    );

    await waitFor(() => expect(screen.getAllByText(/\/hr/).length).toBeGreaterThanOrEqual(12), {
      timeout: 5000,
    });

    expect(client.priceJd).toHaveBeenCalledTimes(12);
    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBe(5); // pool actually saturates to the cap
  });

  it("marks only the positions the batch reports as failed", async () => {
    vi.mocked(client.priceJdBatch).mockImplementation(async (jdIds: string[]) =>
      jdIds.map((jdId) => ({
        jdId,
        status: jdId === "jd0" ? "failed" : "pending_review",
        error: jdId === "jd0" ? "quota exceeded" : null,
      })),
    );
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);

    const jds = makeJds(3);
    render(
      <RecommendationsView submittedJds={jds} promptConfigs={configsFor(jds)} onDone={() => {}} />,
    );

    // The one failed position offers a Retry; the other two are priced.
    await screen.findByRole("button", { name: "Retry" });
    await waitFor(() => expect(screen.getAllByText(/\/hr/).length).toBeGreaterThanOrEqual(2));
  });

  it("shows Retry on a failed JD and re-prices it on click", async () => {
    // The batch reports jd0 as failed; the others succeed.
    vi.mocked(client.priceJdBatch).mockImplementation(async (jdIds: string[]) =>
      jdIds.map((jdId) => ({
        jdId,
        status: jdId === "jd0" ? "failed" : "pending_review",
        error: jdId === "jd0" ? "boom" : null,
      })),
    );
    vi.mocked(client.priceJd).mockResolvedValue({ jdId: "jd0", status: "pending_review" });
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);

    const jds = makeJds(2);
    render(
      <RecommendationsView submittedJds={jds} promptConfigs={configsFor(jds)} onDone={() => {}} />,
    );

    // jd0 failed → Retry button appears
    const retry = await screen.findByRole("button", { name: "Retry" });

    // Now make the retry succeed
    vi.mocked(client.priceJd).mockResolvedValue({ jdId: "jd0", status: "pending_review" });
    await userEvent.click(retry);

    // Both JDs now priced → two rate blocks
    await waitFor(() => expect(screen.getAllByText(/\/hr/).length).toBeGreaterThanOrEqual(2));
  });

  it("skips pricing when a JD has no prompt config but still loads history", async () => {
    batchSucceeds();
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);

    const jds = makeJds(1);
    render(<RecommendationsView submittedJds={jds} promptConfigs={{}} onDone={() => {}} />);

    await waitFor(() => expect(screen.getAllByText(/\/hr/).length).toBeGreaterThanOrEqual(1));
    expect(client.priceJdBatch).not.toHaveBeenCalled();
    expect(client.priceJd).not.toHaveBeenCalled();
    expect(client.getPricingHistory).toHaveBeenCalledWith("jd0", expect.anything());
  });

  it("shows an aggregate progress header that reaches completion", async () => {
    batchSucceeds();
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);

    const jds = makeJds(3);
    render(
      <RecommendationsView submittedJds={jds} promptConfigs={configsFor(jds)} onDone={() => {}} />,
    );

    await waitFor(() => expect(screen.getByText("Pricing complete")).toBeInTheDocument());
    expect(screen.getByText(/3 of 3 priced/)).toBeInTheDocument();
  });

  it("offers Retry all failed and re-prices every failed JD", async () => {
    // jd0 and jd1 come back failed; jd2 succeeds.
    vi.mocked(client.priceJdBatch).mockImplementation(async (jdIds: string[]) =>
      jdIds.map((jdId) => ({
        jdId,
        status: jdId === "jd0" || jdId === "jd1" ? "failed" : "pending_review",
        error: jdId === "jd0" || jdId === "jd1" ? "boom" : null,
      })),
    );
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);

    const jds = makeJds(3);
    render(
      <RecommendationsView submittedJds={jds} promptConfigs={configsFor(jds)} onDone={() => {}} />,
    );

    // All settled with 2 failures → "Retry all failed" appears
    const retryAll = await screen.findByRole("button", { name: "Retry all failed" });
    expect(screen.getByText(/2 failed/)).toBeInTheDocument();

    // Make retries succeed, click, expect all 3 priced
    batchSucceeds();
    await userEvent.click(retryAll);

    await waitFor(() => expect(screen.getByText(/3 of 3 priced/)).toBeInTheDocument());
    expect(screen.getAllByText(/\/hr/).length).toBeGreaterThanOrEqual(3);
  });

  it("exports priced rows to Excel", async () => {
    batchSucceeds();
    vi.mocked(client.getPricingHistory).mockImplementation(async (jdId: string) => [version(jdId)]);
    vi.mocked(client.exportPricingExcel).mockResolvedValue(undefined);

    const jds = makeJds(2);
    render(
      <RecommendationsView submittedJds={jds} promptConfigs={configsFor(jds)} onDone={() => {}} />,
    );

    // Button enables once at least one JD is priced.
    const exportBtn = await screen.findByRole("button", { name: /Export to Excel/ });
    await waitFor(() => expect(exportBtn).not.toBeDisabled());

    await userEvent.click(exportBtn);

    await waitFor(() => expect(client.exportPricingExcel).toHaveBeenCalledTimes(1));
    const rows = vi.mocked(client.exportPricingExcel).mock.calls[0][0];
    expect(rows).toHaveLength(2); // both priced positions exported
    expect(rows[0]).toMatchObject({
      payRateLow: 55,
      payRateHigh: 65,
      confidence: 0.87,
      status: "draft",
    });
  });

  it("disables Export until at least one JD is priced", async () => {
    // Pricing hangs (never resolves) so nothing is done yet.
    vi.mocked(client.priceJdBatch).mockImplementation(() => new Promise(() => {}));
    vi.mocked(client.getPricingHistory).mockImplementation(() => new Promise(() => {}));

    const jds = makeJds(1);
    render(
      <RecommendationsView submittedJds={jds} promptConfigs={configsFor(jds)} onDone={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /Export to Excel/ })).toBeDisabled();
  });
});
