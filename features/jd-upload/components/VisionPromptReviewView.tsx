"use client";

import { Button } from "@/components/ui/button";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { WorkshopSidebar } from "@/features/jd-upload/components/WorkshopSidebar";
import { TopBar } from "@/components/layout/TopBar";

interface VisionPromptReviewViewProps {
  promptName: string;
  promptContent: string;
  onBack: () => void;
  onContinue: () => void;
}

export function VisionPromptReviewView({
  promptName,
  promptContent,
  onBack,
  onContinue,
}: VisionPromptReviewViewProps): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-subtle">
      <WorkshopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        {/* Fixed header */}
        <div className="shrink-0 px-6 pt-8 pb-4 lg:px-10">
          <h1 className="text-3xl font-bold text-ink">Pricing</h1>
          <div className="mt-4 space-y-3">
            <h2 className="text-lg font-bold text-ink">Stages</h2>
            <WorkshopStages activeStage="prompt-selection" />
          </div>
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 lg:px-10">
          {/* Read-only notice */}
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-blue-600"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-sm text-blue-800">
              <strong>Read-only.</strong> This prompt was locked before AI Vision processing began
              and cannot be changed.
            </span>
          </div>

          {/* Prompt card */}
          <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-5 w-5 text-sidebar-active"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8M16 17H8M10 9H8" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-ink">{promptName}</h3>
                  <p className="text-xs text-ink-muted">Pricing prompt</p>
                </div>
              </div>

              {/* Locked badge */}
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-3 w-3"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Locked
              </span>
            </div>

            {/* Prompt content */}
            <div className="mt-5">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Instruction
              </p>
              <div className="rounded-lg border border-line bg-surface-subtle px-4 py-3">
                <p className="whitespace-pre-wrap text-sm text-ink leading-relaxed">
                  {promptContent}
                </p>
              </div>
            </div>

            {/* Explanation */}
            <p className="mt-4 text-xs text-ink-muted">
              This instruction was sent to GPT-4o alongside all document pages. The model used it to
              generate the pricing recommendations shown in the results.
            </p>
          </div>

          {/* Action row */}
          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" size="lg" className="w-auto" onClick={onBack}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              View Positions
            </Button>
            <Button size="lg" className="w-auto" onClick={onContinue}>
              Back to Recommendations
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
