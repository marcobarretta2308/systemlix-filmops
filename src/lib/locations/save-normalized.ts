import { normalizeSceneKey } from "@/lib/ai/script-breakdown-pro";
import type { ProBreakdownResult } from "@/lib/ai/script-breakdown-pro";
import {
  buildDisplayName,
  inferLocationType,
  normalizeLocationKey,
  parseMainSubLocation,
  type LocationMetadata,
} from "@/lib/locations/normalization";
import {
  buildLocationReviewEntries,
  type LocationReviewEntry,
} from "@/lib/locations/review-from-breakdown";
import { insertSceneLocationLink } from "@/lib/supabase/data";
import type { Location, Scene } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function locationTypeLabel(type: string): string {
  if (type === "interior") return "INT";
  if (type === "exterior") return "EXT";
  if (type === "mixed") return "MIXED";
  if (type === "vehicle") return "VEHICLE";
  return "UNKNOWN";
}

type CanonicalGroup = {
  canonical_name: string;
  entries: LocationReviewEntry[];
  location_type: string;
};

function getReviewEntries(
  breakdown: ProBreakdownResult,
  existing: Location[]
): LocationReviewEntry[] {
  const hasNormalized = breakdown.locations.some((l) => l.canonical_name);
  const entries = hasNormalized
    ? (breakdown.locations as LocationReviewEntry[])
    : buildLocationReviewEntries(breakdown, existing);
  return entries.filter((e) => e.create !== false || e.update_existing === true);
}

