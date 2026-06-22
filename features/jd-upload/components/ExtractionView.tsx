"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { AppShell } from "@/components/layout/AppShell";
import type { SubmittedJd } from "@/features/jd-upload/types";

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
  variant = "default",
}: {
  label: string;
  variant?: "default" | "mandatory";
}): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "mandatory"
          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
          : "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
      )}
    >
      {label}
    </span>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}): React.ReactElement | null {
  if (!value) return null;
  return (
    <div className="flex items-start gap-4 py-3 border-b border-line last:border-0">
      <span className="w-40 shrink-0 text-sm font-medium text-ink-muted">{label}</span>
      <span className="flex-1 text-sm text-ink">{value}</span>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }): React.ReactElement {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 70
      ? "text-green-700 bg-green-50 ring-green-200"
      : pct >= 40
        ? "text-amber-700 bg-amber-50 ring-amber-200"
        : "text-red-700 bg-red-50 ring-red-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        color,
      )}
    >
      {pct}% confidence
    </span>
  );
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

interface ExtractionViewProps {
  submittedJds: SubmittedJd[];
  loading?: boolean;
  fileNames?: string[];
  onBack: () => void;
  onContinue: () => void;
}

function SkeletonLine({ width = "w-48" }: { width?: string }): React.ReactElement {
  return <div className={cn("h-4 animate-pulse rounded bg-surface-muted", width)} />;
}

function ExtractionSkeleton(): React.ReactElement {
  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-card space-y-5">
      <div className="h-4 w-56 animate-pulse rounded bg-surface-muted" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-4 py-3 border-b border-line last:border-0">
          <SkeletonLine width="w-32" />
          <SkeletonLine width="w-64" />
        </div>
      ))}
      <div className="mt-4 space-y-2">
        <SkeletonLine width="w-24" />
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-6 w-16 animate-pulse rounded-full bg-surface-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExtractionView({
  submittedJds,
  loading = false,
  fileNames = [],
  onBack,
  onContinue,
}: ExtractionViewProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(submittedJds[0]?.fileId ?? "");

  const selected = submittedJds.find((j) => j.fileId === selectedId) ?? submittedJds[0];
  const fields = selected?.extractedFields;

  return (
    <AppShell>
      <div className="flex flex-1 flex-col">
        <header className="space-y-6">
          <h1 className="text-3xl font-bold text-ink">Pricing</h1>
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-ink">Stages</h2>
            <WorkshopStages activeStage="extraction" loading={loading} />
          </div>
        </header>

        <div className="mt-6 flex min-h-0 flex-1 gap-6">
          {/* Queue panel */}
          <div className="flex w-72 shrink-0 flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Queue ({loading ? fileNames.length : submittedJds.length})
              </span>
            </div>

            {/* Show file names as placeholders while loading */}
            {loading && fileNames.length > 0 && (
              <ul className="space-y-3">
                {fileNames.map((name, i) => (
                  <li key={i}>
                    <div className="w-full rounded-card border border-l-4 border-sidebar-active bg-surface px-4 py-4 shadow-card">
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50">
                          <DocumentIcon />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-sidebar-active">
                            {stripExtension(name)}
                          </span>
                          <span className="block text-xs text-ink-subtle">Extracting...</span>
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <ul className="space-y-3">
              {submittedJds.map((jd) => {
                const isActive = jd.fileId === selectedId;
                return (
                  <li key={jd.fileId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(jd.fileId)}
                      className={cn(
                        "w-full rounded-card border bg-surface px-4 py-4 text-left shadow-card transition-colors",
                        isActive
                          ? "border-l-4 border-sidebar-active"
                          : "border-line hover:border-sidebar-active/40",
                      )}
                    >
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50">
                          <DocumentIcon />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm font-semibold",
                              isActive ? "text-sidebar-active" : "text-ink",
                            )}
                          >
                            {stripExtension(jd.fileName)}
                          </span>
                          <span className="block truncate text-xs text-ink-subtle">
                            {jd.fileName}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto pt-4">
              <Button variant="secondary" size="md" onClick={onBack}>
                ← Back
              </Button>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-1 flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="h-7 w-64 animate-pulse rounded bg-surface-muted" />
              </div>
              <ExtractionSkeleton />
              <p className="text-sm text-ink-muted animate-pulse">
                Extracting fields with AI... this takes a few seconds
              </p>
            </div>
          )}

          {/* Extraction panel */}
          {!loading && selected && fields ? (
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-sidebar">
                  {stripExtension(selected.fileName)}
                </h2>
                <ConfidenceBadge confidence={fields.confidence} />
              </div>

              {fields.confidence < 0.4 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Low extraction confidence — some fields could not be detected automatically. You
                  can still continue.
                </div>
              )}

              <div className="rounded-card border border-line bg-surface p-6 shadow-card">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                  Extracted Information
                </h3>

                <div>
                  <FieldRow label="Job Title" value={fields.jobTitle} />
                  <FieldRow label="Experience" value={fields.experienceRequired} />
                  <FieldRow label="Location" value={fields.location} />
                  <FieldRow label="Employment Type" value={fields.employmentType} />
                  <FieldRow label="Sector" value={fields.sector} />
                </div>

                {fields.skills.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-ink">
                      Skills ({fields.skills.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {fields.skills.map((skill) => (
                        <SkillPill key={skill} label={skill} />
                      ))}
                    </div>
                  </div>
                )}

                {fields.mandatorySkills.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-ink">
                      Mandatory Skills ({fields.mandatorySkills.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {fields.mandatorySkills.map((skill) => (
                        <SkillPill key={skill} label={skill} variant="mandatory" />
                      ))}
                    </div>
                  </div>
                )}

                {fields.skills.length === 0 && !fields.jobTitle && !fields.location && (
                  <p className="mt-2 text-sm text-ink-muted">
                    No fields could be extracted automatically. The pricing pipeline will still run.
                  </p>
                )}
              </div>

              <div className="mt-auto">
                <Button size="lg" onClick={onContinue}>
                  Continue to Prompt Selection →
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
