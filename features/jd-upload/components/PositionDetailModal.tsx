"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import type { SubmittedJd } from "@/features/jd-upload/types";

interface PositionDetailModalProps {
  /** The position to show; null closes the modal. */
  jd: SubmittedJd | null;
  onClose: () => void;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
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
    <div className="flex items-start gap-4 border-b border-line py-3 last:border-0">
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

export function PositionDetailModal({
  jd,
  onClose,
}: PositionDetailModalProps): React.ReactElement | null {
  useEffect(() => {
    if (!jd) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [jd, onClose]);

  if (!jd) return null;

  const fields = jd.extractedFields;
  const title = fields.jobTitle ?? stripExtension(jd.fileName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="position-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <h2 id="position-detail-title" className="truncate text-lg font-bold text-ink">
              {title}
            </h2>
            {jd.sourceFileName && (
              <p className="mt-0.5 truncate text-xs text-ink-muted">From {jd.sourceFileName}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ConfidenceBadge confidence={fields.confidence} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
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
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
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
              <p className="mb-2 text-sm font-medium text-ink">Skills ({fields.skills.length})</p>
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
      </div>
    </div>
  );
}
