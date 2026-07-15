/**
 * Manual labor-category helpers.
 *
 * Turns a recruiter-typed ManualPositionForm into the exact ConfirmPositionItem
 * shape the pipeline already uses, so a manual position flows through
 * confirm-positions → pricing identically to an extracted one (source="manual").
 *
 * Client/contract context (location, sector, agency) already exists from the
 * uploaded document, so blank fields inherit from a sibling extracted position.
 */
import type {
  ConfirmPositionItem,
  ManualPositionForm,
  SubmittedJd,
} from "@/features/jd-upload/types";

export function emptyManualForm(): ManualPositionForm {
  return {
    laborCategory: "",
    location: "",
    experience: "",
    education: "",
    skills: "",
    responsibilities: "",
    employmentType: "",
    notes: "",
  };
}

/** Split a free-text skills field on commas/newlines into a clean array. */
export function parseSkillsInput(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Synthesize a JD-like text block from the form. Pricing prices from the
 * structured fields, but a readable raw_text keeps the record self-describing
 * (audit, review, future re-extraction) and carries the prose fields
 * (responsibilities, education, notes) that have no structured column.
 */
export function buildManualRawText(form: ManualPositionForm): string {
  const parts: string[] = [`Labor Category: ${form.laborCategory.trim()}`];
  if (form.location.trim()) parts.push(`Location: ${form.location.trim()}`);
  if (form.experience.trim()) parts.push(`Experience: ${form.experience.trim()}`);
  if (form.education.trim()) parts.push(`Education: ${form.education.trim()}`);
  const skills = parseSkillsInput(form.skills);
  if (skills.length) parts.push(`Skills: ${skills.join(", ")}`);
  if (form.responsibilities.trim())
    parts.push(`Responsibilities:\n${form.responsibilities.trim()}`);
  if (form.employmentType.trim()) parts.push(`Employment Type: ${form.employmentType.trim()}`);
  if (form.notes.trim()) parts.push(`Additional Notes:\n${form.notes.trim()}`);
  return parts.join("\n");
}

export interface ManualContextDefaults {
  location: string | null;
  sector: string | null;
}

/**
 * Derive the client/contract context to inherit for a manual position from the
 * already-extracted positions (first non-empty location/sector wins).
 */
export function deriveContextDefaults(extracted: SubmittedJd[]): ManualContextDefaults {
  const location =
    extracted.find((j) => j.extractedFields.location)?.extractedFields.location ?? null;
  const sector = extracted.find((j) => j.extractedFields.sector)?.extractedFields.sector ?? null;
  return { location, sector };
}

/** Build the confirm-positions item for a manual labor category. */
export function buildManualConfirmItem(
  draftId: string,
  form: ManualPositionForm,
  defaults: ManualContextDefaults,
): ConfirmPositionItem {
  return {
    tempId: draftId,
    title: form.laborCategory.trim(),
    rawText: buildManualRawText(form),
    location: form.location.trim() || defaults.location,
    // Sector isn't a form field — it's part of the shared contract context.
    sector: defaults.sector,
    skills: parseSkillsInput(form.skills),
    mandatorySkills: [],
    experienceLevel: form.experience.trim() || null,
    employmentType: form.employmentType.trim() || null,
    detectionSource: "manual",
  };
}
