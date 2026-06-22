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
    } catch { /* */ } finally {
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
    } catch { /* */ } finally {
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
          <h2 className="text-base font-bold text-ink">
            All Recommendations ({items.length})
          </h2>
        </div>

        {isLoading && <div className="p-6"><LoadingSpinner /></div>}
        {error && <div className="p-6"><ErrorState message="Failed to load queue." onRetry={() => void refetch()} /></div>}

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
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">JD ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Submitted By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Pay Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Bill Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Markup</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-line last:border-0">
                    <td className="px-6 py-4 font-mono text-xs text-ink">{item.jd_id.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      {item.submitted_by_name ? (
                        <>
                          <span className="block text-sm font-medium text-ink">{item.submitted_by_name}</span>
                          <span className="block text-xs text-ink-muted">{item.submitted_by_email}</span>
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
                    <td className="px-6 py-4 text-ink-muted">{parseFloat(item.markup_pct).toFixed(1)}%</td>
                    <td className="px-6 py-4 font-semibold text-sidebar-active">
                      {Math.round(item.confidence_score * 100)}%
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        item.status === "approved" ? "bg-green-100 text-green-700" :
                        item.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700",
                      )}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.status === "pending" ? (
                        <div className="flex items-center gap-2">
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
                        </div>
                      ) : (
                        <span className="text-xs text-ink-subtle">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
