"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface VisionConfirmModalProps {
  open: boolean;
  filename: string;
  pageCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

function ScanIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 text-amber-600"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

export function VisionConfirmModal({
  open,
  filename,
  pageCount,
  onCancel,
  onConfirm,
}: VisionConfirmModalProps): React.ReactElement | null {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vision-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
            <ScanIcon />
          </div>
          <div className="min-w-0">
            <h2 id="vision-confirm-title" className="text-lg font-bold text-ink">
              Scanned Document Detected
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              This document contains image pages that require AI Vision processing to extract positions.
            </p>
          </div>
        </div>

        {/* File info */}
        <div className="mt-4 rounded-lg border border-line bg-surface-subtle px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">File</span>
            <span className="font-medium text-ink truncate ml-4 max-w-[200px]" title={filename}>
              {filename}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Pages</span>
            <span className="font-medium text-ink">{pageCount}</span>
          </div>
        </div>

        {/* Info notice */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-amber-600 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <p className="text-xs text-amber-800">
            GPT-4o Vision will read all {pageCount} pages and extract job positions. You will then select a pricing prompt before recommendations are generated.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3 border-t border-line pt-4">
          <Button type="button" variant="secondary" size="md" className="w-auto" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="md" className="w-auto" onClick={onConfirm}>
            Proceed with Vision
          </Button>
        </div>
      </div>
    </div>
  );
}
