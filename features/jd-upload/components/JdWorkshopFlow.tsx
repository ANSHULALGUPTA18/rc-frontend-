"use client";

/**
 * JdWorkshopFlow — top-level orchestrator for the pricing workflow.
 *
 * Stages:  upload → extraction → prompt-selection → recommendations
 *
 * Flow:
 *   1. upload:          User selects files, clicks Continue.
 *   2. (submitting):    Files are uploaded to POST /v1/jds (multipart).
 *                       Backend extracts text + JD fields synchronously.
 *   3. extraction:      User reviews extracted fields, clicks Continue.
 *   4. prompt-selection: User picks/previews AI prompt, clicks Continue.
 *   5. recommendations: Polls pricing pipeline for each JD until terminal.
 *
 * After "Done" the user is navigated to /dashboard.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { JdUploadView } from "@/features/jd-upload/components/JdUploadView";
import { ExtractionView } from "@/features/jd-upload/components/ExtractionView";
import { PromptSelectionView } from "@/features/jd-upload/components/PromptSelectionView";
import { RecommendationsView } from "@/features/jd-upload/components/RecommendationsView";
import { submitJd } from "@/features/jd-upload/api/client";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import type { ResolvedPromptConfig, SelectedJdFile, SubmittedJd } from "@/features/jd-upload/types";

type Stage = "upload" | "submitting" | "extraction" | "prompt-selection" | "recommendations";

export function JdWorkshopFlow(): React.ReactElement {
  const router = useRouter();
  const msal = useMsalTokenContext();

  const [stage, setStage] = useState<Stage>("upload");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedJds, setSubmittedJds] = useState<SubmittedJd[]>([]);
  // Keep files around so PromptSelectionView can display filenames
  const [files, setFiles] = useState<SelectedJdFile[]>([]);
  // Prompt configs resolved at the Prompt Selection stage (keyed by fileId)
  const [promptConfigs, setPromptConfigs] = useState<Record<string, ResolvedPromptConfig>>({});

  const [extracting, setExtracting] = useState(false);

  const handleUploadContinue = async (selectedFiles: SelectedJdFile[]): Promise<void> => {
    setFiles(selectedFiles);
    setStage("extraction");
    setExtracting(true);
    setSubmitError(null);

    try {
      const results = await Promise.all(
        selectedFiles.map(async (entry): Promise<SubmittedJd> => {
          const result = await submitJd(entry.file, msal);
          return {
            fileId: entry.id,
            fileName: entry.file.name,
            jdId: result.jdId,
            extractedFields: result.extractedFields,
          };
        }),
      );
      setSubmittedJds(results);
      setExtracting(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to upload job descriptions. Please try again.",
      );
      setExtracting(false);
      setStage("upload");
    }
  };

  if (stage === "recommendations") {
    return (
      <RecommendationsView
        submittedJds={submittedJds}
        promptConfigs={promptConfigs}
        onDone={() => router.push("/dashboard")}
      />
    );
  }

  if (stage === "prompt-selection") {
    return (
      <PromptSelectionView
        files={files}
        submittedJds={submittedJds}
        onBack={() => setStage("extraction")}
        onContinue={(configs) => {
          setPromptConfigs(configs);
          setStage("recommendations");
        }}
      />
    );
  }

  if (stage === "extraction") {
    return (
      <ExtractionView
        submittedJds={submittedJds}
        loading={extracting}
        fileNames={files.map((f) => f.file.name)}
        onBack={() => { if (!extracting) setStage("upload"); }}
        onContinue={() => setStage("prompt-selection")}
      />
    );
  }

  // stage === "upload"
  return (
    <>
      {submitError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}
      <JdUploadView
        onContinue={(f) => void handleUploadContinue(f)}
      />
    </>
  );
}
