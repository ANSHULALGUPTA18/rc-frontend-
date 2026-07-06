"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { RecommendationCard } from "@/features/jd-upload/components/RecommendationCard";
import { runPool } from "@/features/jd-upload/lib/workerPool";
import { getPricingHistory, priceJd } from "@/features/jd-upload/api/client";
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
        <Button size="lg" className="w-auto" onClick={onDone}>
          Done — Go to Dashboard
        </Button>
      </div>
    </AppShell>
  );
}
