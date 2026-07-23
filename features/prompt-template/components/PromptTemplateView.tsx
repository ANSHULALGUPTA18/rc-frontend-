"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AddPromptCard } from "@/features/prompt-template/components/AddPromptCard";
import { CreatePromptModal } from "@/features/prompt-template/components/CreatePromptModal";
import { PromptCard } from "@/features/prompt-template/components/PromptCard";
import { usePromptTemplates } from "@/features/prompt-template/hooks/usePromptTemplates";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import type { PromptTemplate } from "@/features/prompt-template/types";

export function PromptTemplateView(): React.ReactElement {
  const { templates, isLoading, error, add, update, setDefault, remove } = usePromptTemplates();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

  const openCreateModal = (): void => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const openEditModal = (id: string): void => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setEditingTemplate(template);
    setModalOpen(true);
  };

  const closeModal = (): void => {
    setModalOpen(false);
    setEditingTemplate(null);
  };

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Prompt Templates</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">
          Manage and reusable AI instruction sets for high-precision extraction and pricing
          analysis.
        </p>
      </header>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorState message="Failed to load prompt templates." />}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AddPromptCard onClick={openCreateModal} />
        {templates.map((template) => (
          <PromptCard
            key={template.id}
            template={template}
            onSetDefault={setDefault}
            onEdit={openEditModal}
            onDelete={remove}
          />
        ))}
      </div>

      <CreatePromptModal
        open={modalOpen}
        onClose={closeModal}
        onCreate={add}
        editingTemplate={editingTemplate}
        onUpdate={update}
      />
    </AppShell>
  );
}
