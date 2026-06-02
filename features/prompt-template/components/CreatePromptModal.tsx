"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_CHARS = 5000;

interface CreatePromptModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, content: string) => void;
}

export function CreatePromptModal({
  open,
  onClose,
  onCreate,
}: CreatePromptModalProps): React.ReactElement | null {
  const nameId = useId();
  const contentId = useId();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setContent("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = name.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!canSubmit) return;
    onCreate(name.trim(), content.trim());
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-2xl">
        <h2 id="create-prompt-title" className="text-xl font-bold text-ink">
          Create New Prompt
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Define a new AI instruction set for high-precision extraction and
          pricing analysis.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor={nameId}
              className="block text-sm font-medium text-ink"
            >
              Prompt Name
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. extraction_v4"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={contentId}
              className="block text-sm font-medium text-ink"
            >
              Instruction Content
            </label>
            <textarea
              id={contentId}
              value={content}
              onChange={(e) =>
                setContent(e.target.value.slice(0, MAX_CHARS))
              }
              rows={8}
              className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
            />
            <p className="text-right text-xs text-ink-subtle">
              {content.length} / {MAX_CHARS} CHARACTERS
            </p>
          </div>

          <p className="text-xs text-ink-subtle">
            These instructions will be available as a custom option in the
            Pricing Workshop.
          </p>

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-auto"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-auto"
              disabled={!canSubmit}
            >
              Create Prompt
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
