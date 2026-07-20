/**
 * RecommendationCard tests — cache-hit/fresh badge display.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationCard } from "@/features/jd-upload/components/RecommendationCard";
import type { PricingVersion } from "@/features/jd-upload/types";

vi.mock("@/lib/auth/useMsalTokenContext", () => ({
  useMsalTokenContext: () => ({}),
}));

vi.mock("@/features/jd-upload/api/client", () => ({
  submitForApproval: vi.fn(),
}));

const baseRec: PricingVersion = {
  id: "rec-1",
  versionNumber: 1,
  promptName: "Prompt_1",
  promptSnapshot: null,
  payRateLow: "55.00",
  payRateHigh: "65.00",
  billRateLow: "85.00",
  billRateHigh: "95.00",
  markupPct: "25.0",
  confidenceScore: 0.87,
  explanation: null,
  submissionStatus: "draft",
  createdAt: new Date().toISOString(),
};

describe("RecommendationCard — cache badge", () => {
  it("shows Cache Hit when the pricing response came from cache", () => {
    render(
      <RecommendationCard
        fileName="Position 1"
        status="done"
        rec={{ ...baseRec, cache: { hit: true, type: "pricing", tier: "fields" } }}
        error={null}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/Cache Hit/)).toBeInTheDocument();
  });

  it("shows Fresh AI Response when the pricing response was freshly generated", () => {
    render(
      <RecommendationCard
        fileName="Position 1"
        status="done"
        rec={{ ...baseRec, cache: { hit: false, type: "pricing", tier: null } }}
        error={null}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/Fresh AI Response/)).toBeInTheDocument();
  });

  it("shows no badge when cache status is unknown (legacy recommendation)", () => {
    render(
      <RecommendationCard
        fileName="Position 1"
        status="done"
        rec={{ ...baseRec, cache: null }}
        error={null}
        onRetry={() => {}}
      />,
    );
    expect(screen.queryByText(/Cache Hit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fresh AI Response/)).not.toBeInTheDocument();
  });

  it("shows no badge while pricing is still loading", () => {
    render(
      <RecommendationCard
        fileName="Position 1"
        status="pricing"
        rec={null}
        error={null}
        onRetry={() => {}}
      />,
    );
    expect(screen.queryByText(/Cache Hit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fresh AI Response/)).not.toBeInTheDocument();
  });
});
