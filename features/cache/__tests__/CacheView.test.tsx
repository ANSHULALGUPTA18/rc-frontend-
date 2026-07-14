/**
 * CacheView tests — cache hit-rate stats + clear action.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CacheView } from "@/features/cache/components/CacheView";
import * as client from "@/features/cache/api/client";

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/auth/useMsalTokenContext", () => ({ useMsalTokenContext: () => ({}) }));
vi.mock("@/features/cache/api/client", () => ({
  getCacheStats: vi.fn(),
  clearCache: vi.fn(),
}));

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CacheView />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(client.getCacheStats).mockResolvedValue({
    extraction: { hits: 6, misses: 4, total: 10, hitRate: 0.6 },
    pricing: { hits: 2, misses: 6, total: 8, hitRate: 0.25 },
  });
});

describe("CacheView", () => {
  it("renders hit-rate stats for extraction and pricing", async () => {
    renderView();
    expect(await screen.findByText("60%")).toBeInTheDocument(); // extraction hit rate
    expect(screen.getByText("25%")).toBeInTheDocument(); // pricing hit rate
    expect(screen.getByText("Extraction cache")).toBeInTheDocument();
    expect(screen.getByText("Pricing cache")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument(); // extraction total
    expect(screen.getByText("8")).toBeInTheDocument(); // pricing total
  });

  it("clears the cache after confirmation", async () => {
    vi.mocked(client.clearCache).mockResolvedValue(5);
    renderView();
    await screen.findByText("60%");

    // Open confirm dialog
    await userEvent.click(screen.getByRole("button", { name: "Clear my cache" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Confirm
    await userEvent.click(screen.getByRole("button", { name: "Clear cache" }));

    await waitFor(() => expect(client.clearCache).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Cleared 5 cached entries/)).toBeInTheDocument();
  });

  it("cancelling does not clear", async () => {
    renderView();
    await screen.findByText("60%");
    await userEvent.click(screen.getByRole("button", { name: "Clear my cache" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(client.clearCache).not.toHaveBeenCalled();
  });
});
