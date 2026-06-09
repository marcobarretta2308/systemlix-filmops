import type {
  ProBreakdownLocation,
  ProBreakdownResult,
  ProBreakdownScene,
} from "@/lib/ai/script-breakdown-pro";
import {
  detectGenericEnglishLocation,
  findSimilarExistingLocation,
  inferLocationType,
  normalizeLocationKey,
  parseMainSubLocation,
} from "@/lib/locations/normalization";
import type { Location } from "@/lib/types";

export type LocationReviewEntry = ProBreakdownLocation & {
  canonical_name: string;
  sub_location: string;
  display_name: string;
  scenes: string[];
  day_night_usage: string[];
  complexity_peak: string;
  warnings: string[];
  merge_with_existing_id: string | null;
  merge_with_existing_name: string | null;
  create: boolean;
  update_existing: boolean;
  suggestion_action?: "create" | "merge" | "ignore";
  confidence_score?: number;
};

function sceneComplexityRank(value: string): number {
  const raw = value.toLowerCase();
  if (raw === "critical" || raw.includes("very")) return 4;
  if (raw === "high") return 3;
  if (raw === "medium") return 2;
  return 1;
}

function peakComplexity(scenes: ProBreakdownScene[], sceneNumbers: string[]): string {
  let peak = "low";
  let rank = 0;
  const keys = new Set(sceneNumbers.map(normalizeLocationKey));
  for (const scene of scenes) {
    if (!keys.has(normalizeLocationKey(scene.scene_number))) continue;
    const r = sceneComplexityRank(scene.complexity);
    if (r > rank) {
      rank = r;
      peak = scene.complexity || "low";
    }
  }
  return peak;
}

function collectDayNight(
  scenes: ProBreakdownScene[],
  sceneNumbers: string[]
): string[] {
  const keys = new Set(sceneNumbers.map(normalizeLocationKey));
  const usage = new Set<string>();
  for (const scene of scenes) {
    if (!keys.has(normalizeLocationKey(scene.scene_number))) continue;
    const dn = scene.day_night?.trim();
    if (dn && dn !== "UNKNOWN") usage.add(dn);
  }
  return [...usage];
}

function entryKey(canonical: string, sub: string): string {
  return `${normalizeLocationKey(canonical)}|${normalizeLocationKey(sub)}`;
}

export function buildLocationReviewEntries(
  breakdown: ProBreakdownResult,
  existingLocations: Location[] = []
): LocationReviewEntry[] {
  const map = new Map<string, LocationReviewEntry>();

  const ingest = (
    rawName: string,
    sceneNumbers: string[],
    typeHint: string,
    extraWarnings: string[] = []
  ) => {
    const parsed = parseMainSubLocation(rawName);
    if (!parsed.canonical_name) return;

    const key = entryKey(parsed.canonical_name, parsed.sub_location);
    const similar = findSimilarExistingLocation(
      parsed.canonical_name,
      parsed.sub_location,
      existingLocations
    );

    const warnings = [...parsed.warnings, ...extraWarnings];
    if (detectGenericEnglishLocation(rawName)) {
      warnings.push("Location in inglese — usare la lingua del copione");
    }

    const existing = map.get(key);
    if (existing) {
      existing.scenes = [...new Set([...existing.scenes, ...sceneNumbers])];
      existing.warnings = [...new Set([...existing.warnings, ...warnings])];
      return;
    }

    const locType = inferLocationType(
      parsed.canonical_name,
      parsed.sub_location,
      typeHint
    );

    map.set(key, {
      name: parsed.display_name,
      canonical_name: parsed.canonical_name,
      sub_location: parsed.sub_location,
      display_name: parsed.display_name,
      type: locType === "unknown" ? "unknown" : locType,
      scenes: [...new Set(sceneNumbers)],
      notes: "",
      day_night_usage: [],
      complexity_peak: "low",
      warnings,
      merge_with_existing_id: similar?.id ?? null,
      merge_with_existing_name: similar
        ? similar.canonical_name || similar.name
        : null,
      create: !similar,
      update_existing: Boolean(similar),
      suggestion_action: similar ? "merge" : "create",
      confidence_score: undefined,
    });
  };

  for (const loc of breakdown.locations) {
    if (loc.canonical_name) {
      const key = entryKey(loc.canonical_name, loc.sub_location ?? "");
      const similar = findSimilarExistingLocation(
        loc.canonical_name,
        loc.sub_location ?? "",
        existingLocations
      );
      if (!map.has(key)) {
        map.set(key, {
          name: loc.name,
          canonical_name: loc.canonical_name,
          sub_location: loc.sub_location ?? "",
          display_name: loc.display_name ?? loc.name,
          type: loc.type,
          scenes: [...loc.scenes],
          notes: loc.notes ?? "",
          day_night_usage: [],
          complexity_peak: "low",
          warnings: [],
          merge_with_existing_id: similar?.id ?? null,
          merge_with_existing_name: similar
            ? similar.canonical_name || similar.name
            : null,
          create: !similar,
          update_existing: Boolean(similar),
          suggestion_action: similar ? "merge" : "create",
          confidence_score: loc.confidence_score,
        });
      }
      continue;
    }
    ingest(
      loc.name,
      loc.scenes,
      loc.type === "interior"
        ? "INT"
        : loc.type === "exterior"
          ? "EXT"
          : loc.type === "mixed"
            ? "INT/EXT"
            : "UNKNOWN",
      loc.notes ? [loc.notes] : []
    );
  }

  for (const scene of breakdown.scenes) {
    if (!scene.location?.trim()) continue;
    ingest(scene.location, [scene.scene_number], scene.interior_exterior);
  }

  const entries = [...map.values()].map((entry) => ({
    ...entry,
    day_night_usage: collectDayNight(breakdown.scenes, entry.scenes),
    complexity_peak: peakComplexity(breakdown.scenes, entry.scenes),
  }));

  const deduped = dedupeLocationReviewEntries(entries);

  return deduped
    .map((entry) => ({
      ...entry,
      warnings: [
        ...new Set([
          ...entry.warnings,
          ...buildEntryQualityWarnings(entry, deduped, breakdown),
        ]),
      ],
    }))
    .sort((a, b) => a.canonical_name.localeCompare(b.canonical_name, "it"));
}

