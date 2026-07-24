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
  /** True when this position was entered by hand (not found in any uploaded JD). */
  isManual?: boolean;
}

/**
 * A manually-entered labor category requested by the client but absent from the
 * uploaded JD. Held client-side (with a temp id) until the recruiter continues
 * to Prompt Selection, at which point it is committed via confirm-positions and
 * becomes a regular SubmittedJd (source = "manual").
 */
export interface ManualPositionForm {
  /** Labor Category — the only required field. Maps to the position title. */
  laborCategory: string;
  location: string;
  experience: string;
  education: string;
  /** Free text; comma- or newline-separated. Parsed into a skills array. */
  skills: string;
  responsibilities: string;
  employmentType: string;
  notes: string;
}

export interface ManualPositionDraft {
  draftId: string;
  /** The source PDF this labor category is attached to — it inherits ONLY that
   *  PDF's client/contract context and is grouped under that PDF downstream. */
  sourceFileId: string;
  form: ManualPositionForm;
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
  /** Extra rate tiers to request: "remote" | "nearshore" | "offshore". */
  rateTiers?: RateTierId[];
}

/** Selectable extra rate tiers (onsite is always priced). */
export type RateTierId = "remote" | "nearshore" | "offshore";

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

/**
 * Whether an AI response (extraction or pricing) came from cache or was
 * freshly generated. Observational only — never implies anything about
 * correctness. No technical details (keys, request ids) included.
 */
export interface CacheMeta {
  hit: boolean;
  type: "extraction" | "pricing";
  tier: string | null;
}

export interface SmartUploadResponse {
  sourceFilename: string;
  positions: DetectedPosition[];
  cache: CacheMeta;
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
  /** Extraction cache metadata — null until the smart-upload call resolves. */
  cache?: CacheMeta | null;
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
  /** The requesting organization (e.g. "State of Vermont") — carried through
   *  from smart-upload's document-level detection so pricing can use it. */
  client: string | null;
  detectionSource: "gemini" | "heading_split" | "vision" | "manual";
}

// ─── Batch pricing progress ─────────────────────────────────────────────────────

/** Live status of one JD's pricing as the worker pool processes it. */
export type PricingStatus = "pending" | "pricing" | "done" | "failed";

// ─── Pricing history ────────────────────────────────────────────────────────────

/** One entry in a JD's pricing history (GET /v1/jds/{jdId}/pricing-history). */
/** One offshore/nearshore rate tier: pay + bill ranges in USD/hr. */
export interface GlobalRateTier {
  payLow: number;
  payHigh: number;
  billLow: number;
  billHigh: number;
}

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
  /**
   * Legacy prose rationale — only present on recommendations priced before
   * AI reasoning was removed. Null for all new ones; use the structured
   * fields below instead.
   */
  explanation: string | null;
  /**
   * Source URLs the model says it used. Sanitized for display but NOT
   * verified — always label these as model-cited, never as evidence.
   */
  sources?: string[] | null;
  keySkills?: string[] | null;
  marketFactors?: string[] | null;
  /**
   * Contractor pay-rate evidence pipeline decision (UAT): "recommend" when
   * strong matched evidence supports the rate, "human_review" when evidence is
   * thin/wrong-occupation/insufficient. null/undefined on legacy pricing.
   */
  evidenceDecision?: string | null;
  submissionStatus: string;
  createdAt: string;
  /** Extra rate tiers when the pricing model provided them. */
  globalRates?: {
    offshore?: GlobalRateTier;
    nearshore?: GlobalRateTier;
    remote?: GlobalRateTier;
  } | null;
  /** null when unknown (recommendation predates this field). */
  cache?: CacheMeta | null;
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
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
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
