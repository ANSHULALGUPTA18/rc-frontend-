export type WorkshopStageId = "upload" | "extraction" | "prompt-selection" | "recommendations";

export type WorkshopStageStatus = "active" | "upcoming" | "complete";

export type WorkshopActiveStage = WorkshopStageId;

export interface WorkshopStage {
  id: WorkshopStageId;
  label: string;
  status: WorkshopStageStatus;
}

export interface SelectedJdFile {
  id: string;
  file: File;
}

/** Fields extracted synchronously from the uploaded JD file (zero AI tokens). */
export interface ExtractedFields {
  jobTitle: string | null;
  experienceRequired: string | null;
  skills: string[];
  mandatorySkills: string[];
  location: string | null;
  employmentType: string | null;
  sector: string | null;
  confidence: number;
}

/** A submitted JD — has a backend jd_id and extracted fields. */
export interface SubmittedJd {
  fileId: string;
  fileName: string;
  jdId: string;
  extractedFields: ExtractedFields;
}

/**
 * Resolved prompt configuration captured at the Prompt Selection stage.
 * Keyed by fileId in JdWorkshopFlow; passed to RecommendationsView and
 * ultimately sent to POST /v1/jds/{jd_id}/price in Phase 1.
 */
export interface ResolvedPromptConfig {
  /** ID of the selected template; null when the recruiter wrote a custom prompt. */
  promptTemplateId: string | null;
  /** The exact prompt text that will be sent to Claude as the system instruction. */
  promptContent: string;
  /** Recruiter-entered location override; null if left blank. */
  locationOverride: string | null;
  /** Recruiter-entered sector override; null if left blank. */
  sectorOverride: string | null;
}

export const ACCEPTED_JD_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;
export const ACCEPTED_JD_MIME =
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
export const MAX_JD_FILE_BYTES = 10 * 1024 * 1024;

// ─── Backend JD / recommendation types ─────────────────────────────────────────

/** Mirrors the JD status enum returned by GET /v1/jds/{jd_id}. */
export type JdStatus =
  | "queued"
  | "parsing"
  | "parse_failed"
  | "normalizing"
  | "normalization_failed"
  | "pricing"
  | "pricing_failed"
  | "pending_review"
  | "auto_approved"
  | "overridden"
  | "completed";

export const TERMINAL_JD_STATUSES: readonly JdStatus[] = [
  "parse_failed",
  "normalization_failed",
  "pricing_failed",
  "pending_review",
  "auto_approved",
  "overridden",
  "completed",
];

export const FAILED_JD_STATUSES: readonly JdStatus[] = [
  "parse_failed",
  "normalization_failed",
  "pricing_failed",
];

export interface JdStatusResponse {
  jdId: string;
  status: JdStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContributingSignal {
  signalType: string;
  description: string;
  weight: string;
}

export interface PricingRecommendation {
  id: string;
  jdId: string;
  payRateLow: string;
  payRateHigh: string;
  billRateLow: string;
  billRateHigh: string;
  markupPct: string;
  confidenceScore: number;
  status: string;
  contributingSignals: ContributingSignal[];
  marketDataUnavailable: boolean;
  rateCardApplied: boolean;
  rateCardConstraintViolated: boolean;
  fallbackReason: string | null;
  explanation: string | null;
}
