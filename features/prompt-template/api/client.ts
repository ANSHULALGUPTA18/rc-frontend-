/**
 * Prompt Template API client — CRUD operations for AI instruction sets.
 *
 * createPromptTemplate in mock mode returns a new object with a random UUID so
 * optimistic UI works immediately. The real endpoint should return the
 * persisted object with a server-assigned ID.
 *
 * setDefaultPromptTemplate and deletePromptTemplate are fire-and-forget in mock
 * mode (no-op). In production they must succeed before the UI reflects the
 * change — replace the void calls in usePromptTemplates with useMutation.
 */

import { IS_MOCK, API_BASE } from "@/lib/api/config";
import type { PromptTemplate } from "@/features/prompt-template/types";

// ─── Mock data — delete this block when backend is connected ──────────────────

export const MOCK_TEMPLATES: PromptTemplate[] = [
  {
    id: "1",
    name: "prompt_1",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis moac mi nisl, eu tempor urna. Curabitur vel bibendum lorem. Morbi convallis convallis diam sit amet lacinia. Aliquam in elementum.",
    isDefault: true,
    usedInCampaigns: 14,
    editedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    name: "analysis_v2",
    content: "Analyse the provided pricing documents and extract the line item costs, volume discounts, and service level agreements. Ensure all currency values are normalized to USD. Flag any inconsistencies in year-over-year pricing.",
    isDefault: false,
    usedInCampaigns: 8,
    editedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "3",
    name: "extraction_v3",
    content: "Analyse the provided pricing documents and extract the line item costs, volume discounts, and service level agreements. Ensure all currency values are normalized to USD. Flag any inconsistencies in year-over-year pricing.",
    isDefault: false,
    usedInCampaigns: 8,
    editedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
];

// ─── API functions ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function getPromptTemplates(): Promise<PromptTemplate[]> {
  if (IS_MOCK) return MOCK_TEMPLATES;
  return apiFetch<PromptTemplate[]>("/prompt-templates");
}

export async function createPromptTemplate(
  name: string,
  content: string,
): Promise<PromptTemplate> {
  if (IS_MOCK) {
    return { id: crypto.randomUUID(), name, content, isDefault: false, usedInCampaigns: 0, editedAt: new Date() };
  }
  return apiFetch<PromptTemplate>("/prompt-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, content }),
  });
}

export async function deletePromptTemplate(id: string): Promise<void> {
  if (IS_MOCK) return;
  await apiFetch<void>(`/prompt-templates/${id}`, { method: "DELETE" });
}

export async function setDefaultPromptTemplate(id: string): Promise<void> {
  if (IS_MOCK) return;
  await apiFetch<void>(`/prompt-templates/${id}/set-default`, { method: "PATCH" });
}
