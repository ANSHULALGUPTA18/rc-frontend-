/**
 * Dashboard API client.
 *
 * Each exported function follows the same contract:
 *   - When IS_MOCK=true  → returns the MOCK_* constant immediately (no network call).
 *   - When IS_MOCK=false → calls the real REST endpoint; throws on non-2xx so
 *     TanStack Query surfaces an error state — no silent fallback to mock data.
 *
 * To connect the real backend:
 *   1. Set NEXT_PUBLIC_USE_MOCK=false in .env.local
 *   2. Delete every `MOCK_*` constant and `if (IS_MOCK) return MOCK_*` line
 *   3. Confirm the endpoint paths match your backend routes
 */

import { IS_MOCK, API_BASE } from "@/lib/api/config";

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
  requestId: string;
  client: string;
  role: string;
  proposedRate: string;
  aiConfidence: number;
  status: "approved" | "pending";
}

export interface ReportItem {
  id: string;
  title: string;
  fileType: string;
  fileSize: string;
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
  { id: "1", requestId: "#RQ-8821", client: "Astra Financial", role: "Snr DevOps Engineer", proposedRate: "$145.00/hr", aiConfidence: 94, status: "approved" },
  { id: "2", requestId: "#RQ-8821", client: "Astra Financial", role: "Snr DevOps Engineer", proposedRate: "$145.00/hr", aiConfidence: 94, status: "pending" },
  { id: "3", requestId: "#RQ-8821", client: "Astra Financial", role: "Snr DevOps Engineer", proposedRate: "$145.00/hr", aiConfidence: 94, status: "pending" },
  { id: "4", requestId: "#RQ-8821", client: "Astra Financial", role: "Snr DevOps Engineer", proposedRate: "$145.00/hr", aiConfidence: 94, status: "pending" },
  { id: "5", requestId: "#RQ-8821", client: "Astra Financial", role: "Snr DevOps Engineer", proposedRate: "$145.00/hr", aiConfidence: 94, status: "pending" },
];

const MOCK_REPORTS: ReportItem[] = [
  { id: "1", title: "Q1 Pricing Outlook",  fileType: "PDF",  fileSize: "4.2 MB"  },
  { id: "2", title: "Regional Benchmarks", fileType: "XLSX", fileSize: "12.8 MB" },
  { id: "3", title: "AI Talent Scarcity",  fileType: "PDF",  fileSize: "2.1 MB"  },
];

// ─── API functions ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function getKpiStats(): Promise<KpiStats> {
  if (IS_MOCK) return MOCK_KPI;
  return apiFetch<KpiStats>("/dashboard/kpi");
}

export async function getApprovals(): Promise<ApprovalRow[]> {
  if (IS_MOCK) return MOCK_APPROVALS;
  return apiFetch<ApprovalRow[]>("/dashboard/approvals");
}

export async function getReports(): Promise<ReportItem[]> {
  if (IS_MOCK) return MOCK_REPORTS;
  return apiFetch<ReportItem[]>("/dashboard/reports");
}
