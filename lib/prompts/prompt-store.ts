"use client";

export interface StoredPrompt {
  id: string;
  name: string;
  content: string;
}

// Versioned: prompts are cached in localStorage, so a browser that has ever
// opened Prompt Selection keeps its copy forever and never sees an updated
// default. Bumping the key retires the stale copy — without this, changing
// DEFAULT_PROMPTS has no effect for any existing user.
const STORAGE_KEY = "rc_pricing_prompts_v2";

/**
 * The default pricing instruction, shared with the mock prompt options so the
 * two cannot drift apart.
 *
 * The previous default — "Please provide the public sector hourly pay rate of
 * this position" — anchored on government EMPLOYEE pay scales, the opposite of
 * what the contractor engine estimates. It pulled salary evidence instead of
 * contractor evidence and under-priced every role, so recruiters retyped around
 * it on every run. This wording produced the best measured run.
 */
export const CONTRACT_STAFFING_PAY_PROMPT = `Provide the competitive hourly PAY RATE for a temporary/contract staffing worker performing this role.

The recommendation should represent what a staffing agency would pay the worker, not what the agency bills the client.

Focus on market pay for:
• W2 contract employees
• 1099 independent contractors
• C2C contractors (where applicable)

Research comparable staffing positions at the same kind of employer, historical staffing contracts for that employer where available, and current staffing market data for the location.

Recommend the rate that would realistically attract qualified candidates while remaining competitive for a staffing proposal.

Do NOT calculate:
• Bill Rate
• Agency Markup
• Overtime
• Burden
• Fees

Return only the recommended hourly PAY RATE.`;

const DEFAULT_PROMPTS: StoredPrompt[] = [
  {
    id: "1",
    name: "Contract Staffing Pay Rate",
    content: CONTRACT_STAFFING_PAY_PROMPT,
  },
  {
    id: "2",
    name: "Market Rate Analysis",
    content:
      "Analyse the market rate for this role based on skills, experience, location, and industry sector. Provide competitive hourly pay and bill rates.",
  },
  {
    id: "3",
    name: "Compensation Extraction",
    content:
      "Extract all role-specific compensation data, including base salary bands, bonus structures, and equity components for this position.",
  },
];

function read(): StoredPrompt[] {
  if (typeof window === "undefined") return DEFAULT_PROMPTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROMPTS;
    return JSON.parse(raw) as StoredPrompt[];
  } catch {
    return DEFAULT_PROMPTS;
  }
}

function write(prompts: StoredPrompt[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

export function getPrompts(): StoredPrompt[] {
  return read();
}

export function addPrompt(name: string, content: string): StoredPrompt {
  const prompts = read();
  const newPrompt: StoredPrompt = {
    id: crypto.randomUUID(),
    name,
    content,
  };
  prompts.push(newPrompt);
  write(prompts);
  return newPrompt;
}

export function deletePrompt(id: string): void {
  const prompts = read().filter((p) => p.id !== id);
  write(prompts);
}

export function updatePrompt(id: string, name: string, content: string): void {
  const prompts = read().map((p) => (p.id === id ? { ...p, name, content } : p));
  write(prompts);
}
