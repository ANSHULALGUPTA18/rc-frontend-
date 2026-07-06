"use client";

/**
 * JdWorkshopFlow — top-level orchestrator for the pricing workflow.
 *
 * Single-file path:
 *   upload → smart-upload → [position-review?] → extraction
 *          → prompt-selection → recommendations
 *
 * Multi-file batch path (up to 20 files):
 *   upload → per-PDF pipeline run through a 5-wide worker pool:
 *              smart-upload (auto-routes text/vision) → confirm-positions
 *              (that PDF only) → JD records
 *          → extraction (all positions from all PDFs) → prompt-selection
 *          → recommendations
 *   Each PDF is an independent unit — one failing does not stop the others.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JdUploadView } from "@/features/jd-upload/components/JdUploadView";
import { ExtractionView } from "@/features/jd-upload/components/ExtractionView";
import { PromptSelectionView } from "@/features/jd-upload/components/PromptSelectionView";
import { RecommendationsView } from "@/features/jd-upload/components/RecommendationsView";
import { PositionReviewView } from "@/features/jd-upload/components/PositionReviewView";
import { runPool } from "@/features/jd-upload/lib/workerPool";
import {
  confirmPositions,
  preflight,
  smartUpload,
  submitJd,
} from "@/features/jd-upload/api/client";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import type {
  ConfirmPositionItem,
  FileExtractionProgress,
  ResolvedPromptConfig,
  SelectedJdFile,
  SmartUploadResponse,
  SubmittedJd,
} from "@/features/jd-upload/types";

/** Max PDFs processed concurrently during batch extraction (sliding window). */
const MAX_CONCURRENT_EXTRACTIONS = 5;

type Stage =
  | "upload"
  | "submitting"
  | "position-review"
  | "extraction"
  | "prompt-selection"
  | "recommendations";

