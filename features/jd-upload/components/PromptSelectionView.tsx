"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { WorkshopSidebar } from "@/features/jd-upload/components/WorkshopSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import { getPromptOptions } from "@/features/jd-upload/api/client";
import type { PromptTemplateOption } from "@/features/jd-upload/api/client";
import type { ResolvedPromptConfig, SelectedJdFile, SubmittedJd } from "@/features/jd-upload/types";

const PLACEHOLDER_TEMPLATES: PromptTemplateOption[] = [
  { id: "1", name: "Public Sector Rate", content: "Please provide the public sector hourly pay rate of this position." },
  { id: "2", name: "Market Rate Analysis", content: "Analyse the market rate for this role based on skills, experience, location, and industry sector." },
  { id: "3", name: "Compensation Extraction", content: "Extract all role-specific compensation data for this position." },
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
  submittedJds?: SubmittedJd[];
  onBack: () => void;
  /** Called with a config entry per fileId when the recruiter clicks Continue. */
  onContinue: (configs: Record<string, ResolvedPromptConfig>) => void;
}

export function PromptSelectionView({
  files,
  submittedJds = [],
  onBack,
  onContinue,
}: PromptSelectionViewProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(files[0]?.id ?? "");

  // Build a lookup: fileId → extracted fields
  const extractedByFileId = Object.fromEntries(
    submittedJds.map((jd) => [jd.fileId, jd.extractedFields]),
  );

  const [configs, setConfigs] = useState<Record<string, FileConfig>>(() =>
    Object.fromEntries(
      files.map((f) => {
        const extracted = extractedByFileId[f.id];
        return [
          f.id,
          {
            ...defaultConfig(),
            location: extracted?.location ?? "",
            sector: extracted?.sector ?? "",
          },
        ];
      }),
    ),
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
    <div className="flex h-screen overflow-hidden bg-surface-subtle">
      <WorkshopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        {/* Fixed header */}
        <div className="shrink-0 px-6 pt-8 pb-4 lg:px-10">
          <h1 className="text-3xl font-bold text-ink">Pricing</h1>
          <div className="mt-4 space-y-3">
            <h2 className="text-lg font-bold text-ink">Stages</h2>
            <WorkshopStages activeStage="prompt-selection" />
          </div>
        </div>

        {/* Content area — no page scroll */}
        <div className="flex min-h-0 flex-1 gap-6 px-6 pb-10 lg:px-10">
          {/* Queue panel — compact */}
          <div className="flex w-72 shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Queue ({files.length})
              </span>
            </div>

            <ul className="flex-1 min-h-0 overflow-y-auto space-y-2">
              {files.map((f) => {
                const isActive = f.id === selectedId;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(f.id)}
                      className={cn(
                        "w-full rounded-lg border bg-surface px-3 py-3 text-left transition-colors",
                        isActive
                          ? "border-l-4 border-sidebar-active"
                          : "border-line hover:border-sidebar-active/40",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50">
                          <DocumentIcon />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-sm font-semibold",
                              isActive ? "text-sidebar-active" : "text-ink",
                            )}
                          >
                            {stripExtension(f.file.name)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="shrink-0 pt-3">
              <Button variant="secondary" size="md" onClick={onBack}>
                ← Back
              </Button>
            </div>
          </div>

          {/* Config panel */}
          {selected && cfg ? (
            <div className="flex flex-1 flex-col gap-4 min-h-0">
              <h2 className="text-2xl font-bold text-sidebar">
                {stripExtension(selected.file.name)}
              </h2>

              <div className="flex-1 min-h-0 overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-card">
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
                    {promptsLoading && <LoadingSpinner />}
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

                {/* Location + Sector (mandatory) */}
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cfg.location}
                      onChange={(e) =>
                        patchConfig(selected.id, { location: e.target.value })
                      }
                      placeholder="Enter Location Here"
                      className={cn(
                        "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1",
                        !cfg.location.trim()
                          ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                          : "border-line focus:border-sidebar-active focus:ring-sidebar-active",
                      )}
                    />
                    {!cfg.location.trim() && (
                      <p className="text-xs text-red-500">Location is required</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">
                      Sector <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cfg.sector}
                      onChange={(e) =>
                        patchConfig(selected.id, { sector: e.target.value })
                      }
                      placeholder="e.g. Healthcare, Finance, Technology"
                      className={cn(
                        "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1",
                        !cfg.sector.trim()
                          ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                          : "border-line focus:border-sidebar-active focus:ring-sidebar-active",
                      )}
                    />
                    {!cfg.sector.trim() && (
                      <p className="text-xs text-red-500">Sector is required</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 pt-2">
                <Button
                  size="lg"
                  onClick={() => {
                    // Validate all files have location + sector
                    const missing: string[] = [];
                    for (const f of files) {
                      const c = configs[f.id] ?? defaultConfig();
                      if (!c.location.trim()) missing.push(`${stripExtension(f.file.name)}: Location`);
                      if (!c.sector.trim()) missing.push(`${stripExtension(f.file.name)}: Sector`);
                    }
                    if (missing.length > 0) {
                      alert(`Please fill in the required fields:\n\n${missing.join("\n")}`);
                      return;
                    }

                    const resolved: Record<string, ResolvedPromptConfig> = {};
                    for (const f of files) {
                      const cfg = configs[f.id] ?? defaultConfig();
                      const tpl = promptOptions.find((t) => t.id === cfg.promptTemplateId) ?? promptOptions[0];
                      resolved[f.id] = {
                        promptTemplateId: cfg.promptMode === "default" ? cfg.promptTemplateId : null,
                        promptContent: cfg.promptMode === "custom" ? cfg.customContent : (tpl?.content ?? ""),
                        locationOverride: cfg.location.trim() || null,
                        sectorOverride: cfg.sector.trim() || null,
                      };
                    }
                    onContinue(resolved);
                  }}
                >
                  Continue to Recommendations →
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
