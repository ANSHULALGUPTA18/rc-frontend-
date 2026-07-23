import type { ResolvedPromptConfig, SubmittedJd } from "@/features/jd-upload/types";

/**
 * Positions can only be priced together when they share the SAME prompt,
 * overrides, and rate tiers — the prompt selection screen configures each
 * position independently (with "apply to all" as a convenience), so two
 * positions from one PDF may legitimately differ. Grouping by source file
 * would silently price a position with someone else's prompt.
 */
export interface PricingGroup {
  /** Stable key identifying the shared pricing signature. */
  signature: string;
  /** The shared config — identical for every JD in the group. */
  config: ResolvedPromptConfig;
  jds: SubmittedJd[];
}

/** Build the signature for one config. Tier order is normalized so that
 *  ["remote","offshore"] and ["offshore","remote"] group together. */
export function pricingSignature(config: ResolvedPromptConfig): string {
  const tiers = [...(config.rateTiers ?? [])].sort().join(",");
  return JSON.stringify({
    prompt: config.promptContent,
    name: config.promptName ?? null,
    location: config.locationOverride,
    sector: config.sectorOverride,
    tiers,
  });
}

/**
 * Partition JDs into groups that can each be priced in one batch request.
 *
 * JDs with no prompt config are skipped entirely (they are not priced
 * today either). Group order, and order within each group, follow the
 * input order so results stay predictable.
 */
export function groupByPricingSignature(
  jds: SubmittedJd[],
  promptConfigs: Record<string, ResolvedPromptConfig>,
): PricingGroup[] {
  const groups = new Map<string, PricingGroup>();

  for (const jd of jds) {
    const config = promptConfigs[jd.fileId];
    if (!config) continue;

    const signature = pricingSignature(config);
    const existing = groups.get(signature);
    if (existing) {
      existing.jds.push(jd);
    } else {
      groups.set(signature, { signature, config, jds: [jd] });
    }
  }

  return [...groups.values()];
}
