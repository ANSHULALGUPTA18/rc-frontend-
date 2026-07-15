"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import { ConfirmDialog } from "@/features/jd-upload/components/ConfirmDialog";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import { getCacheStats, clearCache, type CacheStat } from "@/features/cache/api/client";

function StatCard({
  title,
  subtitle,
  stat,
}: {
  title: string;
  subtitle: string;
  stat: CacheStat;
}): React.ReactElement {
  const pct = Math.round(stat.hitRate * 100);
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="text-xs text-ink-muted">{subtitle}</p>

      <div className="mt-4 flex items-end justify-between">
        <span className="text-3xl font-bold text-ink">{pct}%</span>
        <span className="text-xs text-ink-muted">hit rate</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-sidebar-active transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-line bg-surface-muted p-2">
          <p className="text-lg font-bold text-green-700">{stat.hits}</p>
          <p className="text-xs text-ink-muted">Hits</p>
        </div>
        <div className="rounded-lg border border-line bg-surface-muted p-2">
          <p className="text-lg font-bold text-ink">{stat.misses}</p>
          <p className="text-xs text-ink-muted">Misses</p>
        </div>
        <div className="rounded-lg border border-line bg-surface-muted p-2">
          <p className="text-lg font-bold text-ink">{stat.total}</p>
          <p className="text-xs text-ink-muted">Total</p>
        </div>
      </div>
    </div>
  );
}

export function CacheView(): React.ReactElement {
  const msal = useMsalTokenContext();
  const queryClient = useQueryClient();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearedMsg, setClearedMsg] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ["cache-stats"],
    queryFn: () => getCacheStats(msal),
  });

  const doClear = async (): Promise<void> => {
    setConfirmClear(false);
    setClearing(true);
    setClearedMsg(null);
    try {
      const deleted = await clearCache(msal);
      setClearedMsg(`Cleared ${deleted} cached ${deleted === 1 ? "entry" : "entries"}.`);
      await queryClient.invalidateQueries({ queryKey: ["cache-stats"] });
    } catch {
      setClearedMsg("Failed to clear the cache. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <AppShell>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Cache</h1>
          <p className="mt-1 text-sm text-ink-muted">
            AI response cache effectiveness — how often duplicate JDs and roles are served from
            cache instead of calling GPT-4o, Gemini, or GPT pricing.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          className="w-auto shrink-0"
          disabled={clearing}
          onClick={() => setConfirmClear(true)}
        >
          {clearing ? "Clearing…" : "Clear my cache"}
        </Button>
      </header>

      {clearedMsg && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {clearedMsg}
        </div>
      )}

      {statsQuery.isLoading ? (
        <LoadingSpinner />
      ) : statsQuery.error ? (
        <ErrorState message="Failed to load cache stats." />
      ) : statsQuery.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            title="Extraction cache"
            subtitle="Duplicate documents (file + text tiers) — saves GPT-4o Vision / Gemini"
            stat={statsQuery.data.extraction}
          />
          <StatCard
            title="Pricing cache"
            subtitle="Repeated roles (fields tier) — saves GPT pricing"
            stat={statsQuery.data.pricing}
          />
        </div>
      ) : null}

      <p className="mt-6 text-xs text-ink-subtle">
        Stats are computed from the audit log for your tenant. Clearing removes only your
        tenant&apos;s current-version cache entries; new uploads will repopulate it.
      </p>

      <ConfirmDialog
        open={confirmClear}
        title="Clear the cache?"
        message="This will delete your tenant's cached extraction and pricing results. The next time the same documents or roles are processed, the AI will be called again to rebuild the cache. Do you want to continue?"
        confirmLabel="Clear cache"
        cancelLabel="Cancel"
        onConfirm={() => void doClear()}
        onCancel={() => setConfirmClear(false)}
      />
    </AppShell>
  );
}
