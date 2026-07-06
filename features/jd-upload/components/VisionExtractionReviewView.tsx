"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { WorkshopSidebar } from "@/features/jd-upload/components/WorkshopSidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { SubmittedJd } from "@/features/jd-upload/types";

// ─── Icons ────────────────────────────────────────────────────────────────────

function DocumentIcon(): React.ReactElement {
  return (
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
    </svg>
  );
}

function SkillPill({
  label,
  mandatory = false,
}: {
  label: string;
  mandatory?: boolean;
}): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        mandatory
          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
          : "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
      )}
    >
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface VisionExtractionReviewViewProps {
  submittedJds: SubmittedJd[];
  sourceFilename: string;
  onBack: () => void;
  onContinue: () => void;
}

export function VisionExtractionReviewView({
  submittedJds,
  sourceFilename,
  onBack,
  onContinue,
}: VisionExtractionReviewViewProps): React.ReactElement {
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
            <WorkshopStages activeStage="extraction" />
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
              <strong>Read-only.</strong> These positions were extracted by GPT-4o Vision from{" "}
              <span className="font-medium">{sourceFilename}</span>.
            </span>
          </div>

          {/* Summary line */}
          <p className="mb-4 text-sm text-ink-muted">
            {submittedJds.length === 1
              ? "1 job description was detected and created."
              : `${submittedJds.length} job descriptions were detected and created.`}
          </p>

          {/* JD cards */}
          <div className="space-y-3">
            {submittedJds.map((jd, idx) => {
              const f = jd.extractedFields;
              const allSkills = f.skills ?? [];
              const mandatory = new Set(f.mandatorySkills ?? []);
              return (
                <div
                  key={jd.jdId}
                  className="rounded-xl border border-line bg-surface p-5 shadow-sm"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50">
                      <DocumentIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-ink truncate">
                          {f.jobTitle ?? jd.fileName ?? `Position ${idx + 1}`}
                        </h3>
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
                          Vision
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted font-mono">{jd.jdId}</p>
                    </div>
                  </div>

                  {/* Fields */}
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                    {f.location && (
                      <div>
                        <dt className="text-xs text-ink-muted">Location</dt>
                        <dd className="mt-0.5 text-sm font-medium text-ink">{f.location}</dd>
                      </div>
                    )}
                    {f.experienceRequired && (
                      <div>
                        <dt className="text-xs text-ink-muted">Experience</dt>
                        <dd className="mt-0.5 text-sm font-medium text-ink">{f.experienceRequired}</dd>
                      </div>
                    )}
                    {f.sector && (
                      <div>
                        <dt className="text-xs text-ink-muted">Sector</dt>
                        <dd className="mt-0.5 text-sm font-medium text-ink">{f.sector}</dd>
                      </div>
                    )}
                    {f.employmentType && (
                      <div>
                        <dt className="text-xs text-ink-muted">Employment</dt>
                        <dd className="mt-0.5 text-sm font-medium text-ink">{f.employmentType}</dd>
                      </div>
                    )}
                  </dl>

                  {/* Skills */}
                  {allSkills.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-1.5 text-xs text-ink-muted">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allSkills.map((skill) => (
                          <SkillPill
                            key={skill}
                            label={skill}
                            mandatory={mandatory.has(skill)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
              Back to Upload
            </Button>
            <Button size="lg" className="w-auto" onClick={onContinue}>
              View Prompt
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
