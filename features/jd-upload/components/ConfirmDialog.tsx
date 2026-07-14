"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmDialog — centered confirmation modal with Confirm / Cancel actions.
 * Closes on backdrop click or Escape (both treated as cancel).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Apply",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.ReactElement | null {
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
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sidebar-active/30 bg-blue-50">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5 text-sidebar-active"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-ink">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
          <Button type="button" variant="secondary" size="md" className="w-auto" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="primary" size="md" className="w-auto" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
