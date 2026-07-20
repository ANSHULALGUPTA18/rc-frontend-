/**
 * ExtractionResults tests — "By PDF" grouping of extracted positions.
 *
 *  - one card per source PDF with its own position count
 *  - expand/collapse reveals only that PDF's positions
 *  - summary totals (PDFs + positions)
 *  - "All Positions" tab lists everything flat
 *  - failed PDF exposes Retry
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExtractionResults } from "@/features/jd-upload/components/ExtractionResults";
import type { FileExtractionProgress, SubmittedJd } from "@/features/jd-upload/types";

const jd = (fileId: string, sourceFileId: string, jobTitle: string): SubmittedJd => ({
  fileId,
  fileName: jobTitle,
  jdId: `jd-${fileId}`,
  sourceFileId,
  sourceFileName: `${sourceFileId}.pdf`,
  detectionSource: "gemini",
  extractedFields: {
    jobTitle,
    experienceRequired: "5+ years",
    skills: ["Python"],
    mandatorySkills: [],
    location: "Remote",
    employmentType: "Contract",
    sector: "Tech",
    confidence: 0.9,
  },
});

const pdf = (
  fileId: string,
  fileName: string,
  positionCount: number,
  status: FileExtractionProgress["status"] = "completed",
  error: string | null = null,
): FileExtractionProgress => ({
  fileId,
  fileName,
  status,
  positionCount,
  error,
  sizeBytes: 2_400_000,
  uploadedAt: "2026-07-02T12:45:00.000Z",
  cache: null,
});

const scenario = () => ({
  fileProgress: [pdf("p1", "JD_01_Healthcare.pdf", 2), pdf("p2", "JD_02_Admin.pdf", 1)],
  submittedJds: [
    jd("a", "p1", "Enterprise IT Architect"),
    jd("b", "p1", "Solution Architect"),
    jd("c", "p2", "Business Analyst"),
  ],
});

describe("ExtractionResults — By PDF grouping", () => {
  it("renders one card per PDF with its position count", () => {
    const { fileProgress, submittedJds } = scenario();
    render(
      <ExtractionResults
        submittedJds={submittedJds}
        fileProgress={fileProgress}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );

    expect(screen.getByText("JD_01_Healthcare.pdf")).toBeInTheDocument();
    expect(screen.getByText("JD_02_Admin.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 positions")).toBeInTheDocument();
    expect(screen.getByText("1 position")).toBeInTheDocument();
  });

  it("hides positions until a PDF is expanded, then shows only that PDF's positions", async () => {
    const { fileProgress, submittedJds } = scenario();
    render(
      <ExtractionResults
        submittedJds={submittedJds}
        fileProgress={fileProgress}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );

    // Collapsed by default
    expect(screen.queryByText("Enterprise IT Architect")).not.toBeInTheDocument();

    // Expand the first PDF only
    const viewButtons = screen.getAllByRole("button", { name: /View Positions/ });
    await userEvent.click(viewButtons[0]);

    expect(screen.getByText("Enterprise IT Architect")).toBeInTheDocument();
    expect(screen.getByText("Solution Architect")).toBeInTheDocument();
    // p2's position stays hidden
    expect(screen.queryByText("Business Analyst")).not.toBeInTheDocument();
  });

  it("lists every position under the All Positions tab", async () => {
    const { fileProgress, submittedJds } = scenario();
    render(
      <ExtractionResults
        submittedJds={submittedJds}
        fileProgress={fileProgress}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /All Positions \(3\)/ }));
    expect(screen.getByText("Enterprise IT Architect")).toBeInTheDocument();
    expect(screen.getByText("Solution Architect")).toBeInTheDocument();
    expect(screen.getByText("Business Analyst")).toBeInTheDocument();
  });

  it("opens a detail modal with extracted fields when a position is clicked", async () => {
    const { fileProgress, submittedJds } = scenario();
    render(
      <ExtractionResults
        submittedJds={submittedJds}
        fileProgress={fileProgress}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );

    // Expand the first PDF, then click a position
    await userEvent.click(screen.getAllByRole("button", { name: /View Positions/ })[0]);
    await userEvent.click(screen.getByText("Enterprise IT Architect"));

    // Modal shows the extracted-fields detail
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Extracted Information")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument(); // a skill only shown in the modal
    expect(screen.getByText(/From p1\.pdf/)).toBeInTheDocument();

    // Close it
    await userEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows Retry on a failed PDF and fires the callback", async () => {
    const onRetryFile = vi.fn();
    render(
      <ExtractionResults
        submittedJds={[jd("a", "p1", "Enterprise IT Architect")]}
        fileProgress={[
          pdf("p1", "JD_01_Healthcare.pdf", 1),
          pdf("p2", "JD_02_Admin.pdf", 0, "failed", "Vision call failed"),
        ]}
        onRetryFile={onRetryFile}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );

    expect(screen.getByText("Vision call failed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryFile).toHaveBeenCalledWith("p2");
  });

  it("shows a Cache Hit badge on a PDF whose extraction was cached", () => {
    const p1 = pdf("p1", "JD_01_Healthcare.pdf", 2);
    p1.cache = { hit: true, type: "extraction", tier: "file" };
    render(
      <ExtractionResults
        submittedJds={[jd("a", "p1", "Enterprise IT Architect")]}
        fileProgress={[p1]}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByText(/Cache Hit/)).toBeInTheDocument();
  });

  it("shows a Fresh AI Response badge on a PDF that was not cached", () => {
    const p1 = pdf("p1", "JD_01_Healthcare.pdf", 2);
    p1.cache = { hit: false, type: "extraction", tier: null };
    render(
      <ExtractionResults
        submittedJds={[jd("a", "p1", "Enterprise IT Architect")]}
        fileProgress={[p1]}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByText(/Fresh AI Response/)).toBeInTheDocument();
  });

  it("shows no cache badge while cache status is still unknown", () => {
    render(
      <ExtractionResults
        submittedJds={[jd("a", "p1", "Enterprise IT Architect")]}
        fileProgress={[pdf("p1", "JD_01_Healthcare.pdf", 2)]}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );
    expect(screen.queryByText(/Cache Hit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fresh AI Response/)).not.toBeInTheDocument();
  });
});

describe("ExtractionResults — delete position", () => {
  it("shows no delete icons when onDeletePosition is not provided", async () => {
    const { fileProgress, submittedJds } = scenario();
    render(
      <ExtractionResults
        submittedJds={submittedJds}
        fileProgress={fileProgress}
        onBack={() => {}}
        onContinue={() => {}}
      />,
    );
    await userEvent.click(screen.getAllByRole("button", { name: /View Positions/ })[0]);
    expect(screen.queryByRole("button", { name: /Delete position/ })).not.toBeInTheDocument();
  });

  it("deletes a position after confirming the dialog", async () => {
    const { fileProgress, submittedJds } = scenario();
    const onDeletePosition = vi.fn();
    render(
      <ExtractionResults
        submittedJds={submittedJds}
        fileProgress={fileProgress}
        onBack={() => {}}
        onContinue={() => {}}
        onDeletePosition={onDeletePosition}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /View Positions/ })[0]);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete position Enterprise IT Architect" }),
    );

    // Confirmation dialog appears; nothing deleted yet
    expect(screen.getByText("Delete this position?")).toBeInTheDocument();
    expect(onDeletePosition).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDeletePosition).toHaveBeenCalledWith("a");
  });

  it("does not delete when the dialog is cancelled", async () => {
    const { fileProgress, submittedJds } = scenario();
    const onDeletePosition = vi.fn();
    render(
      <ExtractionResults
        submittedJds={submittedJds}
        fileProgress={fileProgress}
        onBack={() => {}}
        onContinue={() => {}}
        onDeletePosition={onDeletePosition}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /View Positions/ })[0]);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete position Solution Architect" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDeletePosition).not.toHaveBeenCalled();
  });
});
