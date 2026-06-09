"use client";

import { BreakdownSummaryCards } from "@/components/script-breakdown/BreakdownSummaryCards";
import { LocationsReviewPanel } from "@/components/script-breakdown/LocationsReviewPanel";
import { QualityCheckPanel } from "@/components/script-breakdown/QualityCheckPanel";
import { ComplexityBadge } from "@/components/scenes/ComplexityBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PremiumCard } from "@/components/ui/PremiumCard";
import type {
  ProBreakdownCharacter,
  ProBreakdownCostume,
  ProBreakdownDepartment,
  ProBreakdownLocation,
  ProBreakdownProp,
  ProBreakdownResult,
  ProBreakdownScene,
} from "@/lib/ai/script-breakdown-pro";
import type { SaveBreakdownOptions } from "@/lib/script-breakdown/save-to-project";
import type { Complexity, Location } from "@/lib/types";
import { normalizeProComplexity } from "@/lib/ai/script-breakdown-pro";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type ReviewTab =
  | "scenes"
  | "characters"
  | "locations"
  | "departments"
  | "props_costumes";

const cellInput =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-[12px] text-[var(--text-primary)] focus:border-[rgba(34,211,238,0.3)] focus:outline-none";

function complexityForBadge(value: string): Complexity {
  return normalizeProComplexity(value);
}

interface ReviewBreakdownPanelProps {
  breakdown: ProBreakdownResult;
  existingLocations?: Location[];
  onChange: (next: ProBreakdownResult) => void;
  onSave: (options: SaveBreakdownOptions) => void;
  isSaving: boolean;
  canSave: boolean;
}

