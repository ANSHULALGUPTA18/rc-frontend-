"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/query-states";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import { submitForApproval } from "@/features/jd-upload/api/client";
import { CacheBadge } from "@/features/jd-upload/components/CacheBadge";
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
              {status === "pricing"
                ? "Generating AI pricing recommendation…"
                : "Queued for pricing…"}
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
            <button type="button" onClick={onRetry} className="ml-3 font-medium underline">
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
  // Evidence pipeline (UAT): this rate needs a human to review it before use —
  // evidence was thin, wrong-occupation, or insufficient. The range shown is
  // advisory, not a confident recommendation.
  const needsReview = rec.evidenceDecision === "human_review";
  // Evidence pipeline abstained on the contractor market rate (no usable
  // evidence) → it persisted 0/0. Show "unavailable" instead of "$0.00".
  const contractorUnavailable = parseFloat(rec.payRateLow) <= 0 && parseFloat(rec.payRateHigh) <= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="truncate">{fileName}</CardTitle>
          <CacheBadge cache={rec.cache} />
        </div>
        {rec.promptName && <p className="text-xs text-ink-muted">Prompt: {rec.promptName}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {needsReview && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">⚠ Needs human review</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Evidence was thin, wrong-occupation, or insufficient. The rate below is an advisory
              starting point — verify before using it.
            </p>
          </div>
        )}

        {/* Agency Published Pay Rate — public-sector, SEPARATE from contractor */}
        {rec.agencyRate && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Agency Published Pay Rate
              {rec.agencyRate.grade && (
                <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
                  Grade {rec.agencyRate.grade}
                </span>
              )}
            </p>
            {rec.agencyRate.available &&
            rec.agencyRate.low != null &&
            rec.agencyRate.high != null ? (
              <p className="mt-1 text-base font-bold text-ink">
                ${rec.agencyRate.low.toFixed(2)} – ${rec.agencyRate.high.toFixed(2)}/hr
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">
                Unavailable — insufficient agency evidence
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-indigo-600">
              The client agency&apos;s own published pay grade — kept separate from the contractor
              market rate.
            </p>
          </div>
        )}

        {/* Rate grid — Contractor Market Pay Rate (the existing pay_rate) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {rec.agencyRate ? "Contractor Market Pay Rate" : "Pay Rate"}
            </p>
            {contractorUnavailable ? (
              <p className="mt-1 text-sm text-ink-muted">
                Unavailable — insufficient market evidence
              </p>
            ) : (
              <p className="mt-1 text-base font-bold text-ink">
                {fmt(rec.payRateLow)} – {fmt(rec.payRateHigh)}/hr
              </p>
            )}
          </div>
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Bill Rate
            </p>
            {contractorUnavailable ? (
              <p className="mt-1 text-sm text-ink-muted">—</p>
            ) : (
              <p className="mt-1 text-base font-bold text-ink">
                {fmt(rec.billRateLow)} – {fmt(rec.billRateHigh)}/hr
              </p>
            )}
          </div>
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Confidence
            </p>
            <p className="mt-1 text-base font-bold text-ink">
              {Math.round(rec.confidenceScore * 100)}%
            </p>
            <p className="text-xs text-ink-muted">Markup {parseFloat(rec.markupPct).toFixed(1)}%</p>
          </div>
        </div>

        {/* Offshore / nearshore tiers (when the pricing model provided them) */}
        {(rec.globalRates?.offshore || rec.globalRates?.nearshore || rec.globalRates?.remote) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {rec.globalRates?.remote && (
              <div className="rounded-lg border border-line bg-surface-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Remote (US)
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  Pay ${rec.globalRates.remote.payLow.toFixed(2)} – $
                  {rec.globalRates.remote.payHigh.toFixed(2)}/hr
                </p>
                <p className="text-xs text-ink-muted">
                  Bill ${rec.globalRates.remote.billLow.toFixed(2)} – $
                  {rec.globalRates.remote.billHigh.toFixed(2)}/hr
                </p>
              </div>
            )}
            {rec.globalRates?.offshore && (
              <div className="rounded-lg border border-line bg-surface-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Offshore
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  Pay ${rec.globalRates.offshore.payLow.toFixed(2)} – $
                  {rec.globalRates.offshore.payHigh.toFixed(2)}/hr
                </p>
                <p className="text-xs text-ink-muted">
                  Bill ${rec.globalRates.offshore.billLow.toFixed(2)} – $
                  {rec.globalRates.offshore.billHigh.toFixed(2)}/hr
                </p>
              </div>
            )}
            {rec.globalRates?.nearshore && (
              <div className="rounded-lg border border-line bg-surface-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Nearshore
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  Pay ${rec.globalRates.nearshore.payLow.toFixed(2)} – $
                  {rec.globalRates.nearshore.payHigh.toFixed(2)}/hr
                </p>
                <p className="text-xs text-ink-muted">
                  Bill ${rec.globalRates.nearshore.billLow.toFixed(2)} – $
                  {rec.globalRates.nearshore.billHigh.toFixed(2)}/hr
                </p>
              </div>
            )}
          </div>
        )}

        {/* Structured pricing metadata (replaces the old prose rationale) */}
        {(rec.keySkills?.length ||
          rec.marketFactors?.length ||
          rec.sources?.length ||
          rec.explanation) && (
          <div className="space-y-2 rounded-lg border border-line bg-blue-50 p-3">
            {rec.keySkills && rec.keySkills.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  Key Skills
                </h4>
                <p className="text-sm text-ink-muted">{rec.keySkills.join(", ")}</p>
              </div>
            )}
            {rec.marketFactors && rec.marketFactors.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  Market Factors
                </h4>
                <p className="text-sm text-ink-muted">{rec.marketFactors.join("; ")}</p>
              </div>
            )}
            {rec.sources && rec.sources.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  Sources <span className="font-normal normal-case">(cited by the model)</span>
                </h4>
                <ul className="space-y-0.5">
                  {Array.from(new Set(rec.sources)).map((src, i) => (
                    <li key={`${src}-${i}`} className="truncate text-sm">
                      {/^https?:\/\//.test(src) ? (
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline hover:text-blue-900"
                          title={src}
                        >
                          {src}
                        </a>
                      ) : (
                        <span className="text-ink-muted" title={src}>
                          {src}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Legacy prose rationale — only on pre-existing recommendations. */}
            {rec.explanation && (
              <div>
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  Rationale
                </h4>
                <p className="text-sm leading-relaxed text-ink-muted">{rec.explanation}</p>
              </div>
            )}
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
                    onClick={() => {
                      setShowNotes(false);
                      setApprovalNotes("");
                    }}
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
