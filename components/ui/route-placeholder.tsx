export interface RoutePlaceholderProps {
  title: string;
}

export function RoutePlaceholder({
  title,
}: RoutePlaceholderProps): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-surface-subtle p-10 text-center">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="text-sm text-ink-muted">This screen is not yet implemented.</p>
    </main>
  );
}