export function ReviewBreakdownPanel({
  breakdown,
  existingLocations = [],
  onChange,
  onSave,
  isSaving,
  canSave,
}: ReviewBreakdownPanelProps) {
  const [tab, setTab] = useState<ReviewTab>("scenes");
  const [options, setOptions] = useState<SaveBreakdownOptions>({
    createScenes: true,
    updateExistingScenes: false,
    createCharacters: true,
    createLocations: true,
    applyDepartmentNotes: true,
  });

  const tabs = useMemo(
    () =>
      [
        ["scenes", `Scenes (${breakdown.scenes.length})`],
        ["characters", `Characters (${breakdown.characters.length})`],
        ["locations", `Location Suggestions (${breakdown.locations.length})`],
        ["departments", `Departments (${breakdown.departments.length})`],
        [
          "props_costumes",
          `Props/Costumes (${breakdown.props.length + breakdown.costumes.length})`,
        ],
      ] as const,
    [breakdown]
  );

  const updateScenes = (scenes: ProBreakdownScene[]) =>
    onChange({ ...breakdown, scenes });
  const updateCharacters = (characters: ProBreakdownCharacter[]) =>
    onChange({ ...breakdown, characters });
  const updateLocations = (locations: ProBreakdownLocation[]) =>
    onChange({ ...breakdown, locations });
  const updateDepartments = (departments: ProBreakdownDepartment[]) =>
    onChange({ ...breakdown, departments });
  const updateProps = (props: ProBreakdownProp[]) =>
    onChange({ ...breakdown, props });
  const updateCostumes = (costumes: ProBreakdownCostume[]) =>
    onChange({ ...breakdown, costumes });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mb-3">
          Review Breakdown
        </p>
        <BreakdownSummaryCards breakdown={breakdown} />
      </div>

      {breakdown.processing_report && (
        <PremiumCard padding="sm">
          <p className="text-[11px] text-[var(--text-muted)]">
            {breakdown.processing_report.total_chunks_analyzed}
            {breakdown.processing_report.total_chunks_planned
              ? ` of ${breakdown.processing_report.total_chunks_planned}`
              : ""}{" "}
            chunks analyzed · {breakdown.processing_report.total_scenes_detected}{" "}
            scenes · {breakdown.processing_report.uncertain_scenes_count} uncertain ·{" "}
            {breakdown.processing_report.warnings_count} warnings
          </p>
          {breakdown.processing_report.chunk_summaries &&
            breakdown.processing_report.chunk_summaries.length > 0 && (
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Chunks:{" "}
                {breakdown.processing_report.chunk_summaries
                  .map((c) =>
                    c.scene_range
                      ? `${c.chunk_index + 1} (${c.scene_range}${c.status === "failed" ? ", failed" : ""})`
                      : `${c.chunk_index + 1}`
                  )
                  .join(" · ")}
              </p>
            )}
          {(breakdown.processing_report.failed_chunks?.length ?? 0) > 0 && (
            <ul className="mt-2 text-[11px] text-[var(--accent-amber)] space-y-0.5">
              {breakdown.processing_report.failed_chunks!.map((fc) => (
                <li key={fc.chunk_index}>
                  Chunk {fc.chunk_index + 1} failed: {fc.error}
                </li>
              ))}
            </ul>
          )}
          {breakdown.extraction_meta?.file_name && (
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Source: {breakdown.extraction_meta.file_name}
              {breakdown.extraction_meta.estimated_pages
                ? ` · ~${breakdown.extraction_meta.estimated_pages} pages`
                : ""}
              {breakdown.extraction_meta.chunk_count
                ? ` · ${breakdown.extraction_meta.chunk_count} chunks planned`
                : ""}
            </p>
          )}
        </PremiumCard>
      )}

      <QualityCheckPanel qualityCheck={breakdown.quality_check} />

      {breakdown.project_summary.production_warnings.length > 0 && (
        <PremiumCard padding="md" className="border-[rgba(245,158,11,0.15)]">
          <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">
            Production warnings
          </p>
          <ul className="space-y-1 text-[12px] text-[var(--text-muted)]">
            {breakdown.project_summary.production_warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </PremiumCard>
      )}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] transition-colors ${
              tab === key
                ? "bg-white/[0.06] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "scenes" && (
        <div className="space-y-3">
          {breakdown.scenes.map((scene, idx) => (
            <PremiumCard key={`${scene.scene_number}-${idx}`} padding="sm">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <input
                    className={`${cellInput} w-16`}
                    value={scene.scene_number}
                    onChange={(e) => {
                      const next = [...breakdown.scenes];
                      next[idx] = { ...scene, scene_number: e.target.value };
                      updateScenes(next);
                    }}
                  />
                  <ComplexityBadge complexity={complexityForBadge(scene.complexity)} />
                  {scene.confidence_score != null && scene.confidence_score < 0.7 && (
                    <Badge variant="pending" size="sm">
                      low confidence
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateScenes(breakdown.scenes.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  className={cellInput}
                  placeholder="Location"
                  value={scene.location}
                  onChange={(e) => {
                    const next = [...breakdown.scenes];
                    next[idx] = { ...scene, location: e.target.value };
                    updateScenes(next);
                  }}
                />
                <input
                  className={cellInput}
                  placeholder="INT/EXT"
                  value={scene.interior_exterior}
                  onChange={(e) => {
                    const next = [...breakdown.scenes];
                    next[idx] = { ...scene, interior_exterior: e.target.value };
                    updateScenes(next);
                  }}
                />
                <input
                  className={cellInput}
                  placeholder="DAY/NIGHT"
                  value={scene.day_night}
                  onChange={(e) => {
                    const next = [...breakdown.scenes];
                    next[idx] = { ...scene, day_night: e.target.value };
                    updateScenes(next);
                  }}
                />
                <input
                  className={cellInput}
                  placeholder="Description"
                  value={scene.short_description}
                  onChange={(e) => {
                    const next = [...breakdown.scenes];
                    next[idx] = { ...scene, short_description: e.target.value };
                    updateScenes(next);
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                Cast: {scene.characters.join(", ") || "—"}
              </p>
            </PremiumCard>
          ))}
        </div>
      )}

      {tab === "characters" && (
        <div className="space-y-3">
          {breakdown.characters.map((char, idx) => (
            <PremiumCard key={`${char.name}-${idx}`} padding="sm">
              <div className="flex justify-between gap-2 mb-2">
                <input
                  className={`${cellInput} font-medium`}
                  value={char.name}
                  onChange={(e) => {
                    const next = [...breakdown.characters];
                    next[idx] = { ...char, name: e.target.value };
                    updateCharacters(next);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateCharacters(
                      breakdown.characters.filter((_, i) => i !== idx)
                    )
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Badge variant="default" size="sm">
                {char.suggested_cast_type}
              </Badge>
              <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                {char.description || char.notes || "—"}
              </p>
            </PremiumCard>
          ))}
        </div>
      )}

      {tab === "locations" && (
        <LocationsReviewPanel
          breakdown={breakdown}
          existingLocations={existingLocations}
          onChange={onChange}
        />
      )}

      {tab === "departments" && (
        <div className="space-y-3">
          {breakdown.departments.map((dept, idx) => (
            <PremiumCard key={`${dept.department}-${idx}`} padding="sm">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[13px] font-medium">{dept.department}</p>
                <Badge variant="pending" size="sm">
                  {dept.priority}
                </Badge>
              </div>
              <textarea
                className={`${cellInput} min-h-[60px]`}
                value={dept.notes}
                onChange={(e) => {
                  const next = [...breakdown.departments];
                  next[idx] = { ...dept, notes: e.target.value };
                  updateDepartments(next);
                }}
              />
            </PremiumCard>
          ))}
        </div>
      )}

      {tab === "props_costumes" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Props
            </p>
            {breakdown.props.map((prop, idx) => (
              <PremiumCard key={`${prop.name}-${idx}`} padding="sm" className="mb-2">
                <p className="text-[13px] font-medium">{prop.name}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {prop.department} · {prop.scenes.join(", ")}
                </p>
              </PremiumCard>
            ))}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Costumes
            </p>
            {breakdown.costumes.map((costume, idx) => (
              <PremiumCard key={`${costume.character}-${idx}`} padding="sm" className="mb-2">
                <p className="text-[13px] font-medium">{costume.character}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {costume.costume_notes || costume.continuity_notes || "—"}
                </p>
              </PremiumCard>
            ))}
          </div>
        </div>
      )}

      <PremiumCard padding="md">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mb-3">
          Auto-create suggestions
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["createScenes", "Save scenes to project"],
              ["updateExistingScenes", "Update existing scenes (by scene number)"],
              ["createCharacters", "Create detected characters (cast placeholders)"],
              ["createLocations", "Save location suggestions (not active until approved)"],
              ["applyDepartmentNotes", "Apply department notes to scenes"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]"
            >
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => onSave(options)}
            disabled={!canSave || isSaving || breakdown.scenes.length === 0}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Breakdown to Project
          </Button>
        </div>
      </PremiumCard>
    </div>
  );
}
