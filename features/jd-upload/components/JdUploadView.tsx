"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { useJdUpload } from "@/features/jd-upload/hooks/useJdUpload";
import {
  ACCEPTED_JD_MIME,
  type SelectedJdFile,
} from "@/features/jd-upload/types";
import { UploadPreviewPanel } from "@/features/jd-upload/components/UploadPreviewPanel";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { AppShell } from "@/components/layout/AppShell";

interface JdUploadViewProps {
  onContinue?: (files: SelectedJdFile[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function DocumentIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 text-sidebar-active"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function JdUploadView({
  onContinue,
}: JdUploadViewProps): React.ReactElement {
  const { files, canContinue, addFiles, removeFile, clear } = useJdUpload();

  return (
    <AppShell>
        <header className="space-y-6">
          <h1 className="text-3xl font-bold text-ink">Pricing</h1>
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-ink">Stages</h2>
            <WorkshopStages activeStage="upload" />
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Multiple Document</CardTitle>
                <CardDescription>
                  Select multiple PDF, DOCX, or TXT files. Our AI will analyze
                  each role independently.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileUpload
                  multiple
                  accept={ACCEPTED_JD_MIME}
                  title="Click or drag & drop multiple files"
                  hint="Supports PDF, DOCX, TXT — Max 10MB each"
                  onFilesSelected={addFiles}
                />

                {files.length > 0 && (
                  <ul className="space-y-2">
                    {files.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-sm"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50">
                          <DocumentIcon />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {entry.file.name}
                          </span>
                          <span className="block text-xs text-ink-subtle">
                            {formatBytes(entry.file.size)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(entry.id)}
                          aria-label={`Remove ${entry.file.name}`}
                          className="shrink-0 rounded-md p-1 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                            className="h-4 w-4"
                          >
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Button
              size="lg"
              disabled={!canContinue}
              onClick={() => onContinue?.(files)}
            >
              Continue
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Button>
          </div>

          <UploadPreviewPanel
            files={files}
            onRemove={removeFile}
            onClear={clear}
          />
        </div>
    </AppShell>
  );
}
