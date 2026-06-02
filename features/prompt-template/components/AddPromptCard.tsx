interface AddPromptCardProps {
  onClick?: () => void;
}

export function AddPromptCard({
  onClick,
}: AddPromptCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-brand bg-surface px-6 py-10 text-center transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand text-brand">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
          className="h-6 w-6"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="text-base font-bold text-brand">Add Prompt</span>
      <span className="text-sm text-ink-muted">Create a new AI instruction set</span>
    </button>
  );
}
