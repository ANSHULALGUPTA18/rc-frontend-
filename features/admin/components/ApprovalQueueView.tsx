"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";

interface ContributingSignal {
  signal_type: string;
  description: string;
  weight: string;
}

interface ApprovalItem {
  id: string;
  jd_id: string;
  pay_rate_low: string;
  pay_rate_high: string;
  bill_rate_low: string;
  bill_rate_high: string;
  markup_pct: string;
  confidence_score: number;
  status: string;
  explanation: string | null;
  contributing_signals?: ContributingSignal[];
  submitted_by_name?: string | null;
  submitted_by_email?: string | null;
}

interface QueueResponse {
  items: ApprovalItem[];
  total: number;
}

function fmtRate(v: string): string {
  return `$${parseFloat(v).toFixed(0)}`;
}

export function ApprovalQueueView(): React.ReactElement {
  const msal = useMsalTokenContext();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [detailItem, setDetailItem] = useState<ApprovalItem | null>(null);

  const { data, isLoading, error, refetch } = useQuery<QueueResponse>({
    queryKey: ["approval-queue"],
    queryFn: () => apiFetch<QueueResponse>("/v1/review-queue?page_size=50", { msal }),
  });

  const items = data?.items ?? [];

  const handleApprove = async (recId: string): Promise<void> => {
    setActionId(recId);
    try {
      await apiFetch(`/v1/recommendations/${recId}/approve`, {
        method: "POST",
        body: JSON.stringify({ action: "approved" }),
        msal,
      });
      void queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
    } catch {
      /* */
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (recId: string): Promise<void> => {
    setActionId(recId);
    try {
      await apiFetch(`/v1/recommendations/${recId}/reject`, {
        method: "POST",
        body: JSON.stringify({ action: "rejected", comments: rejectComment }),
        msal,
      });
      void queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      setRejectId(null);
      setRejectComment("");
    } catch {
      /* */
    } finally {
      setActionId(null);
    }
  };

  if (currentUser?.role !== "ADMIN") {
    return (
      <AppShell>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-ink-muted">Admin access required.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-ink">Approval Queue</h1>

      <div className="mt-6 rounded-card border border-line bg-surface shadow-card">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-base font-bold text-ink">All Recommendations ({items.length})</h2>
        </div>

        {isLoading && (
          <div className="p-6">
            <LoadingSpinner />
          </div>
        )}
        {error && (
          <div className="p-6">
            <ErrorState message="Failed to load queue." onRetry={() => void refetch()} />
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-ink-muted">
            No recommendations in the queue yet.
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    JD ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Submitted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Pay Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Bill Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Markup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-line last:border-0">
                    <td className="px-6 py-4 font-mono text-xs text-ink">
                      {item.jd_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      {item.submitted_by_name ? (
                        <>
                          <span className="block text-sm font-medium text-ink">
                            {item.submitted_by_name}
                          </span>
                          <span className="block text-xs text-ink-muted">
                            {item.submitted_by_email}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-ink-subtle">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-ink">
                      {fmtRate(item.pay_rate_low)}-{fmtRate(item.pay_rate_high)}/hr
                    </td>
                    <td className="px-6 py-4 text-ink-muted">
                      {fmtRate(item.bill_rate_low)}-{fmtRate(item.bill_rate_high)}/hr
                    </td>
                    <td className="px-6 py-4 text-ink-muted">
                      {parseFloat(item.markup_pct).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 font-semibold text-sidebar-active">
                      {Math.round(item.confidence_score * 100)}%
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          item.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : item.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-sidebar-active hover:bg-surface-muted"
                        >
                          Details
                        </button>
                        {item.status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              disabled={actionId === item.id}
                              onClick={() => void handleApprove(item.id)}
                            >
                              {actionId === item.id ? "..." : "Approve"}
                            </Button>
                            {rejectId === item.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={rejectComment}
                                  onChange={(e) => setRejectComment(e.target.value)}
                                  placeholder="Reason..."
                                  className="w-40 rounded border border-line px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sidebar-active"
                                />
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={actionId === item.id}
                                  onClick={() => void handleReject(item.id)}
                                >
                                  Confirm
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setRejectId(item.id)}
                              >
                                Reject
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-ink-subtle">Reviewed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Popup */}
      {detailItem && (() => {
        const signals = detailItem.contributing_signals ?? [];
        const keySkills = signals.find((s) => s.signal_type === "key_skills");
        const marketFactors = signals.find((s) => s.signal_type === "market_factors");
        const expLevel = signals.find((s) => s.signal_type === "experience_level");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailItem(null)}>
            <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-ink">Pricing Recommendation Details</h2>
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-muted hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-5 w-5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Submitted By */}
              {detailItem.submitted_by_name && (
                <div className="mb-4 rounded-lg border border-line bg-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Submitted By</p>
                  <p className="mt-1 text-sm font-medium text-ink">{detailItem.submitted_by_name}</p>
                  <p className="text-xs text-ink-muted">{detailItem.submitted_by_email}</p>
                </div>
              )}

              {/* Rate Cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border border-line bg-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Pay Rate</p>
                  <p className="mt-1 text-base font-bold text-ink">
                    {fmtRate(detailItem.pay_rate_low)}-{fmtRate(detailItem.pay_rate_high)}/hr
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Bill Rate</p>
                  <p className="mt-1 text-base font-bold text-ink">
                    {fmtRate(detailItem.bill_rate_low)}-{fmtRate(detailItem.bill_rate_high)}/hr
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Confidence</p>
                  <p className="mt-1 text-base font-bold text-ink">
                    {Math.round(detailItem.confidence_score * 100)}%
                  </p>
                  <p className="text-xs text-ink-muted">
                    Markup {parseFloat(detailItem.markup_pct).toFixed(1)}%
                    {expLevel && ` • ${expLevel.description}`}
                  </p>
                </div>
              </div>

              {/* Pricing Rationale */}
              {detailItem.explanation && (
                <div className="mb-4 rounded-lg border border-line bg-blue-50 p-4">
                  <h3 className="mb-2 text-sm font-bold text-ink">Pricing Rationale</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{detailItem.explanation}</p>
                </div>
              )}

              {/* Key Skills */}
              {keySkills && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-bold text-ink">Key Skills (Rate Drivers)</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {keySkills.description.split(", ").map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Market Factors */}
              {marketFactors && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-bold text-ink">Market Factors</h3>
                  <ul className="space-y-1">
                    {marketFactors.description.split("; ").map((factor, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-muted">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-active" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* JD ID */}
              <div className="rounded-lg border border-line bg-surface-muted p-3">
                <p className="text-xs text-ink-muted">
                  <span className="font-semibold">JD ID:</span> {detailItem.jd_id}
                </p>
                <p className="text-xs text-ink-muted">
                  <span className="font-semibold">Recommendation ID:</span> {detailItem.id}
                </p>
              </div>

              {/* Close button */}
              <div className="mt-5 flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setDetailItem(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
