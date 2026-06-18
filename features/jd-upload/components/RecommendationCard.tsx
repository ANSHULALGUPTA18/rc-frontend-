"use client";

/**
 * RecommendationCard — triggers AI pricing for one already-submitted JD, then
 * polls for the result.
 *
 * Flow:
 *   1. On mount: POST /v1/jds/{jd_id}/price  (sends the recruiter's prompt)
 *   2. After pricing completes: poll GET /v1/jds/{jd_id} until terminal
 *   3. Once terminal: fetch recommendation from GET /v1/review-queue
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import {
  getJdStatus,
  findRecommendationByJdId,
  priceJd,
} from "@/features/jd-upload/api/client";
import {
  FAILED_JD_STATUSES,
  TERMINAL_JD_STATUSES,
} from "@/features/jd-upload/types";
import type { ResolvedPromptConfig } from "@/features/jd-upload/types";

interface RecommendationCardProps {
  jdId: string;
  fileName: string;
  promptConfig?: ResolvedPromptConfig;
}

type PricingState = "idle" | "pricing" | "done" | "error";

const DEFAULT_PROMPT_CONTENT =
  "Provide a competitive hourly pay rate and bill rate for this position based on the role, required skills, experience level, and location.";

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRateRange(low: string, high: string): string {
  const fmt = (v: string) => `$${parseFloat(v).toFixed(2)}`;
  return `${fmt(low)} – ${fmt(high)}/hr`;
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const isFailed = FAILED_JD_STATUSES.includes(status as (typeof FAILED_JD_STATUSES)[number]);
  return (
    <span
      className={
        isFailed
          ? "inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
          : "inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700"
      }
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export function RecommendationCard({
  jdId,
  fileName,
  promptConfig,
}: RecommendationCardProps): React.ReactElement {
  const msal = useMsalTokenContext();
  const [pricingState, setPricingState] = useState<PricingState>("idle");
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Prevent double-firing in React Strict Mode
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;

    const config: ResolvedPromptConfig = promptConfig ?? {
      promptTemplateId: null,
      promptContent: DEFAULT_PROMPT_CONTENT,
      locationOverride: null,
      sectorOverride: null,
    };

    setPricingState("pricing");
    priceJd(jdId, config, msal)
      .then(() => {
        setPricingState("done");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Pricing request failed. Please retry.";
        setPricingError(msg);
        setPricingState("error");
      });
  }, [jdId, msal, promptConfig]);

  const statusQuery = useQuery({
    queryKey: ["jd-status", jdId],
    queryFn: () => getJdStatus(jdId, msal),
    enabled: pricingState === "done",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_JD_STATUSES.includes(status) ? false : 3000;
    },
  });

  const status = statusQuery.data?.status;
  const isTerminal = status ? TERMINAL_JD_STATUSES.includes(status) : false;
  const isFailed = status ? FAILED_JD_STATUSES.includes(status) : false;

  const recommendationQuery = useQuery({
    queryKey: ["jd-recommendation", jdId],
    queryFn: () => findRecommendationByJdId(jdId, msal),
    enabled: isTerminal && !isFailed,
    refetchInterval: (query) => (query.state.data ? false : 3000),
  });

  const handleRetry = (): void => {
    triggered.current = false;
    setPricingError(null);
    setPricingState("idle");
    // The effect will re-fire on the next render cycle because state changed
    // Force it by temporarily unsetting the ref in the next tick
    setTimeout(() => {
      if (!triggered.current) {
        triggered.current = true;
        const config: ResolvedPromptConfig = promptConfig ?? {
          promptTemplateId: null,
          promptContent: DEFAULT_PROMPT_CONTENT,
          locationOverride: null,
          sectorOverride: null,
        };
        setPricingState("pricing");
        priceJd(jdId, config, msal)
          .then(() => setPricingState("done"))
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : "Pricing request failed. Please retry.";
            setPricingError(msg);
            setPricingState("error");
          });
      }
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="truncate">{fileName}</CardTitle>
          {status && <StatusBadge status={status} />}
        </div>
        <CardDescription>JD ID: {jdId}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 1: pricing in flight */}
        {(pricingState === "idle" || pricingState === "pricing") && (
          <div className="flex items-center gap-3">
            <LoadingSpinner />
            <span className="text-sm text-ink-muted">Generating AI pricing recommendation…</span>
          </div>
        )}

        {/* Step 1 error: pricing API call failed */}
        {pricingState === "error" && (
          <ErrorState
            message={pricingError ?? "Pricing generation failed."}
            onRetry={handleRetry}
          />
        )}

        {/* Step 2: pricing done, waiting for status poll */}
        {pricingState === "done" && statusQuery.error && (
          <ErrorState
            message="Failed to check job description status."
            onRetry={() => void statusQuery.refetch()}
          />
        )}

        {pricingState === "done" && !statusQuery.error && !isTerminal && (
          <LoadingSpinner />
        )}

        {/* Step 3: terminal failure */}
        {pricingState === "done" && !statusQuery.error && isTerminal && isFailed && (
          <ErrorState
            message={`Pricing could not be completed (status: ${formatStatusLabel(status ?? "")}).`}
            onRetry={handleRetry}
          />
        )}

        {/* Step 4: success — show recommendation */}
        {pricingState === "done" && !statusQuery.error && isTerminal && !isFailed && (
          <>
            {recommendationQuery.error && (
              <ErrorState
                message="Failed to load the pricing recommendation."
                onRetry={() => void recommendationQuery.refetch()}
              />
            )}

            {!recommendationQuery.error && !recommendationQuery.data && <LoadingSpinner />}

            {recommendationQuery.data && (() => {
              const rec = recommendationQuery.data;
              const keySkillsSignal = rec.contributingSignals.find(s => s.signalType === "key_skills");
              const marketSignal = rec.contributingSignals.find(s => s.signalType === "market_factors");
              const levelSignal = rec.contributingSignals.find(s => s.signalType === "experience_level");

              return (
              <div className="space-y-5">
                {/* Rate cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-line bg-surface-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Pay Rate
                    </p>
                    <p className="mt-1 text-lg font-bold text-ink">
                      {formatRateRange(rec.payRateLow, rec.payRateHigh)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Bill Rate
                    </p>
                    <p className="mt-1 text-lg font-bold text-ink">
                      {formatRateRange(rec.billRateLow, rec.billRateHigh)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Confidence
                    </p>
                    <p className="mt-1 text-lg font-bold text-ink">
                      {Math.round(rec.confidenceScore * 100)}%
                    </p>
                    <p className="text-xs text-ink-muted">
                      Markup {parseFloat(rec.markupPct).toFixed(1)}%
                      {levelSignal && ` • ${levelSignal.description}`}
                    </p>
                  </div>
                </div>

                {/* Pricing Rationale */}
                {rec.explanation && (
                  <div className="rounded-lg border border-line bg-blue-50 p-4">
                    <h3 className="mb-2 text-sm font-bold text-ink">Pricing Rationale</h3>
                    <p className="text-sm leading-relaxed text-ink-muted">{rec.explanation}</p>
                  </div>
                )}

                {/* Key Skills driving rate */}
                {keySkillsSignal && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-ink">Key Skills (Rate Drivers)</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {keySkillsSignal.description.split(", ").map((skill) => (
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
                {marketSignal && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-ink">Market Factors</h3>
                    <ul className="space-y-1">
                      {marketSignal.description.split("; ").map((factor, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-ink-muted">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-active" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {(rec.marketDataUnavailable ||
                  rec.rateCardConstraintViolated ||
                  rec.fallbackReason) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {rec.marketDataUnavailable && (
                      <p>Market data was unavailable for this role.</p>
                    )}
                    {rec.rateCardConstraintViolated && (
                      <p>This recommendation violates a rate card constraint.</p>
                    )}
                    {rec.fallbackReason && (
                      <p>Fallback reason: {rec.fallbackReason}</p>
                    )}
                  </div>
                )}
              </div>
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}
