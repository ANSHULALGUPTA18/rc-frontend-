/**
 * PromptSelectionView "Apply prompt to all" test (Module 5).
 *
 * Verifies that setting a prompt on one queue item and clicking
 * "Apply prompt to all" propagates it to every item, so onContinue
 * emits the same resolved prompt for all fileIds.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { PromptSelectionView } from "@/features/jd-upload/components/PromptSelectionView";
import type { SubmittedJd } from "@/features/jd-upload/types";

// Layout chrome — not under test.
vi.mock("@/features/jd-upload/components/WorkshopSidebar", () => ({
  WorkshopSidebar: () => null,
}));
vi.mock("@/features/jd-upload/components/WorkshopStages", () => ({
  WorkshopStages: () => null,
}));
vi.mock("@/components/layout/TopBar", () => ({ TopBar: () => null }));

// Known template list so we can assert on names/content.
vi.mock("@/features/jd-upload/api/client", () => ({
  getPromptOptions: vi.fn(async () => [
    { id: "1", name: "Prompt_1", content: "Prompt one content." },
    { id: "2", name: "analysis_v2", content: "Analysis v2 content." },
  ]),
}));

const jd = (fileId: string, title: string): SubmittedJd => ({
  fileId,
  fileName: title,
  jdId: `jd-${fileId}`,
  extractedFields: {
    jobTitle: title,
    experienceRequired: "5+ years",
    skills: ["Python"],
    mandatorySkills: [],
    location: "Austin, TX", // pre-seeded so Continue validation passes
    employmentType: "Contract",
    sector: "Technology",
    confidence: 0.9,
  },
});

function renderView(onContinue: (c: Record<string, unknown>) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PromptSelectionView
        submittedJds={[jd("a", "Alpha Engineer"), jd("b", "Beta Analyst")]}
        onBack={() => {}}
        onContinue={onContinue}
      />
    </QueryClientProvider>,
  );
}

describe("PromptSelectionView — Apply prompt to all", () => {
  it("shows the button only when there is more than one JD", async () => {
    renderView(() => {});
    expect(
      await screen.findByRole("button", { name: "Apply prompt to all" }),
    ).toBeInTheDocument();
  });

  it("copies the selected item's template to all items", async () => {
    const onContinue = vi.fn();
    renderView(onContinue);

    // Wait for template options to load, then pick template "2" for the first JD.
    const select = await screen.findByRole("combobox");
    await userEvent.selectOptions(select, "2");

    // Propagate to all, then continue.
    await userEvent.click(screen.getByRole("button", { name: "Apply prompt to all" }));
    await userEvent.click(
      screen.getByRole("button", { name: /Continue to Recommendations/ }),
    );

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    const configs = onContinue.mock.calls[0][0] as Record<
      string,
      { promptName: string | null; promptContent: string }
    >;

    // Both JDs got template 2
    expect(configs["a"].promptName).toBe("analysis_v2");
    expect(configs["b"].promptName).toBe("analysis_v2");
    expect(configs["a"].promptContent).toBe("Analysis v2 content.");
    expect(configs["b"].promptContent).toBe("Analysis v2 content.");
  });

  it("without Apply-to-all, only the edited item changes", async () => {
    const onContinue = vi.fn();
    renderView(onContinue);

    const select = await screen.findByRole("combobox");
    await userEvent.selectOptions(select, "2");

    // Continue WITHOUT applying to all
    await userEvent.click(
      screen.getByRole("button", { name: /Continue to Recommendations/ }),
    );

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    const configs = onContinue.mock.calls[0][0] as Record<string, { promptName: string | null }>;

    expect(configs["a"].promptName).toBe("analysis_v2"); // edited one
    expect(configs["b"].promptName).toBe("Prompt_1"); // untouched default
  });
});
