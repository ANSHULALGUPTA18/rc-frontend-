/**
 * PromptTemplateView — Edit flow.
 *
 * The "Edit" menu item on a prompt card previously called an empty no-op
 * (onEdit={() => {}}), so nothing happened when a recruiter tried to edit
 * an existing template. This tests the fix: Edit opens the modal
 * pre-filled with the template's current name/content, and saving
 * persists the change via updatePrompt() in the underlying store.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromptTemplateView } from "@/features/prompt-template/components/PromptTemplateView";

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PromptTemplateView />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("PromptTemplateView — Edit", () => {
  it("opens the modal pre-filled with the existing template's name and content", async () => {
    renderView();
    await waitFor(() => expect(screen.getByText("Public Sector Rate")).toBeInTheDocument());

    await userEvent.click(screen.getAllByLabelText("More options")[0]);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByText("Edit Prompt")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Public Sector Rate")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        "Please provide the public sector hourly pay rate of this position.",
      ),
    ).toBeInTheDocument();
  });

  it("saves the edited name and content and reflects them in the card", async () => {
    renderView();
    await waitFor(() => expect(screen.getByText("Public Sector Rate")).toBeInTheDocument());

    await userEvent.click(screen.getAllByLabelText("More options")[0]);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    const nameInput = screen.getByDisplayValue("Public Sector Rate");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Rate Prompt");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(screen.getByText("Updated Rate Prompt")).toBeInTheDocument());
    expect(screen.queryByText("Public Sector Rate")).not.toBeInTheDocument();
  });

  it("does not affect other templates when one is edited", async () => {
    renderView();
    await waitFor(() => expect(screen.getByText("Market Rate Analysis")).toBeInTheDocument());

    await userEvent.click(screen.getAllByLabelText("More options")[0]);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(screen.getByText("Market Rate Analysis")).toBeInTheDocument());
  });
});
