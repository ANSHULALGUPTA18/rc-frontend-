"use client";

import { useState } from "react";
import { WorkshopSidebar } from "@/features/jd-upload/components/WorkshopSidebar";
import { AddPromptCard } from "@/features/prompt-template/components/AddPromptCard";
import { CreatePromptModal } from "@/features/prompt-template/components/CreatePromptModal";
import { PromptCard } from "@/features/prompt-template/components/PromptCard";
import { usePromptTemplates } from "@/features/prompt-template/hooks/usePromptTemplates";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";

export function PromptTemplateView(): React.ReactElement {
  const { templates, isLoading, error, add, setDefault, remove } = usePromptTemplates();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <WorkshopSidebar />

      <main className="flex-1 px-6 py-8 lg:px-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-ink">Prompt Templates</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Manage and reusable AI instruction sets for high-precision extraction
            and pricing analysis.
          </p>
        </header>

        {isLoading && <LoadingSpinner />}
        {error && <ErrorState message="Failed to load prompt templates." />}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AddPromptCard onClick={() => setModalOpen(true)} />
          {templates.map((template) => (
            <PromptCard
              key={template.id}
              template={template}
              onSetDefault={setDefault}
              onEdit={() => {}}
              onDelete={remove}
            />
          ))}
        </div>
      </main>

      <CreatePromptModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={add}
      />
    </div>
  );
}
