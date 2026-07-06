"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { WorkshopStages } from "@/features/jd-upload/components/WorkshopStages";
import { WorkshopSidebar } from "@/features/jd-upload/components/WorkshopSidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { ConfirmPositionItem, DetectedPosition } from "@/features/jd-upload/types";

// ─── Icons ───────────────────────────────────────────────────────────────────

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
      className="h-3.5 w-3.5"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LocationIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function BriefcaseIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkillPill({ label }: { label: string }): React.ReactElement {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
      {label}
    </span>
  );
}

function Checkbox({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
        checked
          ? "border-brand bg-brand text-white"
          : "border-line-strong bg-surface hover:border-brand",
      )}
    >
      {checked && <CheckIcon />}
    </button>
  );
}

function PositionCard({
  position,
  checked,
  onToggle,
  index,
}: {
  position: DetectedPosition;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  index: number;
}): React.ReactElement {
  const visibleSkills = position.skills.slice(0, 5);
  const extraSkills = position.skills.length - visibleSkills.length;
  const cardId = `position-${position.tempId}`;

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-5 shadow-sm transition-colors",
        checked ? "border-brand/40 bg-surface" : "border-line opacity-60",
      )}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div className="mt-0.5">
          <Checkbox checked={checked} onChange={onToggle} id={cardId} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar/10 text-xs font-bold text-sidebar">
              {index + 1}
            </span>
            <label
              htmlFor={cardId}
              className={cn(
                "cursor-pointer text-base font-semibold leading-tight",
                checked ? "text-ink" : "text-ink-muted",
              )}
            >
              {position.title ?? "Untitled Position"}
            </label>
          </div>

          {/* Meta row — location + experience */}
          {(position.location || position.experienceLevel) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              {position.location && (
                <span className="flex items-center gap-1">
                  <LocationIcon />
                  {position.location}
                </span>
              )}
              {position.experienceLevel && (
                <span className="flex items-center gap-1">
                  <BriefcaseIcon />
                  {position.experienceLevel}
                </span>
              )}
            </div>
          )}

          {/* Skills */}
          {visibleSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {visibleSkills.map((skill) => (
                <SkillPill key={skill} label={skill} />
              ))}
              {extraSkills > 0 && (
                <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-muted ring-1 ring-line">
                  +{extraSkills} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface PositionReviewViewProps {
  sourceFilename: string;
  positions: DetectedPosition[];
  loading?: boolean;
  onBack: () => void;
  onConfirm: (confirmed: ConfirmPositionItem[]) => void;
}

export function PositionReviewView({
  sourceFilename,
  positions,
  loading = false,
  onBack,
  onConfirm,
}: PositionReviewViewProps): React.ReactElement {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(positions.map((p) => [p.tempId, true])),
  );

  const selectedCount = Object.values(checked).filter(Boolean).length;
  const allSelected = selectedCount === positions.length;
  const noneSelected = selectedCount === 0;

  const handleToggle = (tempId: string) => (value: boolean) => {
    setChecked((prev) => ({ ...prev, [tempId]: value }));
  };

  const handleSelectAll = () => {
    const next = !allSelected;
    setChecked(Object.fromEntries(positions.map((p) => [p.tempId, next])));
  };

  const handleConfirm = () => {
    const confirmed = positions
      .filter((p) => checked[p.tempId])
      .map((p): ConfirmPositionItem => ({
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
    onConfirm(confirmed);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-subtle">
      <WorkshopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        {/* Fixed header */}
        <div className="shrink-0 px-6 pt-8 pb-4 lg:px-10">
          <h1 className="text-3xl font-bold text-ink">Pricing</h1>
          <div className="mt-4 space-y-3">
            <h2 className="text-lg font-bold text-ink">Stages</h2>
            <WorkshopStages activeStage="upload" />
          </div>
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-6 lg:px-10">
          {/* Banner */}
          <div className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="text-sm font-semibold text-blue-800">
              We found {positions.length} position{positions.length !== 1 ? "s" : ""} in &ldquo;
              {sourceFilename}&rdquo;
            </p>
            <p className="mt-0.5 text-xs text-blue-600">
              All positions are selected by default. Uncheck any you don&apos;t want to price.
            </p>
          </div>

          {/* Select-all row */}
          <div className="shrink-0 flex items-center justify-between">
            <span className="text-sm text-ink-muted">
              {selectedCount} of {positions.length} selected
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm font-medium text-brand hover:underline"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>

          {/* Position cards — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {positions.map((position, index) => (
              <PositionCard
                key={position.tempId}
                position={position}
                checked={checked[position.tempId] ?? true}
                onToggle={handleToggle(position.tempId)}
                index={index}
              />
            ))}
          </div>

          {/* Footer actions */}
          <div className="shrink-0 flex items-center gap-3 pt-2">
            <Button variant="secondary" size="lg" onClick={onBack} className="w-auto px-6">
              ← Back
            </Button>
            <Button
              size="lg"
              disabled={noneSelected || loading}
              onClick={handleConfirm}
              className="flex-1"
            >
              {loading
                ? "Creating JDs…"
                : `Price ${selectedCount} Selected Position${selectedCount !== 1 ? "s" : ""} →`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
