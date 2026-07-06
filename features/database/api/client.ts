/**
 * Database viewer API client — read-only browse of stored backend data.
 *
 * listTables()   -> GET /v1/admin/database/tables
 * browseTable()  -> GET /v1/admin/database/tables/{table}
 *
 * Admin-only on the backend (require_permission "admin:users"), tenant-scoped
 * via RLS. Powers the "Database" page.
 */

import { apiFetch } from "@/lib/api/client";
import type { MsalTokenContext } from "@/lib/auth/token-storage";

export interface DbTableInfo {
  table: string;
  rowCount: number;
}

export interface DbBrowseResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listTables(msal?: MsalTokenContext): Promise<DbTableInfo[]> {
  const res = await apiFetch<{ tables: { table: string; row_count: number }[] }>(
    "/v1/admin/database/tables",
    { msal },
  );
  return res.tables.map((t) => ({ table: t.table, rowCount: t.row_count }));
}

export async function browseTable(
  table: string,
  page: number,
  pageSize: number,
  search: string | null,
  msal?: MsalTokenContext,
): Promise<DbBrowseResult> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search) params.set("search", search);

  const res = await apiFetch<{
    columns: string[];
    rows: Record<string, unknown>[];
    total: number;
    page: number;
    page_size: number;
  }>(`/v1/admin/database/tables/${table}?${params.toString()}`, { msal });

  return {
    columns: res.columns,
    rows: res.rows,
    total: res.total,
    page: res.page,
    pageSize: res.page_size,
  };
}
