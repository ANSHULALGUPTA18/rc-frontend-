/**
 * JD Upload API client — pricing rows and prompt template options.
 *
 * getPricingRows(fileId) — called per selected file in PricingView.
 *   The fileId is the client-side UUID assigned at upload time; the real
 *   backend will need a server-side document ID instead — update the query
 *   param when the upload endpoint is wired.
 *
 * getPromptOptions() — lightweight list used by PromptSelectionView dropdown.
 *   Intentionally separate from the full prompt-template feature so the
 *   dropdown stays fast even if the full template list is large.
 */

import { IS_MOCK, API_BASE } from "@/lib/api/config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PricingRow {
  id: string;
  position: string;
  expYrs: number;
  existingPrice: number;
}

export interface PromptTemplateOption {
  id: string;
  name: string;
  content: string;
}

// ─── Mock data — delete this block when backend is connected ──────────────────

const MOCK_PRICING_ROWS: PricingRow[] = [
  { id: "1", position: "Data Analyst",     expYrs: 2, existingPrice: 132000 },
  { id: "2", position: "Project Manager",  expYrs: 6, existingPrice: 132000 },
  { id: "3", position: "Cloud Engineer",   expYrs: 4, existingPrice: 132000 },
  { id: "4", position: "QA Tester",        expYrs: 3, existingPrice: 132000 },
  { id: "5", position: "QA Tester",        expYrs: 3, existingPrice: 132000 },
  { id: "6", position: "QA Tester",        expYrs: 3, existingPrice: 132000 },
];

const MOCK_PROMPT_OPTIONS: PromptTemplateOption[] = [
  { id: "1", name: "Prompt_1",       content: "Please provide the public sector hourly pay rate of this position." },
  { id: "2", name: "analysis_v2",    content: "Analyse the provided pricing documents and extract the line item costs, volume discounts, and service level agreements. Ensure all currency values are normalized to USD." },
  { id: "3", name: "extraction_v3",  content: "Extract all role-specific compensation data, including base salary bands, bonus structures, and equity components for this position." },
];

// ─── API functions ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function getPricingRows(fileId: string): Promise<PricingRow[]> {
  if (IS_MOCK) return MOCK_PRICING_ROWS;
  return apiFetch<PricingRow[]>(`/pricing/rows?fileId=${fileId}`);
}

export async function getPromptOptions(): Promise<PromptTemplateOption[]> {
  if (IS_MOCK) return MOCK_PROMPT_OPTIONS;
  return apiFetch<PromptTemplateOption[]>("/prompt-templates/options");
}
