import { describe, expect, it } from "vitest";
import { groupByPricingSignature, pricingSignature } from "@/features/jd-upload/lib/pricingGroups";
import type { ResolvedPromptConfig, SubmittedJd } from "@/features/jd-upload/types";

const config = (over: Partial<ResolvedPromptConfig> = {}): ResolvedPromptConfig => ({
  promptTemplateId: "1",
  promptContent: "Price it.",
  promptName: "Prompt_1",
  locationOverride: null,
  sectorOverride: null,
  ...over,
});

const jd = (i: number, sourceFileId?: string): SubmittedJd => ({
  fileId: `f${i}`,
  fileName: `Position ${i}`,
  jdId: `jd${i}`,
  sourceFileId,
  extractedFields: {
    jobTitle: `Position ${i}`,
    experienceRequired: null,
    skills: [],
    mandatorySkills: [],
    location: "Remote",
    employmentType: "Contract",
    sector: "Tech",
    confidence: 0.9,
  },
});

describe("pricingSignature", () => {
  it("matches for identical configs", () => {
    expect(pricingSignature(config())).toBe(pricingSignature(config()));
  });

  it("differs when the prompt text differs", () => {
    expect(pricingSignature(config())).not.toBe(
      pricingSignature(config({ promptContent: "Other." })),
    );
  });

  it("differs when a location or sector override differs", () => {
    expect(pricingSignature(config())).not.toBe(
      pricingSignature(config({ locationOverride: "NYC" })),
    );
    expect(pricingSignature(config())).not.toBe(
      pricingSignature(config({ sectorOverride: "Public Sector" })),
    );
  });

  it("ignores rate-tier ordering", () => {
    expect(pricingSignature(config({ rateTiers: ["remote", "offshore"] }))).toBe(
      pricingSignature(config({ rateTiers: ["offshore", "remote"] })),
    );
  });

  it("differs when the tier selection itself differs", () => {
    expect(pricingSignature(config({ rateTiers: ["remote"] }))).not.toBe(
      pricingSignature(config({ rateTiers: ["remote", "offshore"] })),
    );
  });
});

describe("groupByPricingSignature", () => {
  it("puts positions sharing a config into one group", () => {
    const jds = [jd(0), jd(1), jd(2)];
    const configs = Object.fromEntries(jds.map((j) => [j.fileId, config()]));

    const groups = groupByPricingSignature(jds, configs);

    expect(groups).toHaveLength(1);
    expect(groups[0].jds.map((j) => j.jdId)).toEqual(["jd0", "jd1", "jd2"]);
  });

  it("separates a position whose prompt was customized", () => {
    const jds = [jd(0), jd(1), jd(2)];
    const configs = Object.fromEntries(jds.map((j) => [j.fileId, config()]));
    configs["f1"] = config({ promptContent: "Custom." });

    const groups = groupByPricingSignature(jds, configs);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.jds.length).sort()).toEqual([1, 2]);
  });

  it("groups across different source PDFs when the config matches", () => {
    // Grouping is by pricing signature, NOT by source document.
    const jds = [jd(0, "pdf-a"), jd(1, "pdf-b")];
    const configs = Object.fromEntries(jds.map((j) => [j.fileId, config()]));

    const groups = groupByPricingSignature(jds, configs);

    expect(groups).toHaveLength(1);
    expect(groups[0].jds).toHaveLength(2);
  });

  it("skips positions with no prompt config", () => {
    const jds = [jd(0), jd(1)];
    const groups = groupByPricingSignature(jds, { f0: config() });

    expect(groups).toHaveLength(1);
    expect(groups[0].jds.map((j) => j.jdId)).toEqual(["jd0"]);
  });

  it("returns no groups when nothing is configured", () => {
    expect(groupByPricingSignature([jd(0)], {})).toEqual([]);
  });

  it("preserves input order within and across groups", () => {
    const jds = [jd(0), jd(1), jd(2), jd(3)];
    const configs = Object.fromEntries(jds.map((j) => [j.fileId, config()]));
    configs["f0"] = config({ promptContent: "First group only." });
    configs["f2"] = config({ promptContent: "First group only." });

    const groups = groupByPricingSignature(jds, configs);

    expect(groups[0].jds.map((j) => j.jdId)).toEqual(["jd0", "jd2"]);
    expect(groups[1].jds.map((j) => j.jdId)).toEqual(["jd1", "jd3"]);
  });
});
