"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils/cn";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import { listTables, browseTable } from "@/features/database/api/client";

const PAGE_SIZE = 50;

/** Render one cell value: primitives inline, objects/arrays as compact JSON. */
function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function DatabaseView(): React.ReactElement {
  const msal = useMsalTokenContext();

  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState<string | null>(null);

  const tablesQuery = useQuery({
    queryKey: ["db-tables"],
    queryFn: () => listTables(msal),
  });

  // Default to the first table with data once tables load.
  const tables = tablesQuery.data ?? [];
  const activeTable =
    selected ?? tables.find((t) => t.rowCount > 0)?.table ?? tables[0]?.table ?? null;

  const browseQuery = useQuery({
    queryKey: ["db-browse", activeTable, page, search],
    queryFn: () => browseTable(activeTable as string, page, PAGE_SIZE, search, msal),
    enabled: Boolean(activeTable),
    placeholderData: keepPreviousData,
  });

  const selectTable = (table: string): void => {
    setSelected(table);
    setPage(1);
    setSearch(null);
    setSearchInput("");
  };

  const submitSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    setSearch(searchInput.trim() || null);
    setPage(1);
  };

  const result = browseQuery.data;
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Database</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Read-only view of the data stored so far — the raw material for the future pricing engine.
        </p>
      </header>

      <div className="flex gap-6">
        {/* Table list */}
        <aside className="w-64 shrink-0">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Tables ({tables.length})
          </span>
          {tablesQuery.isLoading ? (
            <LoadingSpinner />
          ) : tablesQuery.error ? (
            <ErrorState message="Failed to load tables." />
          ) : (
            <ul className="space-y-1">
              {tables.map((t) => {
                const isActive = t.table === activeTable;
                return (
                  <li key={t.table}>
                    <button
                      type="button"
                      onClick={() => selectTable(t.table)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        isActive
                          ? "border-sidebar-active bg-blue-50 font-semibold text-sidebar-active"
                          : "border-line bg-surface text-ink hover:border-sidebar-active/40",
                      )}
                    >
                      <span className="truncate font-mono text-xs">{t.table}</span>
                      <span
                        className={cn(
                          "ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                          t.rowCount > 0
                            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                            : "bg-surface-muted text-ink-subtle",
                        )}
                      >
                        {t.rowCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Table content */}
        <section className="min-w-0 flex-1">
          {!activeTable ? (
            <div className="rounded-card border border-line bg-surface p-8 text-center text-sm text-ink-muted">
              No tables available.
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-mono text-lg font-bold text-ink">{activeTable}</h2>
                  {result && (
                    <p className="text-xs text-ink-muted">
                      {result.total} row{result.total === 1 ? "" : "s"} · {result.columns.length}{" "}
                      columns
                    </p>
                  )}
                </div>
                <form onSubmit={submitSearch} className="flex shrink-0 gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search all columns…"
                    className="w-56 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-sidebar-active px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Search
                  </button>
                </form>
              </div>

              {browseQuery.isLoading ? (
                <LoadingSpinner />
              ) : browseQuery.error ? (
                <ErrorState message="Failed to load rows." />
              ) : result && result.rows.length > 0 ? (
                <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface-subtle">
                        {result.columns.map((col) => (
                          <th
                            key={col}
                            className="whitespace-nowrap px-3 py-2 text-left font-mono text-xs font-semibold text-ink-muted"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-line last:border-0 hover:bg-surface-subtle"
                        >
                          {result.columns.map((col) => {
                            const text = formatCell(row[col]);
                            return (
                              <td
                                key={col}
                                title={text}
                                className="max-w-[280px] truncate px-3 py-2 text-ink"
                              >
                                {text}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-card border border-line bg-surface p-8 text-center text-sm text-ink-muted">
                  {search ? "No rows match your search." : "This table is empty."}
                </div>
              )}

              {/* Pagination */}
              {result && result.total > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-ink-muted">
                    Page {result.page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40 hover:border-sidebar-active/40"
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40 hover:border-sidebar-active/40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
