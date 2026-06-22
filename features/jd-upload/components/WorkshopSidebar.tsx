"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  children?: NavChild[];
}

function GridIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function WorkshopIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 9h18" />
      <path d="M3 5h18v14H3z" />
      <path d="M7 13h6" />
    </svg>
  );
}

function ReportsIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h8" />
    </svg>
  );
}

function SettingsIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ShieldIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function UsersIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const BASE_NAV: NavItem[] = [
  { label: "Dashboard", icon: <GridIcon />, href: "/dashboard" },
  {
    label: "Pricing Workshop",
    icon: <WorkshopIcon />,
    href: "/jd-upload",
    children: [
      { label: "Upload Doc", href: "/jd-upload" },
      { label: "Prompt Template", href: "/prompt-template" },
    ],
  },
  { label: "Reports", icon: <ReportsIcon />, href: "/reports" },
  { label: "Settings", icon: <SettingsIcon />, href: "/settings" },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Approval Queue", icon: <ShieldIcon />, href: "/admin" },
  { label: "User Management", icon: <UsersIcon />, href: "/admin/users" },
];

const WORKSHOP_PATHS = ["/jd-upload", "/prompt-template"];

/**
 * WorkshopSidebar
 *
 * Two independent pieces of state:
 *   collapsed     — controls the sidebar width (w-64 ↔ w-16 icon-only mode).
 *   workshopOpen  — controls the Pricing Workshop submenu visibility.
 *                   Initialised from the current pathname so the submenu starts
 *                   open when the user lands on a workshop route, but can be
 *                   toggled independently afterwards.
 *
 * Active-route highlighting is driven by usePathname() — no props required.
 */
export function WorkshopSidebar(): React.ReactElement {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [workshopOpen, setWorkshopOpen] = useState(() =>
    WORKSHOP_PATHS.some((p) => pathname.startsWith(p)),
  );
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const NAV_ITEMS = isAdmin ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-sidebar text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 py-5">
        <Image
          src="/logo.png"
          alt="RC Pricing"
          width={40}
          height={40}
          className="shrink-0 rounded-full"
        />
        {!collapsed && (
          <span className="leading-tight">
            <span className="block text-lg font-bold">RC Pricing</span>
            <span className="block text-[11px] text-sidebar-muted">
              powered by Techgene
            </span>
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <div className={cn("flex pb-2", collapsed ? "justify-center" : "justify-end px-5")}>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 items-center justify-center rounded-full text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn("h-4 w-4 transition-transform", collapsed ? "rotate-180" : "")}
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isGroupActive = hasChildren
            ? WORKSHOP_PATHS.some((p) => pathname.startsWith(p))
            : item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <div key={item.label}>
              {hasChildren ? (
                /* Pricing Workshop — clickable button that toggles children */
                <button
                  type="button"
                  aria-expanded={workshopOpen}
                  onClick={() => setWorkshopOpen((v) => !v)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isGroupActive
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white",
                  )}
                >
                  <span className="h-5 w-5 shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={cn(
                          "h-4 w-4 transition-transform",
                          workshopOpen ? "" : "rotate-180",
                        )}
                      >
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  aria-current={isGroupActive ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isGroupActive
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white",
                  )}
                >
                  <span className="h-5 w-5 shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                </Link>
              )}

              {/* Children (Upload Doc / Prompt Template) */}
              {hasChildren && workshopOpen && !collapsed && item.children && (
                <div className="mt-1 space-y-1 pl-11">
                  {item.children.map((child) => {
                    const childActive = pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.label}
                        href={child.href}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "block rounded-md px-3 py-2 text-sm transition-colors",
                          childActive
                            ? "bg-sidebar-hover font-medium text-white"
                            : "text-sidebar-muted hover:text-white",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
