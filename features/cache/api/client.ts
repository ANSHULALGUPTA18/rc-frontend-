/**
 * Cache admin API client — inspect and clear the AI response cache.
 *
 * getCacheStats() -> GET  /v1/admin/cache/stats
 * clearCache()    -> POST /v1/admin/cache/clear
 *
 * Admin-only on the backend (require_permission "admin:users"), tenant-scoped.
 */

import { apiFetch } from "@/lib/api/client";
import type { MsalTokenContext } from "@/lib/auth/token-storage";

export interface CacheStat {
  hits: number;
  misses: number;
  total: number;
  /** hits / total, 0..1 */
  hitRate: number;
}

export interface CacheStats {
  extraction: CacheStat;
  pricing: CacheStat;
}

interface RawStat {
  hits: number;
  misses: number;
  total: number;
  hit_rate: number;
}

function mapStat(s: RawStat): CacheStat {
  return { hits: s.hits, misses: s.misses, total: s.total, hitRate: s.hit_rate };
}

export async function getCacheStats(msal?: MsalTokenContext): Promise<CacheStats> {
  const res = await apiFetch<{ extraction: RawStat; pricing: RawStat }>("/v1/admin/cache/stats", {
    msal,
  });
  return { extraction: mapStat(res.extraction), pricing: mapStat(res.pricing) };
}

export async function clearCache(msal?: MsalTokenContext): Promise<number> {
  const res = await apiFetch<{ deleted: number }>("/v1/admin/cache/clear", {
    method: "POST",
    msal,
  });
  return res.deleted;
}
