import { describe, it, expect } from "vitest";
import {
  buildManualConfirmItem,
  buildManualRawText,
  deriveContextDefaults,
  emptyManualForm,
  parseSkillsInput,
} from "@/features/jd-upload/lib/manualPosition";
import type { ManualPositionForm, SubmittedJd } from "@/features/jd-upload/types";

function form(overrides: Partial<ManualPositionForm> = {}): ManualPositionForm {
  return { ...emptyManualForm(), laborCategory: "Project Manager", ...overrides };
}

function extracted(
  location: string | null,
  sector: string | null,
  client: string | null = null,
): SubmittedJd {
  return {
    fileId: crypto.randomUUID(),
    fileName: "IT Specialist",
    jdId: crypto.randomUUID(),
    client,
    extractedFields: {
      jobTitle: "IT Specialist",
      experienceRequired: "1+ years",
      skills: [],
      mandatorySkills: [],
      location,
      employmentType: null,
      sector,
      confidence: 0.8,
    },
  };
}

describe("parseSkillsInput", () => {
  it("splits on commas and newlines, trimming and dropping blanks", () => {
    expect(parseSkillsInput("PMP, Agile\nMS Project ,, ")).toEqual(["PMP", "Agile", "MS Project"]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseSkillsInput("")).toEqual([]);
  });
});

describe("deriveContextDefaults", () => {
  it("inherits the first non-empty location, sector, and client from extracted positions", () => {
    const jds = [
      extracted(null, null, null),
      extracted("Oceanside, CA", "Public Sector", "North County Transit District (NCTD)"),
    ];
    expect(deriveContextDefaults(jds)).toEqual({
      location: "Oceanside, CA",
      sector: "Public Sector",
      client: "North County Transit District (NCTD)",
    });
  });

  it("returns nulls when there are no extracted positions", () => {
    expect(deriveContextDefaults([])).toEqual({ location: null, sector: null, client: null });
  });

  it("does not invent a client when none of the extracted positions carry one", () => {
    const jds = [extracted("Oceanside, CA", "Public Sector", null)];
    expect(deriveContextDefaults(jds).client).toBeNull();
  });
});

describe("buildManualConfirmItem", () => {
  const defaults = {
    location: "Oceanside, CA",
    sector: "Public Sector",
    client: "North County Transit District (NCTD)",
  };

  it("maps the form to a confirm-positions item with source=manual", () => {
    const item = buildManualConfirmItem(
      "draft-1",
      form({ skills: "PMP, Agile", experience: "5+ years", employmentType: "Contract" }),
      defaults,
    );
    expect(item.tempId).toBe("draft-1");
    expect(item.title).toBe("Project Manager");
    expect(item.detectionSource).toBe("manual");
    expect(item.skills).toEqual(["PMP", "Agile"]);
    expect(item.experienceLevel).toBe("5+ years");
    expect(item.employmentType).toBe("Contract");
  });

  it("inherits location, sector, and client from the document context when blank", () => {
    const item = buildManualConfirmItem("d", form(), defaults);
    expect(item.location).toBe("Oceanside, CA"); // inherited
    expect(item.sector).toBe("Public Sector"); // sector always inherited
    expect(item.client).toBe("North County Transit District (NCTD)"); // inherited client
  });

  it("prefers a typed location over the inherited one", () => {
    const item = buildManualConfirmItem("d", form({ location: "Austin, TX" }), defaults);
    expect(item.location).toBe("Austin, TX");
  });

  it("prefers a typed client override over the inherited one", () => {
    const item = buildManualConfirmItem("d", form({ client: "City of Austin" }), defaults);
    expect(item.client).toBe("City of Austin");
  });

  it("leaves client null when neither the form nor the context provides one", () => {
    const item = buildManualConfirmItem("d", form(), {
      location: null,
      sector: null,
      client: null,
    });
    expect(item.client).toBeNull();
  });

  it("includes the client line in the synthesized raw_text when present", () => {
    const text = buildManualRawText(form({ client: "North County Transit District (NCTD)" }));
    expect(text).toContain("Client: North County Transit District (NCTD)");
  });

  it("synthesizes a readable raw_text carrying the prose fields", () => {
    const text = buildManualRawText(
      form({ responsibilities: "Lead the team", education: "Bachelor's", notes: "Urgent" }),
    );
    expect(text).toContain("Labor Category: Project Manager");
    expect(text).toContain("Responsibilities:\nLead the team");
    expect(text).toContain("Education: Bachelor's");
    expect(text).toContain("Additional Notes:\nUrgent");
  });
});
