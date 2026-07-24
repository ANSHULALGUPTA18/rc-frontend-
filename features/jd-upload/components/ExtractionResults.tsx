"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { PositionDetailModal } from "@/features/jd-upload/components/PositionDetailModal";
import { AddLaborCategoryModal } from "@/features/jd-upload/components/AddLaborCategoryModal";
import { ConfirmDialog } from "@/features/jd-upload/components/ConfirmDialog";
import { CacheBadge } from "@/features/jd-upload/components/CacheBadge";
import { deriveContextDefaults } from "@/features/jd-upload/lib/manualPosition";
import type {
  FileExtractionProgress,
  ManualPositionDraft,
  ManualPositionForm,
  SubmittedJd,
} from "@/features/jd-upload/types";

interface ExtractionResultsProps {
  submittedJds: SubmittedJd[];
  fileProgress: FileExtractionProgress[];
  onRetryFile?: (fileId: string) => void;
  onBack: () => void;
  onContinue: () => void;
  /** Manually-added labor categories, each attached to a source PDF. */
  manualDrafts?: ManualPositionDraft[];
  /** Save a manual position under a PDF — draftId null creates, else updates. */
  onSaveManual?: (draftId: string | null, form: ManualPositionForm, sourceFileId: string) => void;
  onDeleteManual?: (draftId: string) => void;
  /**
   * Remove an EXTRACTED position from the workflow (e.g. a sample form the AI
   * over-detected). The position is dropped before Prompt Selection and never
   * priced. Identified by jd.fileId (the per-position key).
   */
  onDeletePosition?: (fileId: string) => void;
  /** True while manual positions are being committed on Continue. */
  committing?: boolean;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatUploaded(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function PdfIcon(): React.ReactElement {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5 text-red-500"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Extracted (non-manual) positions belonging to one source PDF. */
function positionsForFile(jds: SubmittedJd[], fileId: string): SubmittedJd[] {
  return jds.filter((jd) => !jd.isManual && (jd.sourceFileId ?? jd.fileId) === fileId);
}

function pdfType(positions: SubmittedJd[]): string {
  if (positions.length === 0) return "—";
  return positions.some((p) => p.detectionSource === "vision") ? "Scanned (Image)" : "Text";
}

function PositionRow({
  jd,
  onSelect,
  onDelete,
}: {
  jd: SubmittedJd;
  onSelect: (jd: SubmittedJd) => void;
  /** When provided, shows a trash icon so over-detected positions can be removed. */
  onDelete?: (jd: SubmittedJd) => void;
}): React.ReactElement {
  const f = jd.extractedFields;
  const title = f.jobTitle ?? stripExtension(jd.fileName);
  const meta = [f.location, f.experienceRequired].filter(Boolean).join(" · ");
  return (
    <div className="flex w-full items-start gap-1 rounded-lg border border-line bg-surface transition-colors hover:border-sidebar-active/40 hover:bg-surface-subtle">
      <button
        type="button"
        onClick={() => onSelect(jd)}
        className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5 text-left"
      >
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-active" />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{title}</span>
          {meta && <span className="block truncate text-xs text-ink-subtle">{meta}</span>}
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-subtle"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
      {onDelete && (
        <button
          type="button"
          aria-label={`Delete position ${title}`}
          title="Delete this position"
          onClick={() => onDelete(jd)}
          className="mr-1 mt-2 shrink-0 rounded-md p-1.5 text-ink-subtle hover:bg-red-50 hover:text-red-600"
        >
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
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function ExtractionResults({
  submittedJds,
  fileProgress,
  onRetryFile,
  onBack,
  onContinue,
  manualDrafts = [],
  onSaveManual,
  onDeleteManual,
  onDeletePosition,
  committing = false,
}: ExtractionResultsProps): React.ReactElement {
  const [tab, setTab] = useState<"by-pdf" | "all">("by-pdf");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailJd, setDetailJd] = useState<SubmittedJd | null>(null);
  // Position pending delete confirmation (trash icon clicked, not yet confirmed).
  const [pendingDelete, setPendingDelete] = useState<SubmittedJd | null>(null);
  const deleteHandler = onDeletePosition ? setPendingDelete : undefined;
  // Manual labor-category modal — carries the PDF it's attached to.
  // null = closed; draftId null = add new under sourceFileId.
  const [manualModal, setManualModal] = useState<{
    sourceFileId: string;
    draftId: string | null;
  } | null>(null);

  const editingDraft =
    manualModal?.draftId != null
      ? manualDrafts.find((d) => d.draftId === manualModal.draftId)
      : undefined;
  const manualEnabled = Boolean(onSaveManual);

  // Manual drafts + inherited context for a given PDF.
  const draftsForFile = (fileId: string): ManualPositionDraft[] =>
    manualDrafts.filter((d) => d.sourceFileId === fileId);
  const contextForFile = (
    fileId: string,
  ): { location: string | null; sector: string | null; client: string | null } =>
    deriveContextDefaults(positionsForFile(submittedJds, fileId));

  const toggle = (fileId: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });

  // Committed manual positions live in the "Additional Labor Categories"
  // section below, not the PDF-derived tabs.
  const extractedJds = submittedJds.filter((jd) => !jd.isManual);
  const totalPositions = extractedJds.length;

  return (
    <div className="flex flex-1 flex-col gap-4 min-h-0">
      {/* Tabs */}
      <div className="shrink-0 flex gap-6 border-b border-line">
        {(
          [
            ["by-pdf", "By PDF"],
            ["all", `All Positions (${totalPositions})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px border-b-2 pb-2 text-sm font-semibold transition-colors",
              tab === id
                ? "border-sidebar-active text-sidebar-active"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {tab === "by-pdf" ? (
          <div className="space-y-3">
            {fileProgress.map((pdf) => {
              const positions = positionsForFile(submittedJds, pdf.fileId);
              const isOpen = expanded.has(pdf.fileId);
              const failed = pdf.status === "failed";
              return (
                <div
                  key={pdf.fileId}
                  className="rounded-card border border-line bg-surface shadow-card"
                >
                  <div className="flex items-start gap-3 p-4">
                    <PdfIcon />
                    <div className="min-w-0 flex-1">
                      {/* Row 1: name + count + status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-base font-bold text-ink">
                            {pdf.fileName}
                          </span>
                          {!failed && (
                            <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                              {positions.length} position{positions.length === 1 ? "" : "s"}
                            </span>
                          )}
                          {!failed && <CacheBadge cache={pdf.cache} />}
                        </div>
                        {failed ? (
                          <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-red-600">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                              className="h-4 w-4"
                            >
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                            Failed
                          </span>
                        ) : (
                          <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-green-600">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                              className="h-4 w-4"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Completed
                          </span>
                        )}
                      </div>

                      {/* Row 2: metadata + action */}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="truncate text-xs text-ink-muted">
                          Uploaded: {formatUploaded(pdf.uploadedAt)} · Type: {pdfType(positions)} ·
                          Size: {formatBytes(pdf.sizeBytes)}
                        </span>
                        {failed
                          ? onRetryFile && (
                              <button
                                type="button"
                                onClick={() => onRetryFile(pdf.fileId)}
                                className="shrink-0 rounded-lg border border-sidebar-active/40 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-sidebar-active hover:bg-blue-100"
                              >
                                Retry
                              </button>
                            )
                          : positions.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggle(pdf.fileId)}
                                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-sidebar-active hover:border-sidebar-active/40"
                              >
                                View Positions
                                <ChevronIcon open={isOpen} />
                              </button>
                            )}
                      </div>

                      {failed && pdf.error && (
                        <p className="mt-2 text-xs text-red-600">{pdf.error}</p>
                      )}
                    </div>
                  </div>

                  {/* Expanded positions */}
                  {isOpen && positions.length > 0 && (
                    <div className="border-t border-line bg-surface-subtle p-4">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {positions.map((jd) => (
                          <PositionRow
                            key={jd.fileId}
                            jd={jd}
                            onSelect={setDetailJd}
                            onDelete={deleteHandler}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-PDF manual labor categories — inherit THIS PDF's context */}
                  {manualEnabled &&
                    !failed &&
                    (() => {
                      const pdfDrafts = draftsForFile(pdf.fileId);
                      return (
                        <div className="border-t border-dashed border-line bg-surface-subtle/60 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                              Additional Labor Categories
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setManualModal({ sourceFileId: pdf.fileId, draftId: null })
                              }
                              className="shrink-0 rounded-lg border border-sidebar-active/40 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-sidebar-active hover:bg-blue-100"
                            >
                              + Add Labor Category
                            </button>
                          </div>

                          {pdfDrafts.length > 0 && (
                            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {pdfDrafts.map((d) => {
                                const meta = [
                                  d.form.location || contextForFile(pdf.fileId).location,
                                  d.form.experience,
                                ]
                                  .filter(Boolean)
                                  .join(" · ");
                                return (
                                  <li
                                    key={d.draftId}
                                    className="flex items-start gap-3 rounded-lg border border-line bg-surface px-3 py-2.5"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-medium text-ink">
                                          {d.form.laborCategory}
                                        </span>
                                        <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700 ring-1 ring-purple-200">
                                          Manual
                                        </span>
                                      </div>
                                      {meta && (
                                        <span className="block truncate text-xs text-ink-subtle">
                                          {meta}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setManualModal({
                                            sourceFileId: pdf.fileId,
                                            draftId: d.draftId,
                                          })
                                        }
                                        className="rounded-md px-2 py-1 text-xs font-semibold text-sidebar-active hover:bg-blue-50"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeleteManual?.(d.draftId)}
                                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })()}
                </div>
              );
            })}
          </div>
        ) : (
          // All Positions — flat list across every PDF
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {extractedJds.map((jd) => (
              <PositionRow
                key={jd.fileId}
                jd={jd}
                onSelect={setDetailJd}
                onDelete={deleteHandler}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center justify-between">
        <Button
          variant="secondary"
          size="md"
          className="w-auto"
          onClick={onBack}
          disabled={committing}
        >
          ← Back
        </Button>
        <Button size="lg" className="w-auto" onClick={onContinue} disabled={committing}>
          {committing ? "Adding labor categories…" : "Continue to Prompt Selection →"}
        </Button>
      </div>

      {/* Per-position extracted-fields detail */}
      <PositionDetailModal jd={detailJd} onClose={() => setDetailJd(null)} />

      {/* Confirm removing an over-detected position */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this position?"
        message={`"${
          pendingDelete?.extractedFields.jobTitle ??
          (pendingDelete ? stripExtension(pendingDelete.fileName) : "")
        }" will be removed from this batch and will not be priced. This cannot be undone here — re-upload the file to get it back.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) onDeletePosition?.(pendingDelete.fileId);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Add / edit a manual labor category (scoped to one PDF) */}
      <AddLaborCategoryModal
        open={manualModal !== null}
        editing={Boolean(editingDraft)}
        initialForm={editingDraft?.form}
        inheritedContext={manualModal ? contextForFile(manualModal.sourceFileId) : undefined}
        onCancel={() => setManualModal(null)}
        onSave={(form) => {
          if (manualModal) {
            onSaveManual?.(manualModal.draftId, form, manualModal.sourceFileId);
          }
          setManualModal(null);
        }}
      />
    </div>
  );
}
