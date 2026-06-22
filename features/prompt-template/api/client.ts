/**
 * Prompt Template API client — local-only template list.
 *
 * The real backend's only prompt-related endpoint is the admin-gated
 * PUT /v1/admin/prompts/{name}/{version} (a single-version upsert with no
 * list/get/delete). There is no way to build a real "manage templates" screen
 * against that without new backend admin endpoints, which are out of scope.
 *
 * This client therefore always operates on local/canned data, independent of
 * NEXT_PUBLIC_USE_MOCK — the screen stays usable (add/remove/set-default via
 * the local-shadow-state pattern in usePromptTemplates), just not persisted.
 *
 * createPromptTemplate returns a new object with a random UUID so optimistic
 * UI works immediately. setDefaultPromptTemplate and deletePromptTemplate are
 * no-ops since there is nothing to persist to.
 */

import type { PromptTemplate } from "@/features/prompt-template/types";

// ─── Mock data — delete this block when backend is connected ──────────────────

export const MOCK_TEMPLATES: PromptTemplate[] = [
  {
    id: "1",
    name: "prompt_1",
    content:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis moac mi nisl, eu tempor urna. Curabitur vel bibendum lorem. Morbi convallis convallis diam sit amet lacinia. Aliquam in elementum.",
    isDefault: true,
    usedInCampaigns: 14,
    editedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    name: "analysis_v2",
    content:
      "Analyse the provided pricing documents and extract the line item costs, volume discounts, and service level agreements. Ensure all currency values are normalized to USD. Flag any inconsistencies in year-over-year pricing.",
    isDefault: false,
    usedInCampaigns: 8,
    editedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "3",
    name: "extraction_v3",
    content:
      "Analyse the provided pricing documents and extract the line item costs, volume discounts, and service level agreements. Ensure all currency values are normalized to USD. Flag any inconsistencies in year-over-year pricing.",
    isDefault: false,
    usedInCampaigns: 8,
    editedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
];

// ─── API functions ────────────────────────────────────────────────────────────

export async function getPromptTemplates(): Promise<PromptTemplate[]> {
  return MOCK_TEMPLATES;
}

export async function createPromptTemplate(name: string, content: string): Promise<PromptTemplate> {
  return {
    id: crypto.randomUUID(),
    name,
    content,
    isDefault: false,
    usedInCampaigns: 0,
    editedAt: new Date(),
  };
}

export async function deletePromptTemplate(_id: string): Promise<void> {
  return;
}

export async function setDefaultPromptTemplate(_id: string): Promise<void> {
  return;
}
