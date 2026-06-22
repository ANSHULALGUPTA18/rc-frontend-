import { cn } from "@/lib/utils/cn";
import type { SelectedJdFile } from "@/features/jd-upload/types";

interface UploadPreviewPanelProps {
  files: SelectedJdFile[];
  onRemove: (id: string) => void;
  onClear?: () => void;
}

const stripExtension = (name: string): string => name.replace(/\.[^.]+$/, "");

function SearchIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7 text-sidebar-active"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function TrashIcon(): React.ReactElement {
  return (
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
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface-subtle">
        <SearchIcon />
      </span>
      <h3 className="text-lg font-bold text-ink">Upload Preview</h3>
      <p className="max-w-xs text-sm text-ink-muted">
        Upload multiple Documents to compare market rates, skill demands, and agency recommendations
        side by side.
      </p>
    </div>
  );
}

export function UploadPreviewPanel({
  files,
  onRemove,
  onClear,
}: UploadPreviewPanelProps): React.ReactElement {
  return (
    <section
      aria-label="Uploaded document preview"
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        files.length === 0 ? "flex" : "",
      )}
    >
      {files.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-ink">Uploaded Document Preview</h3>
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-medium text-red-500 hover:text-red-600"
            >
              Clear All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                    Position
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                    Exp.(Yrs)
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                    ExistingPrice
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-sidebar-active">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((entry) => (
                  <tr key={entry.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 font-medium text-ink">
                      {stripExtension(entry.file.name)}
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">—</td>
                    <td className="py-3 pr-4 text-ink-muted">—</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => onRemove(entry.id)}
                        aria-label={`Remove ${entry.file.name}`}
                        className="rounded p-1 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-red-500"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