export function JdWorkshopFlow(): React.ReactElement {
  const router = useRouter();
  const msal = useMsalTokenContext();

  const [stage, setStage] = useState<Stage>("upload");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedJds, setSubmittedJds] = useState<SubmittedJd[]>([]);
  const [files, setFiles] = useState<SelectedJdFile[]>([]);
  const [promptConfigs, setPromptConfigs] = useState<Record<string, ResolvedPromptConfig>>({});
  const [extracting, setExtracting] = useState(false);

  // Holds the smart-upload result while the recruiter is on position-review
  const [smartResult, setSmartResult] = useState<SmartUploadResponse | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Live per-PDF status during batch extraction (drives the progress UI + retry).
  const [fileProgress, setFileProgress] = useState<FileExtractionProgress[]>([]);

  const _patchProgress = (fileId: string, patch: Partial<FileExtractionProgress>): void =>
    setFileProgress((prev) =>
      prev.map((p) => (p.fileId === fileId ? { ...p, ...patch } : p)),
    );

  const _errMsg = (e: unknown): string =>
    e instanceof Error && e.message ? e.message : "Extraction failed.";


  // ── Single-file path: smart-upload → position-review or direct confirm ──────

  const handleUploadContinue = async (selectedFiles: SelectedJdFile[]): Promise<void> => {
    setFiles(selectedFiles);
    setSubmitError(null);
    setUploadLoading(true);

    try {
      if (selectedFiles.length === 1) {
        const entry = selectedFiles[0];
        const isPdf = entry.file.name.toLowerCase().endsWith(".pdf");

        // Pre-flight: fast backend check (no AI) to detect image/scanned PDFs.
        // Only runs for PDFs — other formats are always text-only.
        if (isPdf) {
          try {
            const result = await preflight(entry.file, msal);
            if (result.needsVision) {
              setUploadLoading(false);
              setStage("extraction");
              setExtracting(true);
              await _runSmartUpload(entry, entry.file.name);
              return;
            }
          } catch {
            // Preflight failed — fall through to normal smart-upload.
          }
        }

        // Normal path: smart-upload (text PDF, DOCX, TXT, or preflight said no vision needed)
        await _runSmartUpload(entry, selectedFiles[0].file.name);
      } else {
        // Multiple files — per-PDF pipeline through a 5-wide worker pool
        await _runPooledExtraction(selectedFiles);
      }
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Shared single-file smart-upload ──────────────────────────────────────

  const _runSmartUpload = async (
    entry: SelectedJdFile,
    sourceFilename: string,
  ): Promise<void> => {
    try {
      const result = await smartUpload(entry.file, msal);

      if (result.positions.length > 1) {
        setSmartResult(result);
        setStage("position-review");
        return;
      }

      // Single position — skip review, confirm and show extraction
      await _confirmAndProceed(
        result.positions.map((p) => ({
          tempId: p.tempId,
          title: p.title,
          rawText: p.rawText,
          location: p.location,
          sector: p.sector,
          skills: p.skills,
          mandatorySkills: p.mandatorySkills,
          experienceLevel: p.experienceLevel,
          employmentType: p.employmentType,
          detectionSource: p.detectionSource,
        })),
        sourceFilename,
        entry.id,
      );
    } catch {
      // smart-upload failed — fall back to the original single-JD flow
      await _directSubmit([entry]);
    }
  };

  // ── Position-review confirmed ─────────────────────────────────────────────

  const handlePositionConfirm = async (confirmed: ConfirmPositionItem[]): Promise<void> => {
    if (!smartResult) return;
    setConfirmLoading(true);
    setSubmitError(null);

    try {
      await _confirmAndProceed(
        confirmed,
        smartResult.sourceFilename,
      );
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create job descriptions. Please try again.",
      );
      setStage("position-review");
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Shared: confirm-positions → build SubmittedJds → route to next stage ───
  //
  // Normal path  (visionPrompt undefined): shows extraction stage with loader.
  // Vision path  (visionPrompt set):       stays on current screen during the
  //   fast confirm call, then builds promptConfigs from the locked prompt and
  //   jumps straight to recommendations — skipping extraction + prompt-selection.

  const _confirmAndProceed = async (
    items: ConfirmPositionItem[],
    sourceFilename: string,
    singleFileId?: string,
  ): Promise<void> => {
    setStage("extraction");
    setExtracting(true);

    try {
      const results = await confirmPositions(items, msal);

      const jds: SubmittedJd[] = results.map((r, i) => ({
        fileId: items.length === 1 && singleFileId ? singleFileId : crypto.randomUUID(),
        fileName:
          items.length === 1
            ? sourceFilename
            : r.extractedFields.jobTitle ?? items[i].title ?? `Position ${i + 1}`,
        jdId: r.jdId,
        extractedFields: r.extractedFields,
      }));

      setSubmittedJds(jds);
      setExtracting(false);
      // Stay on "extraction" — recruiter clicks Continue to prompt-selection
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create job descriptions. Please try again.",
      );
      setExtracting(false);
      setStage("upload");
    }
  };

  // ── Batch extraction: one independent pipeline per PDF ────────────────────
  //
  // For a single PDF: smart-upload (backend auto-routes text vs GPT-4o Vision)
  // → confirm-positions for ONLY that PDF's positions → returns one SubmittedJd
  // per confirmed position. Kept small so it can run inside the worker pool and
  // be retried on its own.

  const _extractOnePdf = async (entry: SelectedJdFile): Promise<SubmittedJd[]> => {
    const result = await smartUpload(entry.file, msal);

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
          ? r.extractedFields.jobTitle ?? item?.title ?? entry.file.name
          : entry.file.name,
        jdId: r.jdId,
        extractedFields: r.extractedFields,
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

    _patchProgress(fileId, { status: "processing", error: null });
    try {
      const jds = await _extractOnePdf(entry);
      setSubmittedJds((prev) => [...prev, ...jds]);
      _patchProgress(fileId, { status: "completed", positionCount: jds.length });
      setSubmitError(null);
    } catch (e) {
      _patchProgress(fileId, { status: "failed", error: _errMsg(e) });
    }
  };

  // ── Single-file fallback: plain text extraction when smart-upload fails ────

  const _directSubmit = async (selectedFiles: SelectedJdFile[]): Promise<void> => {
    setStage("extraction");
    setExtracting(true);

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
        onContinue={() => setStage("prompt-selection")}
      />
    );
  }

  if (stage === "position-review" && smartResult) {
    return (
      <PositionReviewView
        sourceFilename={smartResult.sourceFilename}
        positions={smartResult.positions}
        loading={confirmLoading}
        onBack={() => {
          setSmartResult(null);
          setStage("upload");
        }}
        onConfirm={(confirmed) => void handlePositionConfirm(confirmed)}
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
