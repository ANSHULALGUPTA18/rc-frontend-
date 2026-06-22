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
import { IS_MOCK } from "@/lib/api/config";
import type { MsalTokenContext } from "@/lib/auth/token-storage";
import type {
  ContributingSignal,
  ExtractedFields,
  JdStatus,
  JdStatusResponse,
  PricingRecommendation,
  ResolvedPromptConfig,
  SubmittedJd,
} from "@/features/jd-upload/types";

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
    name: "Prompt_1",
    content: "Please provide the public sector hourly pay rate of this position.",
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
    contributingSignals: (raw.contributing_signals ?? []).map(
      (signal): ContributingSignal => ({
        signalType: signal.signal_type,
        description: signal.description,
        weight: signal.weight,
      }),
    ),
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
      location_override: promptConfig.locationOverride,
      sector_override: promptConfig.sectorOverride,
    }),
    msal,
  });
  return { jdId: res.jd_id, status: res.status };
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
