import type { CacheMeta } from "@/features/jd-upload/types";

interface CacheBadgeProps {
  cache: CacheMeta | null | undefined;
}

/**
 * Small, non-intrusive indicator for whether an AI response (extraction or
 * pricing) came from cache or was freshly generated. Renders nothing until
 * cache metadata is known (e.g. before the request completes).
 */
export function CacheBadge({ cache }: CacheBadgeProps): React.ReactElement | null {
  if (!cache) return null;

  return cache.hit ? (
    <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-green-200">
      🟢 Cache Hit
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
      🔵 Fresh AI Response
    </span>
  );
}
