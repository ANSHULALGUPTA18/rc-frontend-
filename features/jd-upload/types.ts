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
  /** Id of the source PDF this position was extracted from (batch grouping). */
  sourceFileId?: string;
  /** Original filename of the source PDF (batch grouping). */
  sourceFileName?: string;
  /** How this position was detected — used to label the PDF as Text vs Scanned. */
  detectionSource?: DetectedPosition["detectionSource"];
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
  /** Human-readable name of the selected template; stored in pricing history. */
  promptName?: string | null;
  /** Recruiter-entered location override; null if left blank. */
  locationOverride: string | null;
  /** Recruiter-entered sector override; null if left blank. */
  sectorOverride: string | null;
}

// ─── Pre-flight detection ─────────────────────────────────────────────────────

/** Result from POST /v1/jds/preflight — fast doc-type check with no AI. */
export interface PreflightResult {
  filename: string;
  pageCount: number;
  isImagePdf: boolean;
  /** True when the file needs GPT-4o Vision processing. */
  needsVision: boolean;
}

// ─── Multi-position detection types ────────────────────────────────────────────

/** One detected position returned by POST /v1/jds/smart-upload. */
export interface DetectedPosition {
  tempId: string;
  title: string | null;
  location: string | null;
  experienceLevel: string | null;
  employmentType: string | null;
  sector: string | null;
  client: string | null;
  skills: string[];
  mandatorySkills: string[];
  rawText: string;
  detectionSource: "gemini" | "heading_split" | "vision";
}

export interface SmartUploadResponse {
  sourceFilename: string;
  positions: DetectedPosition[];
}

// ─── Batch extraction progress ──────────────────────────────────────────────────

export type ExtractionStatus = "pending" | "processing" | "completed" | "failed";

/** Live status of one PDF as the batch worker pool processes it. */
export interface FileExtractionProgress {
  /** The SelectedJdFile id — stable across retries. */
  fileId: string;
  fileName: string;
  status: ExtractionStatus;
  /** Positions extracted + confirmed once completed. */
  positionCount: number;
  /** Failure message when status === "failed". */
  error: string | null;
  /** Source file size in bytes (for display). */
  sizeBytes?: number;
  /** ISO timestamp when the upload batch started (for display). */
  uploadedAt?: string;
}

/** One item sent to POST /v1/jds/confirm-positions. */
export interface ConfirmPositionItem {
  tempId: string;
  title: string | null;
  rawText: string;
  location: string | null;
  sector: string | null;
  skills: string[];
  mandatorySkills: string[];
  experienceLevel: string | null;
  employmentType: string | null;
  detectionSource: "gemini" | "heading_split" | "vision";
}

// ─── Batch pricing progress ─────────────────────────────────────────────────────

/** Live status of one JD's pricing as the worker pool processes it. */
export type PricingStatus = "pending" | "pricing" | "done" | "failed";

// ─── Pricing history ────────────────────────────────────────────────────────────

/** One entry in a JD's pricing history (GET /v1/jds/{jdId}/pricing-history). */
export interface PricingVersion {
  id: string;
  versionNumber: number;
  promptName: string | null;
  promptSnapshot: string | null;
  payRateLow: string;
  payRateHigh: string;
  billRateLow: string;
  billRateHigh: string;
  markupPct: string;
  confidenceScore: number;
  explanation: string | null;
  submissionStatus: string;
  createdAt: string;
}

/** One JD created by confirm-positions — mirrors the single-JD response shape. */
export interface ConfirmedJD {
  jdId: string;
  status: string;
  tempId: string;
  extractedFields: ExtractedFields;
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
  submissionStatus: string;
  contributingSignals: ContributingSignal[];
  marketDataUnavailable: boolean;
  rateCardApplied: boolean;
  rateCardConstraintViolated: boolean;
  fallbackReason: string | null;
  explanation: string | null;
}
