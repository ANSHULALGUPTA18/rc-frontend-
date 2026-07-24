"use client";

/**
 * JdWorkshopFlow — top-level orchestrator for the pricing workflow.
 *
 * ONE unified path for every upload (single or multiple, text or scanned):
 *   upload → per-PDF pipeline run through a 5-wide worker pool:
 *              smart-upload (backend auto-routes text vs GPT-4o Vision)
 *              → confirm-positions (that PDF only) → JD records
 *          → extraction (grouped by PDF: one card per file, N positions each)
 *          → prompt-selection → recommendations
 *
 *   Each PDF is an independent unit — one failing does not stop the others,
 *   and a lone PDF behaves identically to a batch (one card, expandable).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JdUploadView } from "@/features/jd-upload/components/JdUploadView";
import { ExtractionView } from "@/features/jd-upload/components/ExtractionView";
import { PromptSelectionView } from "@/features/jd-upload/components/PromptSelectionView";
import { RecommendationsView } from "@/features/jd-upload/components/RecommendationsView";
import { runPool } from "@/features/jd-upload/lib/workerPool";
import { confirmPositions, smartUpload } from "@/features/jd-upload/api/client";
import {
  buildManualConfirmItem,
  deriveContextDefaults,
} from "@/features/jd-upload/lib/manualPosition";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import type {
  ConfirmPositionItem,
  FileExtractionProgress,
  ManualPositionDraft,
  ManualPositionForm,
  ResolvedPromptConfig,
  SelectedJdFile,
  SubmittedJd,
} from "@/features/jd-upload/types";

/** Max PDFs processed concurrently during batch extraction (sliding window). */
const MAX_CONCURRENT_EXTRACTIONS = 5;

type Stage = "upload" | "submitting" | "extraction" | "prompt-selection" | "recommendations";

