"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { apiFetch } from "@/lib/api/client";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import { cn } from "@/lib/utils/cn";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UserIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingsIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogoutIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function BellIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  items: NotificationItem[];
  unread_count: number;
}

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`h-3.5 w-3.5 transition-transform text-ink-subtle ${open ? "rotate-180" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopBar(): React.ReactElement {
  const { user, logout } = useAuth();
  const msal = useMsalTokenContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationsResponse>("/v1/notifications", { msal }),
    refetchInterval: 15000,
  });

  const unreadCount = notifications?.unread_count ?? 0;

  const handleMarkRead = async (id: string): Promise<void> => {
    await apiFetch(`/v1/notifications/${id}/read`, { method: "POST", msal });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent): void => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  // Close on Escape
  useEffect(() => {
    if (!open && !bellOpen) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") { setOpen(false); setBellOpen(false); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const initials = getInitials(displayName);

  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-line bg-surface px-6">
      {/* Bell icon */}
      <div ref={bellRef} className="relative">
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => setBellOpen((v) => !v)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {bellOpen && (
          <div className="absolute right-0 top-11 z-30 w-80 rounded-xl border border-line bg-surface shadow-lg">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-bold text-ink">Notifications</h3>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {(!notifications?.items || notifications.items.length === 0) ? (
                <div className="px-4 py-8 text-center text-sm text-ink-muted">
                  No notifications yet
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {notifications.items.map((n) => (
                    <li
                      key={n.id}
                      className={cn(
                        "px-4 py-3 transition-colors hover:bg-surface-muted cursor-pointer",
                        !n.read && "bg-blue-50/50",
                      )}
                      onClick={() => {
                        if (!n.read) void handleMarkRead(n.id);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">{n.title}</p>
                          <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{n.message}</p>
                          <p className="mt-1 text-[10px] text-ink-subtle">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div ref={ref} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          aria-label="User menu"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
        >
          {/* Name */}
          <span className="hidden text-sm font-medium text-ink sm:block">
            {displayName}
          </span>
          {/* Avatar */}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar text-xs font-bold text-white">
            {initials}
          </span>
          <ChevronIcon open={open} />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-30 w-60 rounded-xl border border-line bg-surface py-1.5 shadow-lg"
          >
            {/* User info header */}
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-ink">{displayName}</p>
              {displayEmail && (
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {displayEmail}
                </p>
              )}
              {user?.role && (
                <span className="mt-1.5 inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
                  {user.role}
                </span>
              )}
            </div>

            <div className="mx-2 my-1 border-t border-line" />

            {/* Profile */}
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-surface-muted"
            >
              <UserIcon />
              Profile
            </Link>

            {/* Settings */}
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-surface-muted"
            >
              <SettingsIcon />
              Settings
            </Link>

            <div className="mx-2 my-1 border-t border-line" />

            {/* Logout */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
            >
              <LogoutIcon />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
