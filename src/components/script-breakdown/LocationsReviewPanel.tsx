"use client";

import { Badge } from "@/components/ui/Badge";
import { PremiumCard } from "@/components/ui/PremiumCard";
import type { ProBreakdownResult } from "@/lib/ai/script-breakdown-pro";
import {
  applyLocationReviewToBreakdown,
  buildGlobalLocationQualityWarnings,
  buildLocationReviewEntries,
  type LocationReviewEntry,
} from "@/lib/locations/review-from-breakdown";
import type { Location } from "@/lib/types";
import { ComplexityBadge } from "@/components/scenes/ComplexityBadge";
import { normalizeProComplexity } from "@/lib/ai/script-breakdown-pro";
import { useEffect, useMemo, useState } from "react";

const cellInput =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-[12px] text-[var(--text-primary)] focus:border-[rgba(34,211,238,0.3)] focus:outline-none";

function typeBadge(type: string) {
  if (type === "interior") return "INT";
  if (type === "exterior") return "EXT";
  if (type === "mixed") return "MIXED";
  if (type === "vehicle") return "VEHICLE";
  return "—";
}

export function LocationsReviewPanel({
  breakdown,
  existingLocations,
  onChange,
}: {
  breakdown: ProBreakdownResult;
  existingLocations: Location[];
  onChange: (next: ProBreakdownResult) => void;
}) {
  const [entries, setEntries] = useState<LocationReviewEntry[]>([]);

  useEffect(() => {
    const built = buildLocationReviewEntries(breakdown, existingLocations);
    setEntries(built);
    onChange(applyLocationReviewToBreakdown(breakdown, built));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init when review panel mounts
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, LocationReviewEntry[]>();
    for (const entry of entries) {
      const key = entry.canonical_name;
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "it"));
  }, [entries]);

  const globalWarnings = useMemo(
    () => buildGlobalLocationQualityWarnings(entries, breakdown),
    [entries, breakdown]
  );

  const entryKey = (e: LocationReviewEntry) =>
    `${e.canonical_name}|${e.sub_location}`;

  const updateEntry = (key: string, patch: Partial<LocationReviewEntry>) => {
    const next = entries.map((e) =>
      entryKey(e) === key ? { ...e, ...patch } : e
    );
    setEntries(next);
    onChange(applyLocationReviewToBreakdown(breakdown, next));
  };

  const setSuggestionAction = (
    key: string,
    action: "create" | "merge" | "ignore"
  ) => {
    updateEntry(key, {
      suggestion_action: action,
      create: action === "create",
      update_existing: action === "merge",
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-[var(--text-muted)]">
        Candidate location rilevate dall&apos;AI. Al salvataggio vengono
        memorizzate come <strong>suggestions</strong> — non diventano location
        attive finché non le approvi dalla pagina Locations.
      </p>

      {globalWarnings.length > 0 && (
        <PremiumCard padding="md">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--accent-amber)] mb-2">
            Quality warnings
          </p>
          <ul className="text-[11px] text-[var(--accent-amber)] space-y-1">
            {globalWarnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </PremiumCard>
      )}

      {grouped.map(([canonical, group]) => (
        <PremiumCard key={canonical} padding="md">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mb-3">
            Suggested main location
          </p>
          <p className="text-[15px] font-medium text-[var(--text-primary)] mb-4">
            {canonical}
          </p>

          <div className="space-y-3">
            {group.map((entry) => {
              const key = entryKey(entry);
              const action = entry.suggestion_action ?? (entry.create !== false ? "create" : "ignore");

              return (
                <div
                  key={key}
                  className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="cyan" size="sm">
                      {typeBadge(entry.type)}
                    </Badge>
                    {entry.confidence_score != null && (
                      <Badge variant="default" size="sm">
                        {Math.round(entry.confidence_score * 100)}% conf.
                      </Badge>
                    )}
                    {entry.complexity_peak && (
                      <ComplexityBadge
                        complexity={normalizeProComplexity(entry.complexity_peak)}
                      />
                    )}
                    {entry.merge_with_existing_name && (
                      <Badge variant="pending" size="sm">
                        Duplicato probabile: {entry.merge_with_existing_name}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-1">
                        Raw location (AI)
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        {entry.name || entry.display_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-1">
                        Sub-location
                      </p>
                      <input
                        className={cellInput}
                        value={entry.sub_location}
                        onChange={(e) =>
                          updateEntry(key, { sub_location: e.target.value })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] text-[var(--text-muted)] mb-1">
                        Scenes
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        {entry.scenes.join(", ") || "—"}
                      </p>
                    </div>
                  </div>

                  {entry.warnings.length > 0 && (
                    <ul className="mt-2 text-[11px] text-[var(--accent-amber)]">
                      {entry.warnings.map((w) => (
                        <li key={w}>• {w}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      [
                        ["create", "Save as suggestion"],
                        ["merge", "Merge into existing"],
                        ["ignore", "Ignore"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSuggestionAction(key, value)}
                        className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] transition-colors ${
                          action === value
                            ? "bg-white/[0.08] text-[var(--text-primary)]"
                            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </PremiumCard>
      ))}

      {entries.length === 0 && (
        <p className="text-[13px] text-[var(--text-muted)]">
          Nessuna candidate location rilevata dal breakdown.
        </p>
      )}
    </div>
  );
}
