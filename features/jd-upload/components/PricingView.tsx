"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import { getPricingRows } from "@/features/jd-upload/api/client";
import type { PricingRow } from "@/features/jd-upload/api/client";
import type { SelectedJdFile } from "@/features/jd-upload/types";

function formatUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

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

function DownloadIcon(): React.ReactElement {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

interface PricingViewProps {
  files: SelectedJdFile[];
  onSendForApproval?: () => void;
}

export function PricingView({
  files,
  onSendForApproval,
}: PricingViewProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(files[0]?.id ?? "");
  const selected = files.find((f) => f.id === selectedId) ?? files[0];

  const {
    data: rows = [],
    isLoading: rowsLoading,
    error: rowsError,
    refetch,
  } = useQuery({
    queryKey: ["pricing-rows", selectedId],
    queryFn: () => getPricingRows(selectedId),
    enabled: Boolean(selectedId),
  });

  return (
    <AppShell>
      <div className="flex flex-1 flex-col">
        <header className="space-y-6">
          <h1 className="text-3xl font-bold text-ink">Pricing</h1>
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-ink">Stages</h2>
            <WorkshopStages activeStage="pricing" />
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
          </div>

          {/* Pricing panel */}
          {selected && (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col rounded-card border border-line bg-surface shadow-card">
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-line px-6 py-4">
                  <span className="text-base font-bold text-ink">
                    Job Pricing
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sm font-medium text-sidebar-active hover:underline"
                    >
                      <PencilIcon />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg border border-green-600 px-3 py-1.5 text-sm font-semibold text-green-600 hover:bg-green-50"
                    >
                      <DownloadIcon />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Table */}
                {rowsLoading && <LoadingSpinner />}
                {rowsError && (
                  <ErrorState
                    message="Failed to load pricing rows."
                    onRetry={() => void refetch()}
                  />
                )}
                {!rowsLoading && !rowsError && (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                          Exp.(Yrs)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                          ExistingPrice
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-line last:border-0"
                        >
                          <td className="px-6 py-4 font-medium text-ink">
                            {row.position}
                          </td>
                          <td className="px-6 py-4 text-ink-muted">
                            {row.expYrs}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-md bg-sidebar px-3 py-1 text-xs font-semibold text-white">
                              {formatUSD(row.existingPrice)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>
                )}
              </div>

              {/* Send for Approval */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onSendForApproval}
                  className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  Send for Approval
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
