"use client";

/**
 * UserMenu — avatar button + dropdown with user info, profile, settings, logout.
 *
 * Kept as a standalone component (not inlined in TopBar) so it can be tested
 * in isolation and reused in any future header variant without pulling in the
 * full TopBar layout.
 *
 * User data comes from AuthContext — no props needed.
 * Closes on outside click (mousedown) and on Escape key.
 */

import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu(): React.ReactElement {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const initials = getInitials(displayName);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="User menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <span className="hidden text-sm font-medium text-ink sm:block">
          {displayName}
        </span>
        {/* Avatar circle with initials */}
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar text-xs font-bold text-white">
          {initials}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-20 min-w-[220px] rounded-xl border border-line bg-surface p-1 shadow-lg">
          {/* User info */}
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-ink">{displayName}</p>
            {displayEmail && (
              <p className="mt-0.5 text-xs text-ink-muted">{displayEmail}</p>
            )}
            {user?.role && (
              <span className="mt-1.5 inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
                {user.role}
              </span>
            )}
          </div>

          <div className="my-1 border-t border-line" />

          {/* Logout */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
