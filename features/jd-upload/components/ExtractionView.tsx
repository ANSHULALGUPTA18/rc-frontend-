"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { WorkshopSidebar } from "@/features/jd-upload/components/WorkshopSidebar";
import { ExtractionResults } from "@/features/jd-upload/components/ExtractionResults";
import { TopBar } from "@/components/layout/TopBar";
import type {
  ExtractionStatus,
  FileExtractionProgress,
  ManualPositionDraft,
  ManualPositionForm,
  SubmittedJd,
} from "@/features/jd-upload/types";

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

function SkillPill({ label, variant = "default" }: { label: string; variant?: "default" | "mandatory" }): React.ReactElement {
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

function FieldRow({ label, value }: { label: string; value: string | null | undefined }): React.ReactElement | null {
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
    pct >= 70 ? "text-green-700 bg-green-50 ring-green-200" :
    pct >= 40 ? "text-amber-700 bg-amber-50 ring-amber-200" :
    "text-red-700 bg-red-50 ring-red-200";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", color)}>
      {pct}% confidence
    </span>
  );
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/** Status glyph for a PDF in the batch progress list. */
function StatusIcon({ status }: { status: ExtractionStatus }): React.ReactElement {
  if (status === "completed") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5 text-green-600">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-sidebar-active">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5 text-red-600">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </span>
    );
  }
  // pending
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-subtle" />
    </span>
  );
}

const STATUS_LABEL: Record<ExtractionStatus, string> = {
  pending: "Waiting…",
  processing: "Processing…",
  completed: "",
  failed: "Failed",
};

