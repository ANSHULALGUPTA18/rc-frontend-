/**
 * Dashboard API client.
 *
 * There is no dedicated /dashboard/* backend API. Pending Approvals and the
 * KPI cards are derived from GET /v1/review-queue (the same data the JD
 * Upload -> Recommendations flow produces). Reports has no backend
 * equivalent and always returns an empty list.
 */

import { apiFetch } from "@/lib/api/client";
import { IS_MOCK } from "@/lib/api/config";
import type { MsalTokenContext } from "@/lib/auth/token-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpiStats {
  activeRequests: number;
  activeRequestsTrend: string;
  pendingApprovals: number;
  pendingApprovalsTrend: string;
  recentPricingReports: number;
  accuracyRate: string;
  avgMargin: string;
}

export interface ApprovalRow {
  id: string;
  jdId: string;
  payRateRange: string;
  billRateRange: string;
  markupPct: string;
  aiConfidence: number;
  status: "approved" | "pending";
  submittedByName: string | null;
  submittedByEmail: string | null;
}

export interface ReportItem {
  id: string;
  title: string;
  fileType: string;
  fileSize: string;
}

// ─── Raw backend response shapes ───────────────────────────────────────────────

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
  submitted_by_name?: string | null;
  submitted_by_email?: string | null;
}

interface ReviewQueueResponse {
  items: RawRecommendation[];
  total: number;
  page: number;
  page_size: number;
}

function fmtRate(raw: string): string {
  return `$${parseFloat(raw).toFixed(2)}`;
}

function mapApprovalRow(raw: RawRecommendation): ApprovalRow {
  return {
    id: raw.id,
    jdId: raw.jd_id,
    payRateRange: `${fmtRate(raw.pay_rate_low)} – ${fmtRate(raw.pay_rate_high)}/hr`,
    billRateRange: `${fmtRate(raw.bill_rate_low)} – ${fmtRate(raw.bill_rate_high)}/hr`,
    markupPct: parseFloat(raw.markup_pct).toFixed(1),
    aiConfidence: Math.round(raw.confidence_score * 100),
    status: raw.status === "pending" ? "pending" : "approved",
    submittedByName: raw.submitted_by_name ?? null,
    submittedByEmail: raw.submitted_by_email ?? null,
  };
}

// ─── Mock data — delete this block when backend is connected ──────────────────

const MOCK_KPI: KpiStats = {
  activeRequests: 0,
  activeRequestsTrend: "+0% vs last month",
  pendingApprovals: 0,
  pendingApprovalsTrend: "+0% vs last month",
  recentPricingReports: 0,
  accuracyRate: "0% Accurate",
  avgMargin: "00.0%",
};

const MOCK_APPROVALS: ApprovalRow[] = [
  {
    id: "1",
    jdId: "jd-8821",
    payRateRange: "$60.00 - $70.00/hr",
    billRateRange: "$145.00 - $155.00/hr",
    markupPct: "32.5",
    aiConfidence: 94,
    status: "approved",
    submittedByName: "Anshu G",
    submittedByEmail: "anshu.g@techgene.com",
  },
  {
    id: "2",
    jdId: "jd-8822",
    payRateRange: "$60.00 - $70.00/hr",
    billRateRange: "$145.00 - $155.00/hr",
    markupPct: "32.5",
    aiConfidence: 94,
    status: "pending",
    submittedByName: "Anshu G",
    submittedByEmail: "anshu.g@techgene.com",
  },
  {
    id: "3",
    jdId: "jd-8823",
    payRateRange: "$60.00 - $70.00/hr",
    billRateRange: "$145.00 - $155.00/hr",
    markupPct: "32.5",
    aiConfidence: 94,
    status: "pending",
    submittedByName: null,
    submittedByEmail: null,
  },
];

const MOCK_REPORTS: ReportItem[] = [
  { id: "1", title: "Q1 Pricing Outlook", fileType: "PDF", fileSize: "4.2 MB" },
  { id: "2", title: "Regional Benchmarks", fileType: "XLSX", fileSize: "12.8 MB" },
  { id: "3", title: "AI Talent Scarcity", fileType: "PDF", fileSize: "2.1 MB" },
];

// ─── API functions ────────────────────────────────────────────────────────────

export async function getKpiStats(msal?: MsalTokenContext): Promise<KpiStats> {
  if (IS_MOCK) return MOCK_KPI;

  const res = await apiFetch<ReviewQueueResponse>("/v1/review-queue?page_size=100", { msal });
  const items = res.items;

  const pendingApprovals = items.filter((item) => item.status === "pending").length;
  const completed = items.length - pendingApprovals;
  const avgConfidence = items.length
    ? Math.round((items.reduce((sum, item) => sum + item.confidence_score, 0) / items.length) * 100)
    : 0;
  const avgMargin = items.length
    ? items.reduce((sum, item) => sum + Number(item.markup_pct), 0) / items.length
    : 0;

  return {
    activeRequests: res.total,
    activeRequestsTrend: res.total === 1 ? "1 recommendation" : `${res.total} recommendations`,
    pendingApprovals,
    pendingApprovalsTrend:
      pendingApprovals === 1 ? "1 awaiting review" : `${pendingApprovals} awaiting review`,
    recentPricingReports: completed,
    accuracyRate: `${avgConfidence}% avg confidence`,
    avgMargin: `${avgMargin.toFixed(1)}%`,
  };
}

export async function getApprovals(msal?: MsalTokenContext): Promise<ApprovalRow[]> {
  if (IS_MOCK) return MOCK_APPROVALS;

  const res = await apiFetch<ReviewQueueResponse>("/v1/review-queue?page=1&page_size=10", { msal });
  return res.items.map(mapApprovalRow);
}

export async function getReports(): Promise<ReportItem[]> {
  if (IS_MOCK) return MOCK_REPORTS;
  return [];
}

export async function approveRecommendation(recId: string, msal?: MsalTokenContext): Promise<void> {
  await apiFetch(`/v1/recommendations/${recId}/approve`, {
    method: "POST",
    body: JSON.stringify({ action: "approved" }),
    msal,
  });
}

export async function rejectRecommendation(
  recId: string,
  comments: string,
  msal?: MsalTokenContext,
): Promise<void> {
  await apiFetch(`/v1/recommendations/${recId}/reject`, {
    method: "POST",
    body: JSON.stringify({ action: "rejected", comments }),
    msal,
  });
}
