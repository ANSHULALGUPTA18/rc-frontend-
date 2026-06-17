/**
 * WorkshopStages — progress stepper shown at the top of every workshop screen.
 *
 * Accepts a single `activeStage` prop and derives complete/active/upcoming status
 * for each pill by comparing array positions — no status prop needed per stage.
 *
 * Connector line between two stages is dark (sidebar colour) when the left
 * stage is complete; gray otherwise. This is computed from `nextStatus` so the
 * connector reflects both neighbouring stages without extra props.
 */

import { cn } from "@/lib/utils/cn";
import type { WorkshopActiveStage, WorkshopStageId } from "@/features/jd-upload/types";

interface StageDefinition {
  id: WorkshopStageId;
  label: string;
}

const STAGE_DEFS: StageDefinition[] = [
  { id: "upload", label: "UPLOAD" },
  { id: "extraction", label: "Extraction" },
  { id: "prompt-selection", label: "Prompt Selection" },
  { id: "recommendations", label: "Recommendations" },
];

const STAGE_ORDER: WorkshopStageId[] = ["upload", "extraction", "prompt-selection", "recommendations"];

function getStatus(
  id: WorkshopStageId,
  activeStage: WorkshopActiveStage,
): "complete" | "active" | "upcoming" {
  const activeIdx = STAGE_ORDER.indexOf(activeStage);
  const idx = STAGE_ORDER.indexOf(id);
  if (idx < activeIdx) return "complete";
  if (idx === activeIdx) return "active";
  return "upcoming";
}

function CheckIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 text-white"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function StageDot({
  status,
}: {
  status: "complete" | "active" | "upcoming";
}): React.ReactElement {
  if (status === "complete") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar">
        <CheckIcon />
      </span>
    );
  }
  if (status === "active") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className="h-5 w-5 text-brand"
      >
        <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line-strong">
      <span className="h-2 w-2 rounded-full bg-line-strong" />
    </span>
  );
}

interface WorkshopStagesProps {
  activeStage?: WorkshopActiveStage;
}

export function WorkshopStages({
  activeStage = "upload",
}: WorkshopStagesProps): React.ReactElement {
  return (
    <ol className="flex items-center" aria-label="Workshop stages">
      {STAGE_DEFS.map((stage, index) => {
        const status = getStatus(stage.id, activeStage);
        const isLast = index === STAGE_DEFS.length - 1;
        const nextStatus =
          !isLast ? getStatus(STAGE_DEFS[index + 1].id, activeStage) : null;
        const connectorDark =
          status === "complete" || nextStatus === "active";

        return (
          <li
            key={stage.id}
            className={cn("flex items-center", !isLast && "flex-1")}
          >
            <div
              aria-current={status === "active" ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border bg-surface px-4 py-3",
                status === "active"
                  ? "border-brand"
                  : status === "complete"
                    ? "border-sidebar"
                    : "border-line",
              )}
            >
              <StageDot status={status} />
              <span
                className={cn(
                  "text-sm font-semibold",
                  status === "active"
                    ? "uppercase tracking-wide text-brand"
                    : status === "complete"
                      ? "text-sidebar"
                      : "text-ink",
                )}
              >
                {stage.label}
              </span>
            </div>
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-3 h-0.5 flex-1",
                  connectorDark ? "bg-sidebar" : "bg-line",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
