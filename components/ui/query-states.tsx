export function LoadingSpinner(): React.ReactElement {
  return (
    <div className="flex h-48 items-center justify-center">
      <svg
        className="h-8 w-8 animate-spin text-brand"
        viewBox="0 0 24 24"
        fill="none"
        aria-label="Loading"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: ErrorStateProps): React.ReactElement {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-medium text-ink-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
        >
          Retry
        </button>
      )}
    </div>
  );
}
