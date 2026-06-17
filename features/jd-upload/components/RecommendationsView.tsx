"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { RecommendationCard } from "@/features/jd-upload/components/RecommendationCard";
import type { ResolvedPromptConfig, SubmittedJd } from "@/features/jd-upload/types";

interface RecommendationsViewProps {
  submittedJds: SubmittedJd[];
  /** Prompt configs resolved at Prompt Selection stage, keyed by fileId. */
  promptConfigs: Record<string, ResolvedPromptConfig>;
  onDone: () => void;
}

export function RecommendationsView({
  submittedJds,
  promptConfigs,
  onDone,
}: RecommendationsViewProps): React.ReactElement {
  useEffect(() => {
    submittedJds.forEach((jd) => {
      const config = promptConfigs[jd.fileId];
      console.log(`[RecommendationsView] JD ${jd.jdId} (${jd.fileName}) prompt config:`, config);
    });
  }, [submittedJds, promptConfigs]);
  return (
    <AppShell>
      <header className="space-y-6">
        <h1 className="text-3xl font-bold text-ink">Pricing</h1>
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Stages</h2>
          <WorkshopStages activeStage="recommendations" />
        </div>
      </header>

      <div className="mt-6 space-y-4">
        {submittedJds.map((jd) => (
          <RecommendationCard
            key={jd.jdId}
            jdId={jd.jdId}
            fileName={jd.fileName}
            promptConfig={promptConfigs[jd.fileId]}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={onDone}>
          Done — Go to Dashboard
        </Button>
      </div>
    </AppShell>
  );
}
