"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

function DatabaseIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function CacheIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
    </svg>
  );
}

function ChevronRightIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 text-ink-subtle"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

interface SettingsSection {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const SECTIONS: SettingsSection[] = [
  {
    label: "Database",
    description: "Browse and inspect database tables.",
    href: "/settings/database",
    icon: <DatabaseIcon />,
  },
  {
    label: "Cache",
    description: "Monitor cache hit rates and clear the cache.",
    href: "/settings/cache",
    icon: <CacheIcon />,
  },
];

export function SettingsView(): React.ReactElement {
  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage system configuration and administration.
        </p>

        <div className="mt-8 space-y-3">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-card transition-colors hover:border-brand hover:bg-surface-muted"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
                {section.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink">{section.label}</p>
                <p className="text-sm text-ink-muted">{section.description}</p>
              </div>
              <ChevronRightIcon />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