/** One row in the live batch progress list. */
function FileProgressRow({
  entry,
  onRetry,
}: {
  entry: FileExtractionProgress;
  onRetry?: (fileId: string) => void;
}): React.ReactElement {
  const subtitle =
    entry.status === "completed"
      ? `${entry.positionCount} position${entry.positionCount === 1 ? "" : "s"}`
      : entry.status === "failed"
        ? entry.error ?? STATUS_LABEL.failed
        : STATUS_LABEL[entry.status];

  return (
    <div className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <StatusIcon status={entry.status} />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {stripExtension(entry.fileName)}
          </span>
          <span
            className={cn(
              "block truncate text-xs",
              entry.status === "failed" ? "text-red-600" : "text-ink-subtle",
            )}
          >
            {subtitle}
          </span>
        </div>
        {entry.status === "failed" && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(entry.fileId)}
            className="shrink-0 rounded-md border border-sidebar-active/40 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-sidebar-active hover:bg-blue-100"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

interface ExtractionViewProps {
  submittedJds: SubmittedJd[];
  loading?: boolean;
  fileNames?: string[];
  /** Live per-PDF status during batch extraction (empty for the single-file path). */
  fileProgress?: FileExtractionProgress[];
  /** Retry one failed PDF (fileId from fileProgress). */
  onRetryFile?: (fileId: string) => void;
  onBack: () => void;
  onContinue: () => void;
  /** Manually-added labor categories (not present in any uploaded JD). */
  manualDrafts?: ManualPositionDraft[];
  onSaveManual?: (draftId: string | null, form: ManualPositionForm, sourceFileId: string) => void;
  onDeleteManual?: (draftId: string) => void;
  committing?: boolean;
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
  fileProgress = [],
  onRetryFile,
  onBack,
  onContinue,
  manualDrafts,
  onSaveManual,
  onDeleteManual,
  committing,
}: ExtractionViewProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(submittedJds[0]?.fileId ?? "");

  const selected = submittedJds.find((j) => j.fileId === selectedId) ?? submittedJds[0];
  const fields = selected?.extractedFields;

  // Batch mode: multiple PDFs tracked via the worker pool. The single-file path
  // leaves fileProgress empty and falls back to the plain skeleton.
  const isBatch = fileProgress.length > 0;
  const settledCount = fileProgress.filter(
    (p) => p.status === "completed" || p.status === "failed",
  ).length;
  const failedProgress = fileProgress.filter((p) => p.status === "failed");

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
            <WorkshopStages activeStage="extraction" loading={loading} />
          </div>
          {isBatch && (
            <p className="mt-3 text-sm text-ink-muted">
              {loading
                ? `Processing ${settledCount} of ${fileProgress.length} files — ${submittedJds.length} position${submittedJds.length === 1 ? "" : "s"} extracted so far`
                : `${fileProgress.length - failedProgress.length} of ${fileProgress.length} files processed — ${submittedJds.length} position${submittedJds.length === 1 ? "" : "s"} extracted${failedProgress.length > 0 ? `, ${failedProgress.length} failed` : ""}`}
            </p>
          )}
        </div>

        {/* Content area — no page scroll */}
        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 lg:px-10">
        {/* Batch mode, after extraction: organize positions by source PDF */}
        {isBatch && !loading ? (
          <ExtractionResults
            submittedJds={submittedJds}
            fileProgress={fileProgress}
            onRetryFile={onRetryFile}
            onBack={onBack}
            onContinue={onContinue}
            manualDrafts={manualDrafts}
            onSaveManual={onSaveManual}
            onDeleteManual={onDeleteManual}
            committing={committing}
          />
        ) : (
        <div className="flex min-h-0 flex-1 gap-6">
          {/* Queue panel — stretches to match extraction panel height */}
          <div className="flex w-72 shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Queue ({isBatch && loading ? fileProgress.length : submittedJds.length})
              </span>
            </div>

            {/* Batch mode: live per-PDF status list (during extraction) */}
            {isBatch && loading && (
              <ul className="flex-1 min-h-0 overflow-y-auto space-y-2">
                {fileProgress.map((p) => (
                  <li key={p.fileId}>
                    <FileProgressRow entry={p} onRetry={onRetryFile} />
                  </li>
                ))}
              </ul>
            )}

            {/* Batch mode: failed PDFs with retry (after extraction) */}
            {isBatch && !loading && failedProgress.length > 0 && (
              <ul className="shrink-0 space-y-2 pb-1">
                {failedProgress.map((p) => (
                  <li key={p.fileId}>
                    <FileProgressRow entry={p} onRetry={onRetryFile} />
                  </li>
                ))}
              </ul>
            )}

            {/* Single-file placeholder while loading */}
            {loading && !isBatch && fileNames.length > 0 && (
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

            {/* JD browser — hidden during batch extraction (shown once done) */}
            {!(isBatch && loading) && (
            <ul className="flex-1 min-h-0 overflow-y-auto space-y-2">
              {submittedJds.map((jd) => {
                const isActive = jd.fileId === selectedId;
                return (
                  <li key={jd.fileId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(jd.fileId)}
                      className={cn(
                        "w-full rounded-lg border bg-surface px-3 py-3 text-left transition-colors",
                        isActive
                          ? "border-l-4 border-sidebar-active"
                          : "border-line hover:border-sidebar-active/40",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50">
                          <DocumentIcon />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-sm font-semibold",
                              isActive ? "text-sidebar-active" : "text-ink",
                            )}
                          >
                            {stripExtension(jd.fileName)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            )}

            <div className="mt-auto shrink-0 pt-3">
              <Button variant="secondary" size="md" onClick={onBack}>
                ← Back
              </Button>
            </div>
          </div>

          {/* Right panel while extracting: batch progress summary or single-file skeleton */}
          {loading && isBatch && (
            <div className="flex flex-1 items-start justify-center">
              <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 shadow-card">
                <div className="flex justify-center">
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-sidebar-active opacity-10" />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="relative h-7 w-7 animate-spin text-sidebar-active">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </div>
                </div>
                <h2 className="mt-4 text-center text-lg font-bold text-ink">
                  Extracting positions
                </h2>
                <p className="mt-1 text-center text-sm text-ink-muted">
                  Processing up to 5 files at a time. You can watch progress in the queue.
                </p>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-xs text-ink-muted">
                    <span>{settledCount} of {fileProgress.length} files</span>
                    <span>{submittedJds.length} position{submittedJds.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-sidebar-active transition-all duration-300"
                      style={{ width: `${fileProgress.length ? (settledCount / fileProgress.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <p className="mt-5 text-center text-xs text-ink-subtle">
                  Do not close this tab while processing is in progress.
                </p>
              </div>
            </div>
          )}

          {/* Single-file loading skeleton */}
          {loading && !isBatch && (
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
            <div className="flex flex-1 flex-col gap-4 min-h-0">
              {/* Fixed: title + badge */}
              <div className="shrink-0 flex items-center gap-3">
                <h2 className="text-2xl font-bold text-sidebar">
                  {stripExtension(selected.fileName)}
                </h2>
                <ConfidenceBadge confidence={fields.confidence} />
              </div>

              {fields.confidence < 0.4 && (
                <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Low extraction confidence — some fields could not be detected automatically. You can still continue.
                </div>
              )}

              {/* Scrollable: extracted info card */}
              <div className="flex-1 min-h-0 overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-card">
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

              <div className="shrink-0 pt-2">
                <Button size="lg" onClick={onContinue}>
                  Continue to Prompt Selection →
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        )}
        </div>
      </div>
    </div>
  );
}
