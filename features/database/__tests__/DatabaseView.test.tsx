/**
 * DatabaseView tests — admin read-only DB browser.
 *
 *  - lists tables with row counts
 *  - loads the default (first non-empty) table's rows into a grid
 *  - clicking another table switches the grid
 *  - search box submits a query
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DatabaseView } from "@/features/database/components/DatabaseView";
import * as client from "@/features/database/api/client";

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/auth/useMsalTokenContext", () => ({
  useMsalTokenContext: () => ({}),
}));
vi.mock("@/features/database/api/client", () => ({
  listTables: vi.fn(),
  browseTable: vi.fn(),
}));

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DatabaseView />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(client.listTables).mockResolvedValue([
    { table: "jds", rowCount: 305 },
    { table: "pricing_recommendations", rowCount: 84 },
    { table: "outcome_events", rowCount: 0 },
  ]);
  vi.mocked(client.browseTable).mockImplementation(async (table) => ({
    columns: ["id", "status"],
    rows: [{ id: `${table}-1`, status: "ok" }],
    total: table === "jds" ? 305 : 84,
    page: 1,
    pageSize: 50,
  }));
});

describe("DatabaseView", () => {
  it("lists tables with their row counts", async () => {
    renderView();
    // "pricing_recommendations" only appears in the list (header shows the active table "jds")
    expect(await screen.findByText("pricing_recommendations")).toBeInTheDocument();
    expect(screen.getAllByText("jds").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("305")).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
  });

  it("loads the first non-empty table into a grid by default", async () => {
    renderView();
    // Default selects "jds" (first with rows) → grid shows its columns + row
    await waitFor(() => expect(screen.getByText("id")).toBeInTheDocument());
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("jds-1")).toBeInTheDocument();
    expect(client.browseTable).toHaveBeenCalledWith("jds", 1, 50, null, expect.anything());
  });

  it("switches tables when another is clicked", async () => {
    renderView();
    await screen.findByText("pricing_recommendations");
    await userEvent.click(screen.getByText("pricing_recommendations"));

    await waitFor(() =>
      expect(client.browseTable).toHaveBeenCalledWith(
        "pricing_recommendations",
        1,
        50,
        null,
        expect.anything(),
      ),
    );
    expect(await screen.findByText("pricing_recommendations-1")).toBeInTheDocument();
  });

  it("submits a search across columns", async () => {
    renderView();
    await screen.findByPlaceholderText("Search all columns…");

    await userEvent.type(screen.getByPlaceholderText("Search all columns…"), "python");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(client.browseTable).toHaveBeenCalledWith("jds", 1, 50, "python", expect.anything()),
    );
  });
});
