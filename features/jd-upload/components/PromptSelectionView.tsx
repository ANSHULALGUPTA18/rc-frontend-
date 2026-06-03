"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import { getPromptOptions } from "@/features/jd-upload/api/client";
import type { PromptTemplateOption } from "@/features/jd-upload/api/client";
import type { SelectedJdFile } from "@/features/jd-upload/types";

const PLACEHOLDER_TEMPLATES: PromptTemplateOption[] = [
  {
    id: "1",
    name: "Prompt_1",
    content:
      "Please provide the public sector hourly pay rate of this position.",
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

type PromptMode = "default" | "custom";

interface FileConfig {
  promptMode: PromptMode;
  promptTemplateId: string;
  customContent: string;
  location: string;
  sector: string;
  previewEditing: boolean;
}

const defaultConfig = (): FileConfig => ({
  promptMode: "default",
  promptTemplateId: "1",
  customContent: "",
  location: "",
  sector: "",
  previewEditing: false,
});

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function DocumentIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 text-sidebar-active"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function PencilIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  );
}

function ChevronDownIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface PromptSelectionViewProps {
  files: SelectedJdFile[];
  onBack: () => void;
  onContinue: () => void;
}

export function PromptSelectionView({
  files,
  onBack,
  onContinue,
}: PromptSelectionViewProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(files[0]?.id ?? "");
  const [configs, setConfigs] = useState<Record<string, FileConfig>>(() =>
    Object.fromEntries(files.map((f) => [f.id, defaultConfig()])),
  );

  const {
    data: promptOptions = PLACEHOLDER_TEMPLATES,
    isLoading: promptsLoading,
    error: promptsError,
  } = useQuery({ queryKey: ["prompt-options"], queryFn: getPromptOptions });

  const patchConfig = (id: string, patch: Partial<FileConfig>): void => {
    setConfigs((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const selected = files.find((f) => f.id === selectedId) ?? files[0];
  const cfg = selected ? (configs[selected.id] ?? defaultConfig()) : null;
  const activeTpl = promptOptions.find(
    (t) => t.id === cfg?.promptTemplateId,
  ) ?? promptOptions[0];

  const previewContent =
    cfg?.promptMode === "custom" ? cfg.customContent : activeTpl.content;

  return (
    <AppShell>
      <div className="flex flex-1 flex-col">
        <header className="space-y-6">
          <h1 className="text-3xl font-bold text-ink">Pricing</h1>
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-ink">Stages</h2>
            <WorkshopStages activeStage="prompt-selection" />
          </div>
        </header>

        <div className="mt-6 flex flex-1 gap-6">
          {/* Queue panel */}
          <div className="flex w-72 shrink-0 flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Queue ({files.length})
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-sidebar-active hover:underline"
              >
                + Add New
              </button>
            </div>

            <ul className="space-y-3">
              {files.map((f) => {
                const isActive = f.id === selectedId;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(f.id)}
                      className={cn(
                        "w-full rounded-card border bg-surface px-4 py-4 text-left shadow-card transition-colors",
                        isActive
                          ? "border-l-4 border-sidebar-active"
                          : "border-line hover:border-sidebar-active/40",
                      )}
                    >
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50">
                          <DocumentIcon />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm font-semibold",
                              isActive ? "text-sidebar-active" : "text-ink",
                            )}
                          >
                            {stripExtension(f.file.name)}
                          </span>
                          <span className="block truncate text-xs text-ink-subtle">
                            {f.file.name}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto pt-4">
              <Button variant="secondary" size="md" onClick={onBack}>
                ← Back
              </Button>
            </div>
          </div>

          {/* Config panel */}
          {selected && cfg ? (
            <div className="flex flex-1 flex-col gap-6">
              <h2 className="text-2xl font-bold text-sidebar">
                {stripExtension(selected.file.name)}
              </h2>

              <div className="rounded-card border border-line bg-surface p-6 shadow-card">
                {/* Header row */}
                <div className="mb-5 flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-ink">
                    AI Analysis Instructions
                  </span>
                  <div className="flex rounded-lg border border-line p-0.5">
                    {(["default", "custom"] as PromptMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          patchConfig(selected.id, { promptMode: mode })
                        }
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                          cfg.promptMode === mode
                            ? "bg-surface-muted text-ink"
                            : "text-ink-subtle hover:text-ink",
                        )}
                      >
                        {mode === "default" ? "Default AI Prompt" : "Custom User Prompt"}
                      </button>
                    ))}
                  </div>
                </div>

                {cfg.promptMode === "default" ? (
                  <div className="space-y-4">
                    {/* Prompt Template dropdown */}
                    {promptsError && <ErrorState message="Failed to load prompt templates." />}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-ink">
                        Prompt Template
                      </label>
                      <div className="relative">
                        <select
                          value={cfg.promptTemplateId}
                          onChange={(e) =>
                            patchConfig(selected.id, {
                              promptTemplateId: e.target.value,
                              previewEditing: false,
                            })
                          }
                          className="w-full appearance-none rounded-lg border border-line bg-surface py-2 pl-3 pr-10 text-sm text-ink focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
                        >
                          {promptOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon />
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-ink">
                          Preview
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            patchConfig(selected.id, {
                              previewEditing: !cfg.previewEditing,
                            })
                          }
                          className="flex items-center gap-1 text-xs font-medium text-sidebar-active hover:underline"
                        >
                          <PencilIcon />
                          Edit
                        </button>
                      </div>
                      <textarea
                        readOnly={!cfg.previewEditing}
                        value={previewContent}
                        rows={4}
                        className={cn(
                          "w-full resize-none rounded-lg border px-3 py-2 text-sm text-ink focus:outline-none",
                          cfg.previewEditing
                            ? "border-sidebar-active bg-surface focus:ring-1 focus:ring-sidebar-active"
                            : "border-line bg-surface-muted",
                        )}
                      />
                      <p className="text-xs text-ink-subtle">
                        Helper: Your instructions will override the standard
                        extraction model for this specific JD.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">
                      Custom Instructions
                    </label>
                    <textarea
                      value={cfg.customContent}
                      onChange={(e) =>
                        patchConfig(selected.id, {
                          customContent: e.target.value,
                        })
                      }
                      rows={6}
                      placeholder="Write your custom AI instructions for this job description..."
                      className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
                    />
                    <p className="text-xs text-ink-subtle">
                      Helper: Your instructions will override the standard
                      extraction model for this specific JD.
                    </p>
                  </div>
                )}

                {/* Location + Sector */}
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">
                      Location
                    </label>
                    <input
                      type="text"
                      value={cfg.location}
                      onChange={(e) =>
                        patchConfig(selected.id, { location: e.target.value })
                      }
                      placeholder="Enter Location Here"
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">
                      Sector
                    </label>
                    <input
                      type="text"
                      value={cfg.sector}
                      onChange={(e) =>
                        patchConfig(selected.id, { sector: e.target.value })
                      }
                      placeholder="Public Sector"
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <Button size="lg" onClick={onContinue}>
                  Continue to Pricing →
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
