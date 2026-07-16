"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { RecommendationCard } from "@/features/jd-upload/components/RecommendationCard";
import { runPool } from "@/features/jd-upload/lib/workerPool";
import {
  exportPricingExcel,
  getPricingHistory,
  priceJd,
  submitBatchForApproval,
  type PricingExportRow,
} from "@/features/jd-upload/api/client";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import type {
  PricingStatus,
  PricingVersion,
  ResolvedPromptConfig,
  SubmittedJd,
} from "@/features/jd-upload/types";

/** Max JDs priced concurrently (sliding window — mirrors extraction). */
const MAX_CONCURRENT_PRICING = 5;

interface PricingState {
  status: PricingStatus;
  rec: PricingVersion | null;
  error: string | null;
}

const initialState = (): PricingState => ({ status: "pending", rec: null, error: null });

interface RecommendationsViewProps {
  submittedJds: SubmittedJd[];
  /** Prompt configs resolved at Prompt Selection stage, keyed by fileId. */
  promptConfigs: Record<string, ResolvedPromptConfig>;
  onDone: () => void;
  /** Optional back handler. When provided, a Back button is shown. */
  onBack?: () => void;
}

export function RecommendationsView({
  submittedJds,
  promptConfigs,
  onDone,
  onBack,
}: RecommendationsViewProps): React.ReactElement {
  const msal = useMsalTokenContext();

  const [pricing, setPricing] = useState<Record<string, PricingState>>(() =>
    Object.fromEntries(submittedJds.map((jd) => [jd.jdId, initialState()])),
  );
  const started = useRef(false);

  const setJd = (jdId: string, patch: Partial<PricingState>): void =>
    setPricing((prev) => ({ ...prev, [jdId]: { ...prev[jdId], ...patch } }));

  // Price one JD: run priceJd with its prompt (if any), then read back the
  // latest version from the pricing history.
  const priceOne = async (jd: SubmittedJd): Promise<PricingVersion | null> => {
    const config = promptConfigs[jd.fileId];
    if (config) {
      await priceJd(jd.jdId, config, msal);
    }
    const versions = await getPricingHistory(jd.jdId, msal);
    return versions.length > 0 ? versions[versions.length - 1] : null;
  };

  // Kick off pooled pricing once on mount. The ref guard prevents re-running
  // if context identities (msal) change between renders.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void runPool(
      submittedJds,
      MAX_CONCURRENT_PRICING,
      async (jd) => {
        setJd(jd.jdId, { status: "pricing" });
        return priceOne(jd);
      },
      (outcome) => {
        const jd = outcome.item;
        if (outcome.status === "succeeded") {
          setJd(jd.jdId, { status: "done", rec: outcome.result ?? null, error: null });
        } else {
          setJd(jd.jdId, { status: "failed", rec: null, error: "Pricing failed. Please retry." });
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedJds, promptConfigs, msal]);

  const retryOne = async (jd: SubmittedJd): Promise<void> => {
    setJd(jd.jdId, { status: "pricing", rec: null, error: null });
    try {
      const rec = await priceOne(jd);
      setJd(jd.jdId, { status: "done", rec, error: null });
    } catch {
      setJd(jd.jdId, { status: "failed", rec: null, error: "Pricing failed. Please retry." });
    }
  };

  // Re-run every failed JD through the same 5-wide pool.
  const retryAllFailed = async (): Promise<void> => {
    const failedJds = submittedJds.filter((jd) => pricing[jd.jdId]?.status === "failed");
    if (failedJds.length === 0) return;

    await runPool(
      failedJds,
      MAX_CONCURRENT_PRICING,
      async (jd) => {
        setJd(jd.jdId, { status: "pricing", rec: null, error: null });
        return priceOne(jd);
      },
      (outcome) => {
        const jd = outcome.item;
        if (outcome.status === "succeeded") {
          setJd(jd.jdId, { status: "done", rec: outcome.result ?? null, error: null });
        } else {
          setJd(jd.jdId, { status: "failed", rec: null, error: "Pricing failed. Please retry." });
        }
      },
    );
  };

  // ── Aggregate progress ──────────────────────────────────────────────────────
  const total = submittedJds.length;
  const statuses = submittedJds.map((jd) => pricing[jd.jdId]?.status ?? "pending");
  const doneCount = statuses.filter((s) => s === "done").length;
  const failedCount = statuses.filter((s) => s === "failed").length;
  const settled = doneCount + failedCount;
  const allSettled = total > 0 && settled === total;

  // ── Batch "Send All for Approval" ──────────────────────────────────────────
  // One combined email covering every draft recommendation, instead of one
  // email per JD (30-40 JDs → 1 email with Approve All / Reject All).
  type BatchState = "idle" | "submitting" | "submitted" | "error";
  const [batchState, setBatchState] = useState<BatchState>("idle");

  const draftRecs = submittedJds
    .map((jd) => pricing[jd.jdId]?.rec)
    .filter((rec): rec is PricingVersion => rec != null && rec.submissionStatus === "draft");

  const handleSendAll = async (): Promise<void> => {
    if (draftRecs.length === 0) return;
    setBatchState("submitting");
    try {
      const result = await submitBatchForApproval(
        draftRecs.map((rec) => rec.id),
        null,
        msal,
      );
      const submitted = new Set(result.submitted);
      // Flip submitted recs to pending locally so cards show the new state.
      setPricing((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([jdId, st]) => [
            jdId,
            st.rec && submitted.has(st.rec.id)
              ? { ...st, rec: { ...st.rec, submissionStatus: "pending_approval" } }
              : st,
          ]),
        ),
      );
      setBatchState("submitted");
    } catch {
      setBatchState("error");
    }
  };

  // ── Excel export ────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const buildExportRows = (): PricingExportRow[] =>
    submittedJds.flatMap((jd) => {
      const rec = pricing[jd.jdId]?.rec;
      if (!rec) return []; // only priced positions
      const f = jd.extractedFields;
      const num = (v: string): number | null => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
      };
      const tierText = (
        t: { payLow: number; payHigh: number; billLow: number; billHigh: number } | undefined,
        kind: "pay" | "bill",
      ): string | null =>
        t
          ? kind === "pay"
            ? `$${t.payLow.toFixed(2)} - $${t.payHigh.toFixed(2)}`
            : `$${t.billLow.toFixed(2)} - $${t.billHigh.toFixed(2)}`
          : null;
      return [
        {
          position: f.jobTitle ?? jd.fileName,
          sourcePdf: jd.sourceFileName ?? jd.fileName,
          location: f.location,
          sector: f.sector,
          experience: f.experienceRequired,
          skills: f.skills.length > 0 ? f.skills.join(", ") : null,
          payRateLow: num(rec.payRateLow),
          payRateHigh: num(rec.payRateHigh),
          billRateLow: num(rec.billRateLow),
          billRateHigh: num(rec.billRateHigh),
          offshorePay: tierText(rec.globalRates?.offshore, "pay"),
          offshoreBill: tierText(rec.globalRates?.offshore, "bill"),
          nearshorePay: tierText(rec.globalRates?.nearshore, "pay"),
          nearshoreBill: tierText(rec.globalRates?.nearshore, "bill"),
          markupPct: num(rec.markupPct),
          confidence: rec.confidenceScore,
          prompt: rec.promptName,
          rationale: rec.explanation,
          status: rec.submissionStatus,
          pricedOn: rec.createdAt ? rec.createdAt.slice(0, 10) : null,
        },
      ];
    });

  const handleExport = async (): Promise<void> => {
    const rows = buildExportRows();
    if (rows.length === 0) return;
    setExporting(true);
    setExportError(false);
    try {
      await exportPricingExcel(rows, msal);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <header className="space-y-6">
        <h1 className="text-3xl font-bold text-ink">Pricing</h1>
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Stages</h2>
          <WorkshopStages activeStage="recommendations" />
        </div>
      </header>

      {total > 1 && (
        <div className="mt-6 rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-ink">
              {allSettled ? "Pricing complete" : "Generating pricing recommendations…"}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-ink-muted">
                {doneCount} of {total} priced
                {failedCount > 0 ? ` · ${failedCount} failed` : ""}
              </span>
              {allSettled && failedCount > 0 && (
                <button
                  type="button"
                  onClick={() => void retryAllFailed()}
                  className="shrink-0 rounded-md border border-sidebar-active/40 bg-blue-50 px-3 py-1 text-xs font-semibold text-sidebar-active hover:bg-blue-100"
                >
                  Retry all failed
                </button>
              )}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-sidebar-active transition-all duration-300"
              style={{ width: `${total ? (settled / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {submittedJds.map((jd) => {
          const st = pricing[jd.jdId] ?? initialState();
          return (
            <RecommendationCard
              key={jd.jdId}
              fileName={jd.fileName}
              status={st.status}
              rec={st.rec}
              error={st.error}
              onRetry={() => void retryOne(jd)}
            />
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        {onBack ? (
          <Button variant="secondary" size="lg" className="w-auto" onClick={onBack}>
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
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {batchState === "submitted" ? (
            <span className="text-sm font-semibold text-green-700">
              ✓ Sent for approval — admins received one combined email
            </span>
          ) : (
            draftRecs.length > 1 && (
              <Button
                size="lg"
                className="w-auto"
                disabled={batchState === "submitting" || !allSettled}
                onClick={() => void handleSendAll()}
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
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                {batchState === "submitting"
                  ? "Sending…"
                  : `Send All for Approval (${draftRecs.length})`}
              </Button>
            )
          )}
          <Button
            variant="secondary"
            size="lg"
            className="w-auto"
            disabled={exporting || doneCount === 0}
            onClick={() => void handleExport()}
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            {exporting ? "Exporting…" : "Export to Excel"}
          </Button>
          <Button size="lg" className="w-auto" onClick={onDone}>
            Done — Go to Dashboard
          </Button>
        </div>
      </div>

      {exportError && (
        <p className="mt-2 text-right text-xs text-red-600">Export failed. Please try again.</p>
      )}
      {batchState === "error" && (
        <p className="mt-2 text-right text-xs text-red-600">
          Batch submit failed. Please try again or send positions individually.
        </p>
      )}
    </AppShell>
  );
}
