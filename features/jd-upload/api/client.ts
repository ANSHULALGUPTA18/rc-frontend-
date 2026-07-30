/**
 * JD Upload API client — submit job descriptions and track their pricing
 * recommendations.
 *
 * submitJd(rawText)            -> POST /v1/jds              (queues the JD)
 * getJdStatus(jdId)             -> GET  /v1/jds/{jd_id}       (poll until terminal)
 * findRecommendationByJdId(jdId) -> GET /v1/review-queue      (locate the
 *   recommendation produced for this JD — there is no direct jd_id ->
 *   recommendation_id lookup, so we scan the review queue for a match).
 *
 * getPromptOptions() — lightweight list used by PromptSelectionView's dropdown.
 *   The backend has no prompt-template list endpoint (only an admin-gated
 *   upsert), so this always returns local/canned options regardless of
 *   IS_MOCK — same approach as features/prompt-template/api/client.ts.
 */

import { apiFetch } from "@/lib/api/client";
import { API_BASE, IS_MOCK } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/token-storage";
import type { MsalTokenContext } from "@/lib/auth/token-storage";
import type {
  CacheMeta,
  ConfirmPositionItem,
  ConfirmedJD,
  ContributingSignal,
  DetectedPosition,
  ExtractedFields,
  JdStatus,
  JdStatusResponse,
  PreflightResult,
  PricingRecommendation,
  PricingVersion,
  ResolvedPromptConfig,
  SmartUploadResponse,
  SubmittedJd,
} from "@/features/jd-upload/types";
import { CONTRACT_STAFFING_PAY_PROMPT } from "@/lib/prompts/prompt-store";

// ─── Cache metadata mapping (shared by smart-upload + pricing-history) ────────

interface RawCacheMeta {
  hit: boolean;
  type: string;
  tier: string | null;
}

function mapCacheMeta(raw: RawCacheMeta): CacheMeta {
  return {
    hit: raw.hit,
    type: raw.type === "pricing" ? "pricing" : "extraction",
    tier: raw.tier,
  };
}

// ─── Raw backend response shapes ───────────────────────────────────────────────

interface RawExtractedFields {
  job_title: string | null;
  experience_required: string | null;
  skills: string[];
  mandatory_skills: string[];
  location: string | null;
  employment_type: string | null;
  sector: string | null;
  confidence: number;
}

interface CreateJdResponse {
  jd_id: string;
  status: string;
  extracted_fields: RawExtractedFields;
}

interface RawJdStatusResponse {
  jd_id: string;
  status: JdStatus;
  created_at: string;
  updated_at: string;
}

interface RawContributingSignal {
  signal_type: string;
  description: string;
  weight: string;
}

interface RawRecommendation {
  id: string;
  jd_id: string;
  pay_rate_low: string;
  pay_rate_high: string;
  bill_rate_low: string;
  bill_rate_high: string;
  markup_pct: string;
  confidence_score: number;
  status: string;
  submission_status?: string;
  contributing_signals?: RawContributingSignal[];
  market_data_unavailable: boolean;
  rate_card_applied: boolean;
  rate_card_constraint_violated: boolean;
  fallback_reason: string | null;
  explanation: string | null;
}

