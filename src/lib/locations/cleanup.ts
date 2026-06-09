import {
  normalizeLocationKey,
  parseMainSubLocation,
} from "@/lib/locations/normalization";
import { isAiGeneratedLocation, isManualLocation } from "@/lib/locations/location-status";
import { uniqueSceneCountForCanonical } from "@/lib/locations/scene-counts";
import type { Location, Scene } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CleanupSummary = {
  archivedOrphans: number;
  mergedDuplicates: number;
  movedToSuggestions: number;
  countsUpdated: number;
};

async function countSceneLinks(
  supabase: SupabaseClient,
  locationId: string
): Promise<number> {
  const { count } = await supabase
    .from("scene_locations")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId);
  return count ?? 0;
}

export async function cleanupGeneratedLocations(
  supabase: SupabaseClient,
  projectId: string,
  scenes: Scene[]
): Promise<CleanupSummary> {
  const summary: CleanupSummary = {
    archivedOrphans: 0,
    mergedDuplicates: 0,
    movedToSuggestions: 0,
    countsUpdated: 0,
  };

  const { data: locRows, error } = await supabase
    .from("locations")
    .select("*")
    .eq("project_id", projectId);

  if (error) throw error;
  const locations = (locRows ?? []) as Location[];

  for (const loc of locations) {
    if (loc.status === "archived") continue;

    const linkCount = await countSceneLinks(supabase, loc.id);
    const textCount = uniqueSceneCountForCanonical(
      loc.canonical_name || loc.name,
      locations,
      scenes
    );
    const realCount = Math.max(linkCount, textCount);

    if (
      isAiGeneratedLocation(loc) &&
      !isManualLocation(loc) &&
      realCount === 0 &&
      loc.status !== "suggestion"
    ) {
      await supabase
        .from("locations")
        .update({
          status: "suggestion",
          scene_count: 0,
          metadata: {
            ...(loc.metadata ?? {}),
            cleanup_reason: "orphan_ai_location",
          },
        })
        .eq("id", loc.id);
      summary.movedToSuggestions += 1;
      continue;
    }

    if (
      isAiGeneratedLocation(loc) &&
      !isManualLocation(loc) &&
      realCount === 0 &&
      loc.status === "suggestion"
    ) {
      await supabase
        .from("locations")
        .update({
          status: "archived",
          metadata: {
            ...(loc.metadata ?? {}),
            cleanup_reason: "ignored_orphan",
          },
        })
        .eq("id", loc.id);
      summary.archivedOrphans += 1;
    }
  }

  const activeByCanonical = new Map<string, Location[]>();
  for (const loc of locations) {
    if (loc.status === "archived" || loc.status === "suggestion") continue;
    const key = normalizeLocationKey(loc.canonical_name || loc.name);
    if (!key) continue;
    const list = activeByCanonical.get(key) ?? [];
    list.push(loc);
    activeByCanonical.set(key, list);
  }

  for (const [, group] of activeByCanonical) {
    if (group.length < 2) continue;

    const ranked = [...group].sort((a, b) => {
      const aLinks = uniqueSceneCountForCanonical(
        a.canonical_name || a.name,
        locations,
        scenes
      );
      const bLinks = uniqueSceneCountForCanonical(
        b.canonical_name || b.name,
        locations,
        scenes
      );
      if (bLinks !== aLinks) return bLinks - aLinks;
      if (isManualLocation(a) && !isManualLocation(b)) return -1;
      if (!isManualLocation(a) && isManualLocation(b)) return 1;
      return a.created_at.localeCompare(b.created_at);
    });

    const keeper = ranked[0];
    for (const dupe of ranked.slice(1)) {
      const { data: links } = await supabase
        .from("scene_locations")
        .select("scene_id, sub_location")
        .eq("location_id", dupe.id);

      for (const link of links ?? []) {
        const { error: linkError } = await supabase
          .from("scene_locations")
          .insert({
            project_id: projectId,
            scene_id: link.scene_id,
            location_id: keeper.id,
            sub_location: link.sub_location,
          });
        if (linkError && !String(linkError.message).includes("duplicate")) {
          throw linkError;
        }
      }

      await supabase
        .from("locations")
        .update({
          status: "archived",
          metadata: {
            ...(dupe.metadata ?? {}),
            merged_into: keeper.id,
            merged_at: new Date().toISOString(),
            cleanup_reason: "duplicate_canonical",
          },
        })
        .eq("id", dupe.id);

      summary.mergedDuplicates += 1;
    }
  }

  const { data: refreshed } = await supabase
    .from("locations")
    .select("*")
    .eq("project_id", projectId)
    .not("status", "eq", "archived");

  for (const loc of (refreshed ?? []) as Location[]) {
    const linkCount = await countSceneLinks(supabase, loc.id);
    const textCount = uniqueSceneCountForCanonical(
      loc.canonical_name || loc.name,
      (refreshed ?? []) as Location[],
      scenes
    );
    const count = Math.max(linkCount, textCount);

    const subLocations = new Map<string, string[]>();
    const { data: links } = await supabase
      .from("scene_locations")
      .select("scene_id, sub_location")
      .eq("location_id", loc.id);

    for (const link of links ?? []) {
      const sub = link.sub_location?.trim();
      if (!sub) continue;
      const scene = scenes.find((s) => s.id === link.scene_id);
      if (!scene) continue;
      if (!subLocations.has(sub)) subLocations.set(sub, []);
      subLocations.get(sub)!.push(scene.scene_number);
    }

    await supabase
      .from("locations")
      .update({
        scene_count: count,
        metadata: {
          ...(loc.metadata ?? {}),
          linked_scene_numbers: scenes
            .filter((s) =>
              (links ?? []).some((l) => l.scene_id === s.id)
            )
            .map((s) => s.scene_number),
          sub_locations: [...subLocations.entries()].map(([name, sceneNums]) => ({
            name,
            scenes: [...new Set(sceneNums)],
          })),
        },
      })
      .eq("id", loc.id);

    summary.countsUpdated += 1;
  }

  return summary;
}