export function JdWorkshopFlow(): React.ReactElement {
  const router = useRouter();
  const msal = useMsalTokenContext();

  const [stage, setStage] = useState<Stage>("upload");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedJds, setSubmittedJds] = useState<SubmittedJd[]>([]);
  const [files, setFiles] = useState<SelectedJdFile[]>([]);
  const [promptConfigs, setPromptConfigs] = useState<Record<string, ResolvedPromptConfig>>({});
  const [extracting, setExtracting] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Manually-added labor categories (not present in any uploaded JD). Held as
  // drafts on the extraction review page — editable/deletable — and committed
  // via confirm-positions when the recruiter continues to Prompt Selection.
  const [manualDrafts, setManualDrafts] = useState<ManualPositionDraft[]>([]);
  const [committingManual, setCommittingManual] = useState(false);

  // Live per-PDF status during batch extraction (drives the progress UI + retry).
  const [fileProgress, setFileProgress] = useState<FileExtractionProgress[]>([]);

  const _patchProgress = (fileId: string, patch: Partial<FileExtractionProgress>): void =>
    setFileProgress((prev) => prev.map((p) => (p.fileId === fileId ? { ...p, ...patch } : p)));

  const _errMsg = (e: unknown): string =>
    e instanceof Error && e.message ? e.message : "Extraction failed.";

  // ── Upload → unified pooled extraction (every file, text or scanned) ────────

  const handleUploadContinue = async (selectedFiles: SelectedJdFile[]): Promise<void> => {
    setFiles(selectedFiles);
    setSubmitError(null);
    setUploadLoading(true);
    try {
      await _runPooledExtraction(selectedFiles);
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Per-PDF extraction: one independent pipeline per PDF ──────────────────
  //
  // For a single PDF: smart-upload (backend auto-routes text vs GPT-4o Vision)
  // → confirm-positions for ONLY that PDF's positions → returns one SubmittedJd
  // per confirmed position. Kept small so it can run inside the worker pool and
  // be retried on its own.

  const _extractOnePdf = async (entry: SelectedJdFile): Promise<SubmittedJd[]> => {
    const result = await smartUpload(entry.file, msal);
    _patchProgress(entry.id, { cache: result.cache });

    const items: ConfirmPositionItem[] = result.positions.map((p) => ({
      tempId: p.tempId,
      title: p.title,
      rawText: p.rawText,
      location: p.location,
      sector: p.sector,
      skills: p.skills,
      mandatorySkills: p.mandatorySkills,
      experienceLevel: p.experienceLevel,
      employmentType: p.employmentType,
      client: p.client,
      detectionSource: p.detectionSource,
    }));

    const confirmed = await confirmPositions(items, msal);
    const multiPosition = confirmed.length > 1;

    // Map by temp_id — confirm-positions may skip positions with empty text,
    // so index alignment is not guaranteed.
    return confirmed.map((r) => {
      const detected = result.positions.find((p) => p.tempId === r.tempId);
      const item = items.find((it) => it.tempId === r.tempId);
      return {
        fileId: crypto.randomUUID(),
        fileName: multiPosition
          ? (r.extractedFields.jobTitle ?? item?.title ?? entry.file.name)
          : entry.file.name,
        jdId: r.jdId,
        extractedFields: r.extractedFields,
        // Client isn't part of extractedFields — keep it from detection so
        // manual labor categories added to this PDF can inherit it.
        client: detected?.client ?? item?.client ?? null,
        sourceFileId: entry.id,
        sourceFileName: entry.file.name,
        detectionSource: detected?.detectionSource,
      };
    });
  };

  const _runPooledExtraction = async (selectedFiles: SelectedJdFile[]): Promise<void> => {
    setStage("extraction");
    setExtracting(true);
    setSubmitError(null);
    setSubmittedJds([]);
    const uploadedAt = new Date().toISOString();
    setFileProgress(
      selectedFiles.map((f) => ({
        fileId: f.id,
        fileName: f.file.name,
        status: "pending",
        positionCount: 0,
        error: null,
        sizeBytes: f.file.size,
        uploadedAt,
        cache: null,
      })),
    );

    const summary = await runPool(
      selectedFiles,
      MAX_CONCURRENT_EXTRACTIONS,
      async (entry) => {
        _patchProgress(entry.id, { status: "processing" });
        return _extractOnePdf(entry);
      },
      // Fires the moment each PDF settles — updates status + accumulates JDs live.
      (outcome) => {
        const entry = outcome.item;
        if (outcome.status === "succeeded") {
          const jds = outcome.result ?? [];
          setSubmittedJds((prev) => [...prev, ...jds]);
          _patchProgress(entry.id, { status: "completed", positionCount: jds.length });
        } else {
          _patchProgress(entry.id, { status: "failed", error: _errMsg(outcome.error) });
        }
      },
    );

    setExtracting(false);

    if (summary.succeeded.length === 0) {
      setSubmitError("All files failed to process. Please try again.");
      setStage("upload");
    }
  };

  // Re-run one failed PDF through the pipeline and merge its JDs in.
  const _retryFile = async (fileId: string): Promise<void> => {
    const entry = files.find((f) => f.id === fileId);
    if (!entry) return;

    _patchProgress(fileId, { status: "processing", error: null, cache: null });
    try {
      const jds = await _extractOnePdf(entry);
      setSubmittedJds((prev) => [...prev, ...jds]);
      _patchProgress(fileId, { status: "completed", positionCount: jds.length });
      setSubmitError(null);
    } catch (e) {
      _patchProgress(fileId, { status: "failed", error: _errMsg(e) });
    }
  };

  // ── Manual labor categories ───────────────────────────────────────────────
  //
  // Extracted positions drive the inherited client/contract context. Drafts are
  // committed (one confirm-positions call, source="manual") only when the
  // recruiter continues, so add/edit/delete before that are pure client state.

  const extractedJds = submittedJds.filter((jd) => !jd.isManual);

  /** Extracted positions belonging to one source PDF. */
  const _positionsOfPdf = (fileId: string): SubmittedJd[] =>
    extractedJds.filter((jd) => (jd.sourceFileId ?? jd.fileId) === fileId);

  /** Client/contract context for a PDF — derived from ITS positions only. */
  const _contextOfPdf = (
    fileId: string,
  ): { location: string | null; sector: string | null; client: string | null } =>
    deriveContextDefaults(_positionsOfPdf(fileId));

  const _saveManual = (
    draftId: string | null,
    form: ManualPositionForm,
    sourceFileId: string,
  ): void => {
    setManualDrafts((prev) =>
      draftId
        ? prev.map((d) => (d.draftId === draftId ? { ...d, form } : d))
        : [...prev, { draftId: crypto.randomUUID(), sourceFileId, form }],
    );
  };

  const _deleteManual = (draftId: string): void =>
    setManualDrafts((prev) => prev.filter((d) => d.draftId !== draftId));

  // Commit manual drafts, then advance to prompt selection. Each draft inherits
  // ONLY its own PDF's context and is tagged with that PDF so it groups with it.
  // Re-committing (after a Back) replaces the prior manual positions so the
  // queue never accumulates duplicates.
  const _continueFromExtraction = async (): Promise<void> => {
    if (manualDrafts.length === 0) {
      setStage("prompt-selection");
      return;
    }

    setCommittingManual(true);
    setSubmitError(null);
    try {
      const items: ConfirmPositionItem[] = manualDrafts.map((d) =>
        buildManualConfirmItem(d.draftId, d.form, _contextOfPdf(d.sourceFileId)),
      );
      const confirmed = await confirmPositions(items, msal);

      const manualJds: SubmittedJd[] = confirmed.map((r) => {
        const draft = manualDrafts.find((d) => d.draftId === r.tempId);
        const srcId = draft?.sourceFileId ?? "manual-added";
        const srcName =
          fileProgress.find((f) => f.fileId === srcId)?.fileName ??
          extractedJds.find((j) => (j.sourceFileId ?? j.fileId) === srcId)?.sourceFileName ??
          "Manually Added";
        return {
          fileId: crypto.randomUUID(),
          fileName: r.extractedFields.jobTitle ?? draft?.form.laborCategory ?? "Manual position",
          jdId: r.jdId,
          extractedFields: r.extractedFields,
          sourceFileId: srcId,
          sourceFileName: srcName,
          isManual: true,
        };
      });

      // Drop any previously-committed manual positions, then add the fresh set.
      setSubmittedJds((prev) => [...prev.filter((jd) => !jd.isManual), ...manualJds]);
      setStage("prompt-selection");
    } catch (e) {
      setSubmitError(_errMsg(e));
    } finally {
      setCommittingManual(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (stage === "recommendations") {
    return (
      <RecommendationsView
        submittedJds={submittedJds}
        promptConfigs={promptConfigs}
        onDone={() => router.push("/dashboard")}
        onBack={() => setStage("prompt-selection")}
      />
    );
  }

  if (stage === "prompt-selection") {
    return (
      <PromptSelectionView
        submittedJds={submittedJds}
        initialConfigs={Object.keys(promptConfigs).length > 0 ? promptConfigs : undefined}
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
        fileProgress={fileProgress}
        onRetryFile={(id) => void _retryFile(id)}
        onBack={() => {
          if (!extracting) setStage("upload");
        }}
        onContinue={() => void _continueFromExtraction()}
        manualDrafts={manualDrafts}
        onSaveManual={_saveManual}
        onDeleteManual={_deleteManual}
        onDeletePosition={(fileId) =>
          setSubmittedJds((prev) => prev.filter((jd) => jd.fileId !== fileId))
        }
        committing={committingManual}
      />
    );
  }

  // stage === "upload" (or "submitting" fallback)
  return (
    <>
      {submitError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}
      <JdUploadView onContinue={(f) => void handleUploadContinue(f)} loading={uploadLoading} />
    </>
  );
}
