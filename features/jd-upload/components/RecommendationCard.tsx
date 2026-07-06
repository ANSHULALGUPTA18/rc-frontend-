"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/query-states";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import { submitForApproval } from "@/features/jd-upload/api/client";
import type { PricingStatus, PricingVersion } from "@/features/jd-upload/types";

interface RecommendationCardProps {
  fileName: string;
  /** Pricing lifecycle for this JD — driven by the pool in RecommendationsView. */
  status: PricingStatus;
  /** The priced recommendation once status === "done". */
  rec: PricingVersion | null;
  /** Failure message when status === "failed". */
  error: string | null;
  /** Re-run pricing for this JD. */
  onRetry: () => void;
}

function fmt(v: string): string {
  return `$${parseFloat(v).toFixed(2)}`;
}

type ApprovalState = "idle" | "submitting" | "submitted" | "error";

export function RecommendationCard({
  fileName,
  status,
  rec,
  error,
  onRetry,
}: RecommendationCardProps): React.ReactElement {
  const msal = useMsalTokenContext();
  const [approvalState, setApprovalState] = useState<ApprovalState>("idle");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // ── Loading (queued or actively pricing) ───────────────────────────────────
  if (status === "pending" || status === "pricing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="truncate">{fileName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 py-4">
            <LoadingSpinner />
            <span className="text-sm text-ink-muted">
              {status === "pricing" ? "Generating AI pricing recommendation…" : "Queued for pricing…"}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === "failed" || !rec) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="truncate">{fileName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error ?? "No pricing available."}</span>
            <button
              type="button"
              onClick={onRetry}
              className="ml-3 font-medium underline"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  const isApproved = rec.submissionStatus === "approved";
  const isRejected = rec.submissionStatus === "rejected";
  const isPending = rec.submissionStatus === "pending_approval" || approvalState === "submitted";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">{fileName}</CardTitle>
        {rec.promptName && (
          <p className="text-xs text-ink-muted">Prompt: {rec.promptName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rate grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Pay Rate</p>
            <p className="mt-1 text-base font-bold text-ink">
              {fmt(rec.payRateLow)} – {fmt(rec.payRateHigh)}/hr
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Bill Rate</p>
            <p className="mt-1 text-base font-bold text-ink">
              {fmt(rec.billRateLow)} – {fmt(rec.billRateHigh)}/hr
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Confidence</p>
            <p className="mt-1 text-base font-bold text-ink">
              {Math.round(rec.confidenceScore * 100)}%
            </p>
            <p className="text-xs text-ink-muted">Markup {parseFloat(rec.markupPct).toFixed(1)}%</p>
          </div>
        </div>

        {/* Explanation */}
        {rec.explanation && (
          <div className="rounded-lg border border-line bg-blue-50 p-3">
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Rationale</h4>
            <p className="text-sm leading-relaxed text-ink-muted">{rec.explanation}</p>
          </div>
        )}

        {/* Approval status / action */}
        {isApproved && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
            <p className="text-sm font-semibold text-green-700">Approved</p>
          </div>
        )}
        {isRejected && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
            <p className="text-sm font-semibold text-red-700">Rejected</p>
          </div>
        )}
        {isPending && !isApproved && !isRejected && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
            <p className="text-sm font-semibold text-amber-700">Pending Admin Approval</p>
          </div>
        )}
        {!isApproved && !isRejected && !isPending && (
          <div className="rounded-lg border border-line bg-surface-muted p-3 space-y-2">
            {!showNotes ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">Ready to submit?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNotes(true)}
                    className="text-xs font-medium text-sidebar-active hover:underline"
                  >
                    Add Notes
                  </button>
                  <Button
                    size="sm"
                    disabled={approvalState === "submitting"}
                    onClick={() => {
                      setApprovalState("submitting");
                      submitForApproval(rec.id, null, msal)
                        .then(() => setApprovalState("submitted"))
                        .catch(() => setApprovalState("error"));
                    }}
                  >
                    {approvalState === "submitting" ? "Submitting…" : "Send for Approval"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Notes for the admin reviewer (optional)…"
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setShowNotes(false); setApprovalNotes(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={approvalState === "submitting"}
                    onClick={() => {
                      setApprovalState("submitting");
                      submitForApproval(rec.id, approvalNotes.trim() || null, msal)
                        .then(() => setApprovalState("submitted"))
                        .catch(() => setApprovalState("error"));
                    }}
                  >
                    {approvalState === "submitting" ? "Submitting…" : "Send for Approval"}
                  </Button>
                </div>
              </div>
            )}
            {approvalState === "error" && (
              <p className="text-xs text-red-600">Failed to submit. Please try again.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
