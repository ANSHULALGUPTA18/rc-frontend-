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

describe("RecommendationCard — structured pricing metadata", () => {
  const renderWith = (over: Partial<PricingVersion>) =>
    render(
      <RecommendationCard
        fileName="Position 1"
        status="done"
        rec={{ ...baseRec, ...over }}
        error={null}
        onRetry={() => {}}
      />,
    );

  it("shows key skills, market factors, and model-cited sources", () => {
    renderWith({
      keySkills: ["Java", "AWS"],
      marketFactors: ["NYC premium"],
      sources: ["https://www.indeed.com/salaries/java"],
    });

    expect(screen.getByText("Java, AWS")).toBeInTheDocument();
    expect(screen.getByText("NYC premium")).toBeInTheDocument();
    // Sources are labeled as model-cited, never presented as verified.
    expect(screen.getByText(/cited by the model/)).toBeInTheDocument();
  });

  it("renders http sources as links to the source", () => {
    renderWith({ sources: ["https://www.indeed.com/salaries/java"] });

    const link = screen.getByRole("link", { name: "https://www.indeed.com/salaries/java" });
    expect(link).toHaveAttribute("href", "https://www.indeed.com/salaries/java");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("renders a non-URL source as plain text, not a link", () => {
    renderWith({ sources: ["BLS OEWS May 2025"] });

    expect(screen.getByText("BLS OEWS May 2025")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "BLS OEWS May 2025" })).not.toBeInTheDocument();
  });

  it("renders no metadata panel when nothing is available", () => {
    renderWith({ keySkills: null, marketFactors: null, sources: null, explanation: null });

    expect(screen.queryByText("Key Skills")).not.toBeInTheDocument();
    expect(screen.queryByText(/cited by the model/)).not.toBeInTheDocument();
    expect(screen.queryByText("Rationale")).not.toBeInTheDocument();
  });

  it("still shows legacy prose rationale on older recommendations", () => {
    renderWith({ explanation: "Priced from 2025 market data." });

    expect(screen.getByText("Rationale")).toBeInTheDocument();
    expect(screen.getByText("Priced from 2025 market data.")).toBeInTheDocument();
  });
});

describe("RecommendationCard — evidence human-review", () => {
  const renderWith = (over: Partial<PricingVersion>) =>
    render(
      <RecommendationCard
        fileName="Position 1"
        status="done"
        rec={{ ...baseRec, ...over }}
        error={null}
        onRetry={() => {}}
      />,
    );

  it("shows a needs-human-review banner when evidenceDecision is human_review", () => {
    renderWith({ evidenceDecision: "human_review" });
    expect(screen.getByText(/Needs human review/i)).toBeInTheDocument();
    expect(screen.getByText(/advisory starting point/i)).toBeInTheDocument();
  });

  it("does not show the banner when evidenceDecision is recommend", () => {
    renderWith({ evidenceDecision: "recommend" });
    expect(screen.queryByText(/Needs human review/i)).not.toBeInTheDocument();
  });

  it("does not show the banner on legacy recommendations (no evidenceDecision)", () => {
    renderWith({ evidenceDecision: null });
    expect(screen.queryByText(/Needs human review/i)).not.toBeInTheDocument();
  });
});
