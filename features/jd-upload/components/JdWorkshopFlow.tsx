"use client";

/**
 * JdWorkshopFlow — top-level orchestrator for the 3-stage pricing wizard.
 *
 * Stages:  upload → prompt-selection → pricing
 *
 * Holds uploaded File objects in memory and threads them through each stage.
 * File objects cannot be serialised to the URL or localStorage, so stage
 * transitions are managed as in-memory state rather than route navigation.
 *
 * After "Send for Approval" the user is hard-navigated to /dashboard so the
 * wizard state is intentionally discarded.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JdUploadView } from "@/features/jd-upload/components/JdUploadView";
import { PromptSelectionView } from "@/features/jd-upload/components/PromptSelectionView";
import { PricingView } from "@/features/jd-upload/components/PricingView";
import type { SelectedJdFile } from "@/features/jd-upload/types";

type Stage = "upload" | "prompt-selection" | "pricing";

export function JdWorkshopFlow(): React.ReactElement {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("upload");
  const [files, setFiles] = useState<SelectedJdFile[]>([]);

  if (stage === "pricing") {
    return (
      <PricingView
        files={files}
        onSendForApproval={() => router.push("/dashboard")}
      />
    );
  }

  if (stage === "prompt-selection") {
    return (
      <PromptSelectionView
        files={files}
        onBack={() => setStage("upload")}
        onContinue={() => setStage("pricing")}
      />
    );
  }

  return (
    <JdUploadView
      onContinue={(f) => {
        setFiles(f);
        setStage("prompt-selection");
      }}
    />
  );
}
