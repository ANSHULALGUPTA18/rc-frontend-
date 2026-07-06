/**
 * ExtractionView batch-progress tests (Module 4).
 *
 * Covers the live per-PDF status list and retry affordance:
 *  - during extraction: each PDF shows its status (waiting/processing/…)
 *  - progress summary reflects settled count + positions
 *  - after extraction: failed PDFs surface a Retry button that calls back
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExtractionView } from "@/features/jd-upload/components/ExtractionView";
import type { FileExtractionProgress, SubmittedJd } from "@/features/jd-upload/types";

// Mock the layout chrome — not under test and pulls in router/auth.
vi.mock("@/features/jd-upload/components/WorkshopSidebar", () => ({
  WorkshopSidebar: () => null,
}));
vi.mock("@/features/jd-upload/components/WorkshopStages", () => ({
  WorkshopStages: () => null,
}));
vi.mock("@/components/layout/TopBar", () => ({ TopBar: () => null }));

const progress = (
  fileId: string,
  fileName: string,
  status: FileExtractionProgress["status"],
  positionCount = 0,
  error: string | null = null,
): FileExtractionProgress => ({ fileId, fileName, status, positionCount, error });

const jd = (fileId: string, fileName: string): SubmittedJd => ({
  fileId,
  fileName,
  jdId: `jd-${fileId}`,
  extractedFields: {
    jobTitle: fileName,
    experienceRequired: "5+ years",
    skills: ["Python"],
    mandatorySkills: [],
    location: "Remote",
    employmentType: "Contract",
    sector: "Tech",
    confidence: 0.9,
  },
});

describe("ExtractionView — batch progress", () => {
  it("renders a live status line per PDF while extracting", () => {
    const fileProgress = [
      progress("a", "alpha.pdf", "completed", 3),
      progress("b", "beta.pdf", "processing"),
      progress("c", "gamma.pdf", "pending"),
    ];
    render(
      <ExtractionView
        submittedJds={[]}
        loading
        fileProgress={fileProgress}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("3 positions")).toBeInTheDocument();
    expect(screen.getByText("Processing…")).toBeInTheDocument();
    expect(screen.getByText("Waiting…")).toBeInTheDocument();
  });

  it("shows a progress summary with settled count and positions", () => {
    const fileProgress = [
      progress("a", "alpha.pdf", "completed", 2),
      progress("b", "beta.pdf", "failed", 0, "GPT timeout"),
      progress("c", "gamma.pdf", "processing"),
    ];
    render(
      <ExtractionView
        submittedJds={[jd("a1", "alpha.pdf"), jd("a2", "alpha.pdf")]}
        loading
        fileProgress={fileProgress}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );
    // 2 of 3 settled, 2 positions so far
    expect(
      screen.getByText(/Processing 2 of 3 files — 2 positions extracted so far/),
    ).toBeInTheDocument();
  });

  it("after extraction, a failed PDF shows a Retry button that fires the callback", async () => {
    const onRetryFile = vi.fn();
    const fileProgress = [
      progress("a", "alpha.pdf", "completed", 1),
      progress("b", "beta.pdf", "failed", 0, "Vision call failed"),
    ];
    render(
      <ExtractionView
        submittedJds={[jd("a1", "alpha.pdf")]}
        loading={false}
        fileProgress={fileProgress}
        onRetryFile={onRetryFile}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );

    // Failure detail visible
    expect(screen.getByText("Vision call failed")).toBeInTheDocument();

    const retry = screen.getByRole("button", { name: "Retry" });
    await userEvent.click(retry);
    expect(onRetryFile).toHaveBeenCalledWith("b");
  });

  it("reports the failed count in the summary after extraction", () => {
    const fileProgress = [
      progress("a", "alpha.pdf", "completed", 1),
      progress("b", "beta.pdf", "failed", 0, "boom"),
    ];
    render(
      <ExtractionView
        submittedJds={[jd("a1", "alpha.pdf")]}
        loading={false}
        fileProgress={fileProgress}
        onRetryFile={() => {}}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );
    expect(
      screen.getByText(/1 of 2 files processed — 1 position extracted, 1 failed/),
    ).toBeInTheDocument();
  });
});
