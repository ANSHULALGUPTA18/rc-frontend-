"use client";

export interface StoredPrompt {
  id: string;
  name: string;
  content: string;
}

const STORAGE_KEY = "rc_pricing_prompts";

const DEFAULT_PROMPTS: StoredPrompt[] = [
  {
    id: "1",
    name: "Public Sector Rate",
    content: "Please provide the public sector hourly pay rate of this position.",
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
