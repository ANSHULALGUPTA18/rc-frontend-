"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  getKpiStats,
  getApprovals,
  getReports,
  approveRecommendation,
  rejectRecommendation,
  type KpiStats,
  type ApprovalRow,
  type ReportItem,
} from "@/features/dashboard/api/client";

// ─── Icons ────────────────────────────────────────────────────────────────────

function ListIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <rect x="3" y="11" width="18" height="2" rx="1" />
      <rect x="3" y="17" width="18" height="2" rx="1" />
    </svg>
  );
}

function RefreshIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-5 w-5">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function PieIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-5 w-5">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

function PlusIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckUserIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

function ClockIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function DotsIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4 text-ink-subtle">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function DownloadIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function FileIcon({ type }: { type: string }): React.ReactElement {
  return (
    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md border border-line bg-surface-muted">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="h-5 w-5 text-ink-subtle">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      <span className="text-[8px] font-bold uppercase text-ink-subtle">{type}</span>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  subtext: React.ReactNode;
}

function KpiCard({ label, value, icon, subtext }: KpiCardProps): React.ReactElement {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </span>
        <span className="text-ink-subtle">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      <div className="mt-1">{subtext}</div>
    </div>
  );
}

function AccurateBadge({ text }: { text: string }): React.ReactElement {
  return <span className="text-xs font-medium text-green-600">{text}</span>;
}

function OptimalBadge(): React.ReactElement {
  return (
    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
      Optimal Range
    </span>
  );
}

function StatusBadge({ status }: { status: "approved" | "pending" }): React.ReactElement {
  if (status === "approved") {
    return (
      <span className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white">
        <CheckUserIcon />
        Approved
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
      <ClockIcon />
      Pending
    </span>
  );
}

function ApproveButton({ onClick, loading }: { onClick: () => void; loading: boolean }): React.ReactElement {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
    >
      <CheckUserIcon />
      {loading ? "..." : "Approve"}
    </button>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function DashboardView(): React.ReactElement {
  const router = useRouter();
  const msal = useMsalTokenContext();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { data: kpi, isLoading: kpiLoading, error: kpiError } = useQuery({ queryKey: ["kpi"], queryFn: () => getKpiStats(msal) });
  const { data: approvals = [], isLoading: approvalsLoading, error: approvalsError, refetch: refetchApprovals } = useQuery({ queryKey: ["approvals"], queryFn: () => getApprovals(msal) });
  const { data: reports = [], isLoading: reportsLoading, error: reportsError, refetch: refetchReports } = useQuery({ queryKey: ["reports"], queryFn: getReports });

  const handleApprove = async (recId: string): Promise<void> => {
    setApprovingId(recId);
    try {
      await approveRecommendation(recId, msal);
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
      void queryClient.invalidateQueries({ queryKey: ["kpi"] });
    } catch {
      // Error handling — could add toast notification
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <AppShell>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-ink">Dashboard</h1>
          <button
            type="button"
            onClick={() => router.push("/jd/upload")}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <PlusIcon />
            New Pricing Request
          </button>
        </div>

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpiLoading && <div className="col-span-4"><LoadingSpinner /></div>}
          {kpiError  && <div className="col-span-4"><ErrorState message="Failed to load stats." /></div>}
          {kpi && <>
          <KpiCard
            label="Active Requests"
            value={kpi.activeRequests.toLocaleString()}
            icon={<ListIcon />}
            subtext={<AccurateBadge text={kpi.activeRequestsTrend} />}
          />
          <KpiCard
            label="Pending Approvals"
            value={kpi.pendingApprovals.toLocaleString()}
            icon={<ListIcon />}
            subtext={<AccurateBadge text={kpi.pendingApprovalsTrend} />}
          />
          <KpiCard
            label="Completed"
            value={kpi.recentPricingReports.toLocaleString()}
            icon={<RefreshIcon />}
            subtext={<AccurateBadge text={kpi.accuracyRate} />}
          />
          <KpiCard
            label="Avg Margin"
            value={kpi.avgMargin}
            icon={<PieIcon />}
            subtext={<OptimalBadge />}
          />
          </>}
        </div>

        {/* Main content */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

          {/* Pending Approvals */}
          <div className="rounded-card border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-base font-bold text-ink">Pending Approvals</h2>
              <button type="button" className="text-sm font-medium text-sidebar-active hover:underline">
                View all
              </button>
            </div>

            {approvalsLoading && <LoadingSpinner />}
            {approvalsError && <ErrorState message="Failed to load approvals." onRetry={() => void refetchApprovals()} />}
            {!approvalsLoading && !approvalsError && approvals.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-ink-muted">
                No pricing requests yet.{" "}
                <button
                  type="button"
                  onClick={() => router.push("/jd/upload")}
                  className="font-medium text-sidebar-active hover:underline"
                >
                  Upload a JD to get started.
                </button>
              </div>
            )}
            {!approvalsLoading && !approvalsError && approvals.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                      JD ID
                    </th>
                    {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                      Submitted By
                    </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                      Pay / Bill Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                      AI Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="px-6 py-4 font-medium text-ink">
                        <span className="block truncate font-mono text-xs text-ink">{row.jdId}</span>
                        <span className="block text-xs text-ink-muted">Markup {row.markupPct}%</span>
                      </td>
                      {isAdmin && (
                      <td className="px-6 py-4">
                        {row.submittedByName ? (
                          <>
                            <span className="block text-sm font-medium text-ink">{row.submittedByName}</span>
                            <span className="block text-xs text-ink-muted">{row.submittedByEmail}</span>
                          </>
                        ) : (
                          <span className="text-xs text-ink-subtle">—</span>
                        )}
                      </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="block font-medium text-ink">{row.payRateRange}</span>
                        <span className="block text-xs text-ink-muted">{row.billRateRange}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-sidebar-active">
                        {row.aiConfidence}%
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isAdmin && row.status === "pending" ? (
                            <ApproveButton
                              onClick={() => void handleApprove(row.id)}
                              loading={approvingId === row.id}
                            />
                          ) : (
                            <StatusBadge status={row.status} />
                          )}
                          <button
                            type="button"
                            aria-label="More options"
                            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface-muted"
                          >
                            <DotsIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            <div className="flex items-center justify-between border-t border-line px-6 py-3">
              <span className="text-xs text-ink-muted">
                {approvals.length === 0
                  ? "No results"
                  : `Showing ${approvals.length} recommendation${approvals.length === 1 ? "" : "s"}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink-subtle hover:bg-surface-muted"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-3.5 w-3.5">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink-subtle hover:bg-surface-muted"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-3.5 w-3.5">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="rounded-card border border-line bg-surface shadow-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-bold text-ink">Recent Reports</h2>
            </div>
            {reportsLoading && <LoadingSpinner />}
            {reportsError && <ErrorState message="Failed to load reports." onRetry={() => void refetchReports()} />}
            {!reportsLoading && !reportsError && reports.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-ink-muted">
                No reports yet.
              </div>
            )}
            {!reportsLoading && !reportsError && reports.length > 0 && (
            <ul className="divide-y divide-line">
              {reports.map((report) => (
                <li key={report.id} className="flex items-center gap-3 px-5 py-4">
                  <FileIcon type={report.fileType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {report.title}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {report.fileType} • {report.fileSize}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Download ${report.title}`}
                    className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-sidebar-active hover:bg-surface-muted"
                  >
                    <DownloadIcon />
                  </button>
                </li>
              ))}
            </ul>
            )}
          </div>
        </div>
    </AppShell>
  );
}