function buildCanonicalGroups(
  entries: LocationReviewEntry[]
): Map<string, CanonicalGroup> {
  const groups = new Map<string, CanonicalGroup>();

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

async function upsertCanonicalLocation(
  supabase: SupabaseClient,
  projectId: string,
  group: CanonicalGroup,
  existingLocations: Location[],
  locationByCanonical: Map<string, Location>
): Promise<string> {
  const canonicalKey = normalizeLocationKey(group.canonical_name);
  const primary = group.entries.find((e) => !e.sub_location) ?? group.entries[0];
  const mergeTarget =
    primary.merge_with_existing_id
      ? existingLocations.find((l) => l.id === primary.merge_with_existing_id)
      : locationByCanonical.get(canonicalKey);

  const subLocations = group.entries
    .filter((e) => e.sub_location)
    .map((e) => ({
      name: e.sub_location,
      scenes: e.scenes,
      day_night: e.day_night_usage,
      warnings: e.warnings,
    }));

  const allSceneNumbers = [
    ...new Set(group.entries.flatMap((e) => e.scenes)),
  ];

  const metadata: LocationMetadata = {
    sub_locations: subLocations,
    day_night_usage: [
      ...new Set(group.entries.flatMap((e) => e.day_night_usage ?? [])),
    ],
    warnings: [...new Set(group.entries.flatMap((e) => e.warnings ?? []))],
    linked_scene_numbers: allSceneNumbers,
  };

  const row = {
    name: group.canonical_name,
    canonical_name: group.canonical_name,
    sub_location: "",
    location_type: group.location_type,
    status: "scouting" as const,
    source: "script_breakdown",
    metadata,
    access_notes: `Type: ${locationTypeLabel(group.location_type)}`,
    production_notes: primary.notes?.trim() ?? "",
    notes: metadata.warnings?.join("\n") ?? "",
  };

  if (mergeTarget) {
    const { error } = await supabase
      .from("locations")
      .update(row)
      .eq("id", mergeTarget.id);
    if (error) throw error;
    return mergeTarget.id;
  }

  const existing = locationByCanonical.get(canonicalKey);
  if (existing) {
    const { error } = await supabase
      .from("locations")
      .update(row)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("locations")
    .insert({
      project_id: projectId,
      address: "",
      maps_link: "",
      parking_notes: "",
      scene_count: 0,
      ...row,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function saveNormalizedLocations(
  supabase: SupabaseClient,
  projectId: string,
  breakdown: ProBreakdownResult,
  existingLocations: Location[],
  allScenes: Scene[]
): Promise<{ created: number; updated: number; linked: number }> {
  const entries = getReviewEntries(breakdown, existingLocations);
  const groups = buildCanonicalGroups(entries);

  if (groups.size === 0) {
    for (const scene of allScenes) {
      if (!scene.location?.trim()) continue;
      const parsed = parseMainSubLocation(scene.location);
      if (!parsed.canonical_name) continue;
      const key = normalizeLocationKey(parsed.canonical_name);
      if (!groups.has(key)) {
        groups.set(key, {
          canonical_name: parsed.canonical_name,
          entries: [],
          location_type: inferLocationType(
            parsed.canonical_name,
            parsed.sub_location,
            scene.int_ext ?? ""
          ),
        });
      }
    }
  }

  const locationByCanonical = new Map<string, Location>();
  for (const loc of existingLocations) {
    if (loc.status === "archived") continue;
    const key = normalizeLocationKey(loc.canonical_name || loc.name);
    if (key) locationByCanonical.set(key, loc);
  }

  const canonicalToId = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const [key, group] of groups) {
    const hadExisting = locationByCanonical.has(key);
    const hadMerge = group.entries.some((e) => e.merge_with_existing_id);
    const locationId = await upsertCanonicalLocation(
      supabase,
      projectId,
      group,
      existingLocations,
      locationByCanonical
    );
    canonicalToId.set(key, locationId);
    locationByCanonical.set(key, {
      id: locationId,
      project_id: projectId,
      name: group.canonical_name,
      canonical_name: group.canonical_name,
      address: "",
      maps_link: "",
      parking_notes: "",
      access_notes: "",
      production_notes: "",
      created_at: new Date().toISOString(),
    });

    if (hadExisting || hadMerge) updated += 1;
    else created += 1;
  }

  let linked = 0;
  const linkedSceneIds = new Set<string>();

  for (const scene of allScenes) {
    const raw = scene.location?.trim();
    if (!raw) continue;

    const parsed = parseMainSubLocation(raw);
    const canonical = parsed.canonical_name;
    if (!canonical) continue;

    const key = normalizeLocationKey(canonical);
    let locationId = canonicalToId.get(key);

    if (!locationId) {
      const locType = inferLocationType(
        canonical,
        parsed.sub_location,
        scene.int_ext ?? ""
      );
      const { data, error } = await supabase
        .from("locations")
        .insert({
          project_id: projectId,
          name: canonical,
          canonical_name: canonical,
          sub_location: "",
          location_type: locType,
          status: "scouting",
          source: "script_breakdown",
          address: "",
          maps_link: "",
          parking_notes: "",
          access_notes: `Type: ${locationTypeLabel(locType)}`,
          production_notes: "",
          metadata: {},
          scene_count: 0,
        })
        .select("id")
        .single();
      if (error) throw error;
      const createdId = data?.id;
      if (!createdId) throw new Error("Save locations: created location missing id");
      locationId = createdId;
      canonicalToId.set(key, createdId);
      created += 1;
    }

    if (!locationId) continue;

    await insertSceneLocationLink(supabase, {
      project_id: projectId,
      scene_id: scene.id,
      location_id: locationId,
      sub_location: parsed.sub_location || null,
    });
    linkedSceneIds.add(scene.id);
    linked += 1;
  }

  for (const [key, locationId] of canonicalToId) {
    const sceneCount = allScenes.filter((scene) => {
      const parsed = parseMainSubLocation(scene.location);
      return normalizeLocationKey(parsed.canonical_name) === key;
    }).length;

    const group = groups.get(key);
    const metadata = group
      ? {
          sub_locations: group.entries
            .filter((e) => e.sub_location)
            .map((e) => ({
              name: e.sub_location,
              scenes: allScenes
                .filter((s) => {
                  const p = parseMainSubLocation(s.location);
                  return (
                    normalizeLocationKey(p.canonical_name) === key &&
                    p.sub_location === e.sub_location
                  );
                })
                .map((s) => s.scene_number),
            })),
          linked_scene_numbers: allScenes
            .filter((s) => {
              const p = parseMainSubLocation(s.location);
              return normalizeLocationKey(p.canonical_name) === key;
            })
            .map((s) => s.scene_number),
        }
      : {};

    await supabase
      .from("locations")
      .update({
        scene_count: sceneCount,
        metadata,
      })
      .eq("id", locationId);
  }

  return { created, updated, linked };
}
