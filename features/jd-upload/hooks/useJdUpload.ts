"use client";

/**
 * useJdUpload — manages the list of files selected for upload.
 *
 * Deduplication: a file is considered a duplicate when both name AND size match
 * an already-selected entry. Size is included because two different files can
 * share a filename (e.g. "JD.pdf" from different directories).
 *
 * Files exceeding MAX_JD_FILE_BYTES are silently dropped on add. If you need
 * to surface an error to the user, add a rejected-files return value here.
 */

import { useCallback, useState } from "react";
import {
  MAX_JD_FILE_BYTES,
  type SelectedJdFile,
} from "@/features/jd-upload/types";

const MAX_JD_FILES = 5;

interface UseJdUploadResult {
  files: SelectedJdFile[];
  canContinue: boolean;
  isFull: boolean;
  addFiles: (incoming: File[]) => void;
  removeFile: (id: string) => void;
  clear: () => void;
}

const createId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `jd-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const isDuplicate = (existing: SelectedJdFile[], file: File): boolean =>
  existing.some(
    (entry) => entry.file.name === file.name && entry.file.size === file.size,
  );

export function useJdUpload(): UseJdUploadResult {
  const [files, setFiles] = useState<SelectedJdFile[]>([]);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((current) => {
      const remaining = MAX_JD_FILES - current.length;
      if (remaining <= 0) return current;
      const accepted = incoming
        .filter((file) => file.size <= MAX_JD_FILE_BYTES && !isDuplicate(current, file))
        .slice(0, remaining);
      if (accepted.length === 0) return current;
      return [...current, ...accepted.map((file) => ({ id: createId(), file }))];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const clear = useCallback(() => setFiles([]), []);

  return {
    files,
    canContinue: files.length > 0,
    isFull: files.length >= MAX_JD_FILES,
    addFiles,
    removeFile,
    clear,
  };
}
