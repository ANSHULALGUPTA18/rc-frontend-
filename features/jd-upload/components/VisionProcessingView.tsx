"use client";

import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { WorkshopSidebar } from "@/features/jd-upload/components/WorkshopSidebar";
import { TopBar } from "@/components/layout/TopBar";

interface Step {
  label: string;
  status: "done" | "active" | "pending";
}

const STEPS: Step[] = [
  { label: "Document uploaded", status: "done" },
  { label: "Reading all pages with AI Vision", status: "active" },
  { label: "Extracting job positions", status: "pending" },
];

function StepRow({ step }: { step: Step }): React.ReactElement {
  return (
    <li className="flex items-center gap-3">
      {step.status === "done" && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-3.5 w-3.5 text-green-600"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      )}
      {step.status === "active" && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin text-sidebar-active"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </span>
      )}
      {step.status === "pending" && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-subtle" />
        </span>
      )}
      <span
        className={
          step.status === "done"
            ? "text-sm text-green-700 line-through decoration-green-400"
            : step.status === "active"
              ? "text-sm font-medium text-ink"
              : "text-sm text-ink-muted"
        }
      >
        {step.label}
      </span>
    </li>
  );
}

interface VisionProcessingViewProps {
  filename: string;
  pageCount: number;
}

export function VisionProcessingView({
  filename,
  pageCount,
}: VisionProcessingViewProps): React.ReactElement {
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
            <WorkshopStages activeStage="upload" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 pt-8 pb-10 lg:px-10">
          <div className="w-full max-w-lg space-y-6">
            {/* Main card */}
            <div className="rounded-xl border border-line bg-surface p-8 shadow-sm">
              {/* Pulsing icon */}
              <div className="flex justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-sidebar-active opacity-10" />
                  <span className="absolute inset-2 animate-pulse rounded-full bg-sidebar-active opacity-15" />
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="relative h-8 w-8 text-sidebar-active"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
              </div>

              <h2 className="mt-5 text-center text-xl font-bold text-ink">
                Analyzing with AI Vision
              </h2>
              <p className="mt-1.5 text-center text-sm text-ink-muted">
                GPT-4o is processing your document. This typically takes 15–30 seconds.
              </p>

              {/* Document info */}
              <div className="mt-6 rounded-lg border border-line bg-surface-subtle px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">File</span>
                  <span className="max-w-[220px] truncate font-medium text-ink" title={filename}>
                    {filename}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Pages</span>
                  <span className="font-medium text-ink">{pageCount}</span>
                </div>
              </div>

              {/* Steps */}
              <ul className="mt-6 space-y-3">
                {STEPS.map((step) => (
                  <StepRow key={step.label} step={step} />
                ))}
              </ul>

              <p className="mt-6 text-center text-xs text-ink-subtle">
                Do not close this tab while processing is in progress.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