interface ReviewQueueResponse {
  items: RawRecommendation[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Prompt selection (local-only, no backend list endpoint) ──────────────────

export interface PromptTemplateOption {
  id: string;
  name: string;
  content: string;
}

const MOCK_PROMPT_OPTIONS: PromptTemplateOption[] = [
  {
    id: "1",
    name: "Contract Staffing Pay Rate",
    content: CONTRACT_STAFFING_PAY_PROMPT,
  },
  {
    id: "2",
    name: "analysis_v2",
    content:
      "Analyse the provided pricing documents and extract the line item costs, volume discounts, and service level agreements. Ensure all currency values are normalized to USD.",
  },
  {
    id: "3",
    name: "extraction_v3",
    content:
      "Extract all role-specific compensation data, including base salary bands, bonus structures, and equity components for this position.",
  },
];

function mapRecommendation(raw: RawRecommendation): PricingRecommendation {
  return {
    id: raw.id,
    jdId: raw.jd_id,
    payRateLow: raw.pay_rate_low,
    payRateHigh: raw.pay_rate_high,
    billRateLow: raw.bill_rate_low,
    billRateHigh: raw.bill_rate_high,
    markupPct: raw.markup_pct,
    confidenceScore: raw.confidence_score,
    status: raw.status,
    submissionStatus: raw.submission_status ?? "draft",
    contributingSignals: (raw.contributing_signals ?? []).map((signal): ContributingSignal => ({
      signalType: signal.signal_type,
      description: signal.description,
      weight: signal.weight,
    })),
    marketDataUnavailable: raw.market_data_unavailable,
    rateCardApplied: raw.rate_card_applied,
    rateCardConstraintViolated: raw.rate_card_constraint_violated,
    fallbackReason: raw.fallback_reason,
    explanation: raw.explanation,
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

function mapExtractedFields(raw: RawExtractedFields): ExtractedFields {
  return {
    jobTitle: raw.job_title,
    experienceRequired: raw.experience_required,
    skills: raw.skills,
    mandatorySkills: raw.mandatory_skills,
    location: raw.location,
    employmentType: raw.employment_type,
    sector: raw.sector,
    confidence: raw.confidence,
  };
}

export async function submitJd(
  file: File,
  msal?: MsalTokenContext,
): Promise<{ jdId: string; status: string; extractedFields: ExtractedFields }> {
  if (IS_MOCK) {
    return {
      jdId: crypto.randomUUID(),
      status: "queued",
      extractedFields: {
        jobTitle: "Senior Python Developer",
        experienceRequired: "5+ years",
        skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
        mandatorySkills: ["Python", "FastAPI"],
        location: "Austin, TX",
        employmentType: "Contract",
        sector: "Technology",
        confidence: 0.87,
      },
    };
  }

  const form = new FormData();
  form.append("file", file);
  form.append("source", "upload");

  const res = await apiFetch<CreateJdResponse>("/v1/jds", {
    method: "POST",
    body: form,
    msal,
  });

  return {
    jdId: res.jd_id,
    status: res.status,
    extractedFields: mapExtractedFields(res.extracted_fields),
  };
}

export async function getJdStatus(
  jdId: string,
  msal?: MsalTokenContext,
): Promise<JdStatusResponse> {
  if (IS_MOCK) {
    return {
      jdId,
      status: "pending_review",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  const res = await apiFetch<RawJdStatusResponse>(`/v1/jds/${jdId}`, { msal });
  return {
    jdId: res.jd_id,
    status: res.status,
    createdAt: res.created_at,
    updatedAt: res.updated_at,
  };
}

export async function findRecommendationByJdId(
  jdId: string,
  msal?: MsalTokenContext,
): Promise<PricingRecommendation | null> {
  if (IS_MOCK) {
    return {
      id: crypto.randomUUID(),
      jdId,
      payRateLow: "55.00",
      payRateHigh: "65.00",
      billRateLow: "85.00",
      billRateHigh: "95.00",
      markupPct: "32.5",
      confidenceScore: 0.87,
      status: "pending",
      submissionStatus: "pending_approval",
      contributingSignals: [
        {
          signalType: "market_data",
          description: "BLS median for this role/region",
          weight: "0.6",
        },
        { signalType: "rate_card", description: "Client rate card cap applied", weight: "0.4" },
      ],
      marketDataUnavailable: false,
      rateCardApplied: true,
      rateCardConstraintViolated: false,
      fallbackReason: null,
      explanation: "Pricing based on regional market data and the active rate card.",
    };
  }

  const res = await apiFetch<ReviewQueueResponse>("/v1/review-queue?page_size=100", { msal });
  const match = res.items.find((item) => item.jd_id === jdId);
  return match ? mapRecommendation(match) : null;
}

export async function getPromptOptions(): Promise<PromptTemplateOption[]> {
  if (typeof window !== "undefined") {
    const { getPrompts } = await import("@/lib/prompts/prompt-store");
    const stored = getPrompts();
    if (stored.length > 0) {
      return stored.map((p) => ({ id: p.id, name: p.name, content: p.content }));
    }
  }
  return MOCK_PROMPT_OPTIONS;
}

export async function priceJd(
  jdId: string,
  promptConfig: ResolvedPromptConfig,
  msal?: MsalTokenContext,
): Promise<{ jdId: string; status: string }> {
  if (IS_MOCK) {
    return { jdId, status: "pending_review" };
  }
  const res = await apiFetch<{ jd_id: string; status: string }>(`/v1/jds/${jdId}/price`, {
    method: "POST",
    body: JSON.stringify({
      prompt_content: promptConfig.promptContent,
      prompt_name: promptConfig.promptName ?? null,
      location_override: promptConfig.locationOverride,
      sector_override: promptConfig.sectorOverride,
      client_override: promptConfig.clientOverride ?? null,
      rate_tiers: promptConfig.rateTiers ?? null,
    }),
    msal,
  });
  return { jdId: res.jd_id, status: res.status };
}

/**
 * Price several JDs that share one prompt config in a single request.
 *
 * The backend prices them in one AI call (better cross-role consistency,
 * far fewer tokens) and falls back to per-position calls for anything it
 * cannot price. Always resolves with one result per requested jdId —
 * per-position failures are reported in-band, not thrown.
 */
export async function priceJdBatch(
  jdIds: string[],
  promptConfig: ResolvedPromptConfig,
  msal?: MsalTokenContext,
): Promise<{ jdId: string; status: string; error: string | null }[]> {
  if (IS_MOCK) {
    return jdIds.map((jdId) => ({ jdId, status: "pending_review", error: null }));
  }
  const res = await apiFetch<{
    results: { jd_id: string; status: string; error: string | null }[];
  }>("/v1/jds/price-batch", {
    method: "POST",
    body: JSON.stringify({
      jd_ids: jdIds,
      prompt_content: promptConfig.promptContent,
      prompt_name: promptConfig.promptName ?? null,
      location_override: promptConfig.locationOverride,
      sector_override: promptConfig.sectorOverride,
      client_override: promptConfig.clientOverride ?? null,
      rate_tiers: promptConfig.rateTiers ?? null,
    }),
    msal,
  });
  return res.results.map((r) => ({
    jdId: r.jd_id,
    status: r.status,
    error: r.error,
  }));
}

export async function getPricingHistory(
  jdId: string,
  msal?: MsalTokenContext,
): Promise<PricingVersion[]> {
  if (IS_MOCK) {
    return [];
  }
  const res = await apiFetch<
    {
      id: string;
      version_number: number;
      prompt_name: string | null;
      prompt_snapshot: string | null;
      pay_rate_low: string;
      pay_rate_high: string;
      bill_rate_low: string;
      bill_rate_high: string;
      markup_pct: string;
      confidence_score: number;
      explanation: string | null;
      sources?: string[] | null;
      key_skills?: string[] | null;
      market_factors?: string[] | null;
      evidence_decision?: string | null;
      agency_rate?: {
        available: boolean;
        searched?: boolean;
        low: number | null;
        high: number | null;
        grade: string | null;
        decision?: string | null;
        sources?: string[] | null;
      } | null;
      submission_status: string;
      created_at: string;
      global_rates?: Record<
        string,
        { pay_low: number; pay_high: number; bill_low: number; bill_high: number }
      > | null;
      cache?: RawCacheMeta | null;
    }[]
  >(`/v1/jds/${jdId}/pricing-history`, { msal });

  const mapTier = (t?: {
    pay_low: number;
    pay_high: number;
    bill_low: number;
    bill_high: number;
  }) =>
    t
      ? { payLow: t.pay_low, payHigh: t.pay_high, billLow: t.bill_low, billHigh: t.bill_high }
      : undefined;

  return res.map((v) => ({
    id: v.id,
    versionNumber: v.version_number,
    promptName: v.prompt_name,
    promptSnapshot: v.prompt_snapshot,
    payRateLow: v.pay_rate_low,
    payRateHigh: v.pay_rate_high,
    billRateLow: v.bill_rate_low,
    billRateHigh: v.bill_rate_high,
    markupPct: v.markup_pct,
    confidenceScore: v.confidence_score,
    explanation: v.explanation,
    sources: v.sources ?? null,
    keySkills: v.key_skills ?? null,
    marketFactors: v.market_factors ?? null,
    evidenceDecision: v.evidence_decision ?? null,
    agencyRate: v.agency_rate ?? null,
    submissionStatus: v.submission_status,
    createdAt: v.created_at,
    globalRates: v.global_rates
      ? {
          offshore: mapTier(v.global_rates.offshore),
          nearshore: mapTier(v.global_rates.nearshore),
          remote: mapTier(v.global_rates.remote),
        }
      : null,
    cache: v.cache ? mapCacheMeta(v.cache) : null,
  }));
}

// ─── Pre-flight detection ─────────────────────────────────────────────────────

export async function preflight(file: File, msal?: MsalTokenContext): Promise<PreflightResult> {
  if (IS_MOCK) {
    return {
      filename: file.name,
      pageCount: 3,
      isImagePdf: false,
      needsVision: false,
    };
  }

  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch<{
    filename: string;
    page_count: number;
    is_image_pdf: boolean;
    needs_vision: boolean;
  }>("/v1/jds/preflight", {
    method: "POST",
    body: form,
    msal,
  });

  return {
    filename: res.filename,
    pageCount: res.page_count,
    isImagePdf: res.is_image_pdf,
    needsVision: res.needs_vision,
  };
}

// ─── Smart upload (multi-position) ───────────────────────────────────────────

interface RawDetectedPosition {
  temp_id: string;
  title: string | null;
  location: string | null;
  experience_level: string | null;
  employment_type: string | null;
  sector: string | null;
  client: string | null;
  skills: string[];
  mandatory_skills: string[];
  raw_text: string;
  detection_source: string;
}

interface RawSmartUploadResponse {
  source_filename: string;
  positions: RawDetectedPosition[];
  cache: RawCacheMeta;
}

interface RawConfirmedJD {
  jd_id: string;
  status: string;
  temp_id: string;
  extracted_fields: RawExtractedFields;
}

const MOCK_MULTI_POSITIONS: DetectedPosition[] = [
  {
    tempId: "pos_0",
    title: "Project Manager",
    location: "Vermont, USA",
    experienceLevel: "Senior",
    employmentType: "Contract",
    sector: "Government",
    client: "State of Vermont",
    skills: ["Azure DevOps", "Agile", "PMP", "Microsoft Project", "Stakeholder Management"],
    mandatorySkills: ["PMP"],
    rawText: "Project Manager\nThe State follows the EPMO project hybrid methodology...",
    detectionSource: "gemini",
  },
  {
    tempId: "pos_1",
    title: "Technical Analyst",
    location: "Vermont, USA",
    experienceLevel: "Mid",
    employmentType: "Contract",
    sector: "Government",
    client: "State of Vermont",
    skills: ["SQL", "Business Analysis", "JIRA", "Visio", "Requirements Gathering"],
    mandatorySkills: [],
    rawText: "Technical Analyst\nMinimum 10 years experience in technical analysis...",
    detectionSource: "gemini",
  },
  {
    tempId: "pos_2",
    title: "Salesforce Developer",
    location: "Vermont, USA",
    experienceLevel: "Senior",
    employmentType: "Contract",
    sector: "Government",
    client: "State of Vermont",
    skills: ["Apex", "SOQL", "REST APIs", "VisualForce", "Salesforce Lightning"],
    mandatorySkills: ["Apex", "SOQL"],
    rawText: "Salesforce Developer\nExperience with Salesforce platform development...",
    detectionSource: "gemini",
  },
];

export async function smartUpload(
  file: File,
  msal?: MsalTokenContext,
): Promise<SmartUploadResponse> {
  if (IS_MOCK) {
    return {
      sourceFilename: file.name,
      positions: MOCK_MULTI_POSITIONS,
      cache: { hit: false, type: "extraction", tier: null },
    };
  }

  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch<RawSmartUploadResponse>("/v1/jds/smart-upload", {
    method: "POST",
    body: form,
    msal,
  });

  return {
    sourceFilename: res.source_filename,
    positions: res.positions.map((p) => {
      const src = p.detection_source;
      const detectionSource: DetectedPosition["detectionSource"] =
        src === "heading_split" ? "heading_split" : src === "vision" ? "vision" : "gemini";
      return {
        tempId: p.temp_id,
        title: p.title,
        location: p.location,
        experienceLevel: p.experience_level,
        employmentType: p.employment_type,
        sector: p.sector,
        client: p.client,
        skills: p.skills,
        mandatorySkills: p.mandatory_skills,
        rawText: p.raw_text,
        detectionSource,
      };
    }),
    cache: mapCacheMeta(res.cache),
  };
}

export async function confirmPositions(
  positions: ConfirmPositionItem[],
  msal?: MsalTokenContext,
): Promise<ConfirmedJD[]> {
  if (IS_MOCK) {
    return positions.map((p) => ({
      jdId: crypto.randomUUID(),
      status: "queued",
      tempId: p.tempId,
      extractedFields: {
        jobTitle: p.title,
        experienceRequired: "5+ years",
        skills: ["Python", "FastAPI"],
        mandatorySkills: [],
        location: "Remote",
        employmentType: "Contract",
        sector: "Technology",
        confidence: 0.75,
      },
    }));
  }

  const res = await apiFetch<RawConfirmedJD[]>("/v1/jds/confirm-positions", {
    method: "POST",
    body: JSON.stringify({
      positions: positions.map((p) => ({
        temp_id: p.tempId,
        title: p.title,
        raw_text: p.rawText,
        location: p.location,
        sector: p.sector,
        skills: p.skills,
        mandatory_skills: p.mandatorySkills,
        experience_level: p.experienceLevel,
        employment_type: p.employmentType,
        client: p.client,
        detection_source: p.detectionSource as string,
      })),
    }),
    msal,
  });

  return res.map((item) => ({
    jdId: item.jd_id,
    status: item.status,
    tempId: item.temp_id,
    extractedFields: mapExtractedFields(item.extracted_fields),
  }));
}

export async function submitForApproval(
  recId: string,
  notes: string | null,
  msal?: MsalTokenContext,
): Promise<{ approvalId: string; status: string }> {
  if (IS_MOCK) {
    return { approvalId: crypto.randomUUID(), status: "pending_approval" };
  }
  const res = await apiFetch<{ approval_id: string; status: string }>(
    `/v1/recommendations/${recId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({ notes }),
      msal,
    },
  );
  return { approvalId: res.approval_id, status: res.status };
}

/**
 * Submit MANY recommendations for approval in one action.
 * Admins receive ONE combined Outlook email (Approve All / Reject All)
 * instead of one email per JD.
 */
export async function submitBatchForApproval(
  recIds: string[],
  notes: string | null,
  msal?: MsalTokenContext,
): Promise<{ submitted: string[]; skipped: { recommendationId: string; reason: string }[] }> {
  if (IS_MOCK) {
    return { submitted: recIds, skipped: [] };
  }
  const res = await apiFetch<{
    submitted: string[];
    skipped: { recommendation_id: string; reason: string }[];
  }>(`/v1/recommendations/submit-batch`, {
    method: "POST",
    body: JSON.stringify({ rec_ids: recIds, notes }),
    msal,
  });
  return {
    submitted: res.submitted,
    skipped: res.skipped.map((s) => ({ recommendationId: s.recommendation_id, reason: s.reason })),
  };
}

// ─── Pricing Excel export ─────────────────────────────────────────────────────

/** One row in the exported rate card (camelCase; mapped to snake_case on send). */
export interface PricingExportRow {
  position: string | null;
  sourcePdf: string | null;
  location: string | null;
  sector: string | null;
  experience: string | null;
  skills: string | null;
  payRateLow: number | null;
  payRateHigh: number | null;
  agencyPayLow?: number | null;
  agencyPayHigh?: number | null;
  agencyGrade?: string | null;
  remotePay?: string | null;
  remoteBill?: string | null;
  offshorePay?: string | null;
  offshoreBill?: string | null;
  nearshorePay?: string | null;
  nearshoreBill?: string | null;
  billRateLow: number | null;
  billRateHigh: number | null;
  markupPct: number | null;
  confidence: number | null;
  prompt: string | null;
  /** Newline-joined model-cited source URLs (replaces the old rationale). */
  sources: string | null;
  /** Semicolon-joined market factors. */
  marketFactors: string | null;
  status: string | null;
  pricedOn: string | null;
}

/**
 * Download the current batch of pricing recommendations as an .xlsx file.
 * Posts the on-screen rows to the backend, which returns a styled workbook;
 * this then triggers a browser download.
 */
export async function exportPricingExcel(
  rows: PricingExportRow[],
  msal?: MsalTokenContext,
): Promise<void> {
  const body = {
    rows: rows.map((r) => ({
      position: r.position,
      source_pdf: r.sourcePdf,
      location: r.location,
      sector: r.sector,
      experience: r.experience,
      skills: r.skills,
      pay_rate_low: r.payRateLow,
      pay_rate_high: r.payRateHigh,
      agency_pay_low: r.agencyPayLow ?? null,
      agency_pay_high: r.agencyPayHigh ?? null,
      agency_grade: r.agencyGrade ?? null,
      bill_rate_low: r.billRateLow,
      bill_rate_high: r.billRateHigh,
      remote_pay: r.remotePay ?? null,
      remote_bill: r.remoteBill ?? null,
      offshore_pay: r.offshorePay ?? null,
      offshore_bill: r.offshoreBill ?? null,
      nearshore_pay: r.nearshorePay ?? null,
      nearshore_bill: r.nearshoreBill ?? null,
      markup_pct: r.markupPct,
      confidence: r.confidence,
      prompt: r.prompt,
      sources: r.sources,
      market_factors: r.marketFactors,
      status: r.status,
      priced_on: r.pricedOn,
    })),
  };

  const headers = new Headers({ "Content-Type": "application/json" });
  if (!IS_MOCK) {
    const token = await getAccessToken(msal);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}/v1/jds/pricing-export`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "pricing_recommendations.xlsx";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
