import type { ProBreakdownResult } from "@/lib/ai/script-breakdown-pro";
import {
  inferLocationType,
  normalizeLocationKey,
  parseMainSubLocation,
  type LocationMetadata,
} from "@/lib/locations/normalization";
import {
  buildLocationReviewEntries,
  type LocationReviewEntry,
} from "@/lib/locations/review-from-breakdown";
import type { Location } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type SuggestionGroup = {
  canonical_name: string;
  entries: LocationReviewEntry[];
  location_type: string;
};

function getSuggestionEntries(
  breakdown: ProBreakdownResult,
  existing: Location[]
): LocationReviewEntry[] {
  const hasNormalized = breakdown.locations.some((l) => l.canonical_name);
  const entries = hasNormalized
    ? (breakdown.locations as LocationReviewEntry[])
    : buildLocationReviewEntries(breakdown, existing);

  return entries.filter(
    (e) => e.create !== false && e.suggestion_action !== "ignore"
  );
}

function buildGroups(entries: LocationReviewEntry[]): Map<string, SuggestionGroup> {
  const groups = new Map<string, SuggestionGroup>();

  for (const entry of entries) {
    const canonical = entry.canonical_name?.trim();
    if (!canonical) continue;
    const key = normalizeLocationKey(canonical);
    const group = groups.get(key) ?? {
      canonical_name: canonical,
      entries: [],
      location_type: entry.type ?? "unknown",
    };
    group.entries.push(entry);
    if (entry.type && entry.type !== "unknown") {
      group.location_type = entry.type;
    }
    groups.set(key, group);
  }

  return groups;
}

export async function saveLocationSuggestions(
  supabase: SupabaseClient,
  projectId: string,
  breakdown: ProBreakdownResult,
  existingLocations: Location[]
): Promise<{ created: number; updated: number }> {
  const entries = getSuggestionEntries(breakdown, existingLocations);
  const groups = buildGroups(entries);

  const suggestionByCanonical = new Map<string, Location>();
  for (const loc of existingLocations) {
    if (loc.status !== "suggestion") continue;
    const key = normalizeLocationKey(loc.canonical_name || loc.name);
    if (key) suggestionByCanonical.set(key, loc);
  }

  let created = 0;
  let updated = 0;

  for (const [key, group] of groups) {
    const primary = group.entries.find((e) => !e.sub_location) ?? group.entries[0];
    const rawName = primary.name || primary.display_name || group.canonical_name;

    const subLocations = group.entries
      .filter((e) => e.sub_location)
      .map((e) => ({
        name: e.sub_location,
        scenes: e.scenes,
        day_night: e.day_night_usage,
        warnings: e.warnings,
      }));

    const metadata: LocationMetadata = {
      sub_locations: subLocations,
      day_night_usage: [
        ...new Set(group.entries.flatMap((e) => e.day_night_usage ?? [])),
      ],
      warnings: [...new Set(group.entries.flatMap((e) => e.warnings ?? []))],
      linked_scene_numbers: [
        ...new Set(group.entries.flatMap((e) => e.scenes)),
      ],
    };

    const row = {
      name: group.canonical_name,
      canonical_name: group.canonical_name,
      sub_location: "",
      raw_name: rawName,
      confidence_score: primary.confidence_score ?? null,
      location_type: group.location_type,
      status: "suggestion" as const,
      source: "script_breakdown" as const,
      metadata,
      access_notes: "",
      production_notes: primary.notes?.trim() ?? "",
      notes: metadata.warnings?.join("\n") ?? "",
      scene_count: metadata.linked_scene_numbers?.length ?? 0,
    };

    const existing = suggestionByCanonical.get(key);
    if (existing) {
      const { error } = await supabase
        .from("locations")
        .update(row)
        .eq("id", existing.id);
      if (error) throw error;
      updated += 1;
    } else {
      const { error } = await supabase.from("locations").insert({
        project_id: projectId,
        address: "",
        maps_link: "",
        parking_notes: "",
        ...row,
      });
      if (error) throw error;
      created += 1;
    }
  }

  return { created, updated };
}
