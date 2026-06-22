"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  title: string;
  hint?: string;
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

function CloudUploadIcon(): React.ReactElement {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-brand"
    >
      <path d="M12 13v8" />
      <path d="m8 17 4-4 4 4" />
      <path d="M20 16.5A4.5 4.5 0 0 0 17.5 8h-1.26A7 7 0 1 0 4 14.9" />
    </svg>
  );
}

export function FileUpload({
  accept,
  multiple = false,
  disabled = false,
  title,
  hint,
  onFilesSelected,
  className,
}: FileUploadProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const emit = (fileList: FileList | null): void => {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList));
  };

  const openPicker = (): void => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-describedby={hint ? `${inputId}-hint` : undefined}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) emit(event.dataTransfer.files);
      }}
      className={cn(
        "flex min-h-[16rem] cursor-pointer flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed border-line-strong bg-surface-subtle px-6 py-10 text-center transition-colors",
        "hover:border-brand hover:bg-brand-soft",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        isDragging && "border-brand bg-brand-soft",
        disabled &&
          "cursor-not-allowed opacity-60 hover:border-line-strong hover:bg-surface-subtle",
        className,
      )}
    >
      <CloudUploadIcon />
      <p className="text-base font-bold text-ink">{title}</p>
      {hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          emit(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