/** Merge only exact canonical+sub duplicates — preserves separate sub-locations. */
export function dedupeLocationReviewEntries(
  entries: LocationReviewEntry[]
): LocationReviewEntry[] {
  const map = new Map<string, LocationReviewEntry>();

  for (const entry of entries) {
    const key = entryKey(entry.canonical_name, entry.sub_location);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...entry });
      continue;
    }
    existing.scenes = [...new Set([...existing.scenes, ...entry.scenes])];
    existing.warnings = [...new Set([...existing.warnings, ...entry.warnings])];
    existing.day_night_usage = [
      ...new Set([...existing.day_night_usage, ...entry.day_night_usage]),
    ];
  }

  return [...map.values()];
}

export function buildEntryQualityWarnings(
  entry: LocationReviewEntry,
  allEntries: LocationReviewEntry[],
  _breakdown: ProBreakdownResult
): string[] {
  const warnings: string[] = [];
  const key = normalizeLocationKey(entry.canonical_name);

  if (entry.scenes.length === 0) {
    warnings.push(
      `Location without linked scene: ${entry.display_name || entry.name}`
    );
  }

  if (detectGenericEnglishLocation(entry.name)) {
    warnings.push(`English location in script context: ${entry.name}`);
  }

  if (!entry.sub_location && entry.canonical_name.split(" ").length <= 2) {
    const hasSiblingWithSub = allEntries.some(
      (other) =>
        other !== entry &&
        normalizeLocationKey(other.canonical_name) !== key &&
        other.sub_location &&
        normalizeLocationKey(other.sub_location) === key
    );
    if (hasSiblingWithSub) {
      warnings.push(
        `Likely duplicate — orphan sub-location as main: ${entry.canonical_name}`
      );
    }
  }

  if (entry.canonical_name && !entry.sub_location && entry.name.includes(" - ")) {
    warnings.push(`Missing main/sub split: ${entry.name}`);
  }

  const similar = allEntries.filter(
    (other) =>
      other !== entry &&
      normalizeLocationKey(other.canonical_name) === key &&
      other.sub_location !== entry.sub_location
  );
  if (similar.length > 0 && !entry.sub_location && entry.scenes.length > 0) {
    const subNames = similar
      .filter((o) => o.sub_location)
      .map((o) => o.sub_location);
    if (subNames.length > 0) {
      warnings.push(
        `Consider merging sub-locations under ${entry.canonical_name}: ${subNames.join(", ")}`
      );
    }
  }

  return warnings;
}

export function buildGlobalLocationQualityWarnings(
  entries: LocationReviewEntry[],
  breakdown: ProBreakdownResult
): string[] {
  const warnings: string[] = [];
  const canonicalCounts = new Map<string, number>();

  for (const entry of entries) {
    const key = normalizeLocationKey(entry.canonical_name);
    canonicalCounts.set(key, (canonicalCounts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of canonicalCounts) {
    if (count > 3) {
      warnings.push(`Likely duplicate locations under: ${key} (${count} entries)`);
    }
  }

  const sceneLinked = new Set(entries.flatMap((e) => e.scenes));
  for (const scene of breakdown.scenes) {
    if (scene.location?.trim() && !sceneLinked.has(scene.scene_number)) {
      warnings.push(
        `Scene ${scene.scene_number} location not in review list: ${scene.location}`
      );
    }
  }

  return [...new Set(warnings)];
}

export function applyLocationReviewToBreakdown(
  breakdown: ProBreakdownResult,
  entries: LocationReviewEntry[]
): ProBreakdownResult {
  return {
    ...breakdown,
    locations: entries,
  };
}
