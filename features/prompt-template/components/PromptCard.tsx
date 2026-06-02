"use client";

import { useEffect, useRef, useState } from "react";
import type { PromptTemplate } from "@/features/prompt-template/types";

interface PromptCardProps {
  template: PromptTemplate;
  onSetDefault: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

function DotsIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export function PromptCard({
  template,
  onSetDefault,
  onEdit,
  onDelete,
}: PromptCardProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <article className="flex flex-col rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="flex-1 truncate text-sm font-semibold text-ink">
          {template.name}
        </span>
        {template.isDefault && (
          <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-muted">
            Default
          </span>
        )}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label="More options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-muted hover:text-ink"
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 min-w-[160px] rounded-lg border border-line bg-surface py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  onSetDefault(template.id);
                  setMenuOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-muted"
              >
                Set as Default
              </button>
              <button
                type="button"
                onClick={() => {
                  onEdit(template.id);
                  setMenuOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-muted"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(template.id);
                  setMenuOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 border-t border-line px-4 py-3">
        <p className="line-clamp-5 text-sm text-ink-muted">{template.content}</p>
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          Used in {template.usedInCampaigns} campaigns
        </span>
        <span className="text-xs text-ink-subtle">
          Edited {formatRelativeTime(template.editedAt)}
        </span>
      </div>
    </article>
  );
}
