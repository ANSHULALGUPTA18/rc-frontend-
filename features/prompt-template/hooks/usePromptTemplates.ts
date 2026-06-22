"use client";

/**
 * usePromptTemplates — manages the prompt template list with optimistic local mutations.
 *
 * Pattern:
 *   - useQuery fetches the authoritative list from the API (mock or real).
 *   - A local shadow copy (`local`) is kept in useState so that add/remove/setDefault
 *     feel instant in the UI without waiting for a re-fetch.
 *   - When the backend is connected, replace the local state mutations with
 *     useMutation + queryClient.invalidateQueries so the server becomes the
 *     single source of truth.
 */

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPromptTemplates,
  createPromptTemplate,
  deletePromptTemplate,
  setDefaultPromptTemplate,
} from "@/features/prompt-template/api/client";
import type { PromptTemplate } from "@/features/prompt-template/types";

interface UsePromptTemplatesResult {
  templates: PromptTemplate[];
  isLoading: boolean;
  error: Error | null;
  add: (name: string, content: string) => Promise<void>;
  setDefault: (id: string) => void;
  remove: (id: string) => void;
}

export function usePromptTemplates(): UsePromptTemplatesResult {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["prompt-templates"],
    queryFn: getPromptTemplates,
  });

  // Local shadow for optimistic mutations — replaced by real mutations when backend is wired
  const [local, setLocal] = useState<PromptTemplate[]>([]);

  useEffect(() => {
    if (data) setLocal(data);
  }, [data]);

  const add = useCallback(
    async (name: string, content: string) => {
      const created = await createPromptTemplate(name, content);
      setLocal((prev) => [...prev, created]);
      await queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
    },
    [queryClient],
  );

  const setDefault = useCallback((id: string) => {
    setLocal((prev) => prev.map((t) => ({ ...t, isDefault: t.id === id })));
    void setDefaultPromptTemplate(id);
  }, []);

  const remove = useCallback((id: string) => {
    setLocal((prev) => prev.filter((t) => t.id !== id));
    void deletePromptTemplate(id);
  }, []);

  return {
    templates: local,
    isLoading,
    error: error as Error | null,
    add,
    setDefault,
    remove,
  };
}
