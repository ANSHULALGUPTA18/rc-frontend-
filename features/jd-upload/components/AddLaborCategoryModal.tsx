"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { emptyManualForm } from "@/features/jd-upload/lib/manualPosition";
import type { ManualPositionForm } from "@/features/jd-upload/types";

interface AddLaborCategoryModalProps {
  open: boolean;
  /** Pre-filled form when editing an existing manual position; empty for add. */
  initialForm?: ManualPositionForm;
  /** Whether we're editing (changes the heading + button label). */
  editing?: boolean;
  /** Context inherited from the uploaded document, shown as a hint. */
  inheritedContext?: { location: string | null; sector: string | null };
  onCancel: () => void;
  onSave: (form: ManualPositionForm) => void;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active";

export function AddLaborCategoryModal({
  open,
  initialForm,
  editing = false,
  inheritedContext,
  onCancel,
  onSave,
}: AddLaborCategoryModalProps): React.ReactElement | null {
  const [form, setForm] = useState<ManualPositionForm>(initialForm ?? emptyManualForm());

  // Reset the form whenever the modal (re)opens for a different target.
  useEffect(() => {
    if (open) setForm(initialForm ?? emptyManualForm());
  }, [open, initialForm]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const patch = (p: Partial<ManualPositionForm>): void => setForm((prev) => ({ ...prev, ...p }));
  const canSave = form.laborCategory.trim().length > 0;

  const contextHint = [
    inheritedContext?.location ? `Location: ${inheritedContext.location}` : null,
    inheritedContext?.sector ? `Sector: ${inheritedContext.sector}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-lcat-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onCancel} />

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-xl border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="border-b border-line p-5">
          <h2 id="add-lcat-title" className="text-lg font-bold text-ink">
            {editing ? "Edit Labor Category" : "Add Additional Labor Category"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Add a labor category requested by the client but not included in the uploaded JD. It
            will use the same client and contract context from the uploaded document.
          </p>
          {contextHint && (
            <p className="mt-2 rounded-md bg-surface-subtle px-2.5 py-1.5 text-xs text-ink-muted">
              Inherited context — {contextHint}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <Field label="Labor Category" required>
            <input
              autoFocus
              type="text"
              value={form.laborCategory}
              onChange={(e) => patch({ laborCategory: e.target.value })}
              placeholder="e.g. Project Manager"
              className={cn(
                inputCls,
                !form.laborCategory.trim() &&
                  "border-red-300 focus:border-red-400 focus:ring-red-300",
              )}
            />
            {!form.laborCategory.trim() && (
              <p className="text-xs text-red-500">Labor Category is required</p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Location">
              <input
                type="text"
                value={form.location}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder={inheritedContext?.location ?? "Enter location"}
                className={inputCls}
              />
            </Field>
            <Field label="Experience">
              <input
                type="text"
                value={form.experience}
                onChange={(e) => patch({ experience: e.target.value })}
                placeholder="e.g. 5+ years"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Education">
              <input
                type="text"
                value={form.education}
                onChange={(e) => patch({ education: e.target.value })}
                placeholder="e.g. Bachelor's degree"
                className={inputCls}
              />
            </Field>
            <Field label="Employment Type">
              <input
                type="text"
                value={form.employmentType}
                onChange={(e) => patch({ employmentType: e.target.value })}
                placeholder="e.g. Contract"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Skills">
            <input
              type="text"
              value={form.skills}
              onChange={(e) => patch({ skills: e.target.value })}
              placeholder="Comma-separated, e.g. PMP, Agile, MS Project"
              className={inputCls}
            />
            <p className="text-xs text-ink-subtle">Separate skills with commas.</p>
          </Field>

          <Field label="Responsibilities">
            <textarea
              value={form.responsibilities}
              onChange={(e) => patch({ responsibilities: e.target.value })}
              rows={3}
              placeholder="Key duties for this labor category…"
              className={cn(inputCls, "resize-none")}
            />
          </Field>

          <Field label="Additional Notes">
            <textarea
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={2}
              placeholder="Anything else relevant to pricing…"
              className={cn(inputCls, "resize-none")}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-line p-4">
          <Button type="button" variant="secondary" size="md" className="w-auto" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-auto"
            disabled={!canSave}
            onClick={() => canSave && onSave(form)}
          >
            {editing ? "Save Changes" : "Add Labor Category"}
          </Button>
        </div>
      </div>
    </div>
  );
}
