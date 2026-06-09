import { normalizeSceneKey } from "@/lib/ai/script-breakdown-pro";
import {
  inferLocationType,
  normalizeLocationKey,
  parseMainSubLocation,
  type LocationMetadata,
} from "@/lib/locations/normalization";
import { insertSceneLocationLink } from "@/lib/supabase/data";
import type { Location, Scene } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

async function linkScenesToLocation(
  supabase: SupabaseClient,
  projectId: string,
  locationId: string,
  scenes: Scene[],
  sceneNumbers: string[],
  defaultSub?: string
): Promise<number> {
  const keys = new Set(sceneNumbers.map(normalizeSceneKey));
  let linked = 0;

  for (const scene of scenes) {
    if (!keys.has(normalizeSceneKey(scene.scene_number))) continue;
    const parsed = parseMainSubLocation(scene.location);
    const sub = parsed.sub_location || defaultSub || null;

    await insertSceneLocationLink(supabase, {
      project_id: projectId,
      scene_id: scene.id,
      location_id: locationId,
      sub_location: sub,
    });
    linked += 1;
  }

  return linked;
}

async function refreshLocationCounts(
  supabase: SupabaseClient,
  locationId: string,
  scenes: Scene[]
): Promise<void> {
  const { data: links } = await supabase
    .from("scene_locations")
    .select("scene_id, sub_location")
    .eq("location_id", locationId);

  const sceneIds = new Set((links ?? []).map((l) => l.scene_id));
  const linkedScenes = scenes.filter((s) => sceneIds.has(s.id));
  const subMap = new Map<string, string[]>();

  for (const link of links ?? []) {
    const sub = link.sub_location?.trim();
    if (!sub) continue;
    const scene = scenes.find((s) => s.id === link.scene_id);
    if (!scene) continue;
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub)!.push(scene.scene_number);
  }

  const metadata: LocationMetadata = {
    linked_scene_numbers: linkedScenes.map((s) => s.scene_number),
    sub_locations: [...subMap.entries()].map(([name, sceneNums]) => ({
      name,
      scenes: [...new Set(sceneNums)],
    })),
  };

  await supabase
    .from("locations")
    .update({
      scene_count: sceneIds.size,
      metadata,
    })
    .eq("id", locationId);
}

export async function approveLocationSuggestion(
  supabase: SupabaseClient,
  projectId: string,
  suggestionId: string,
  scenes: Scene[]
): Promise<{ locationId: string; linksCreated: number }> {
  const { data: suggestion, error } = await supabase
    .from("locations")
    .select("*")
    .eq("id", suggestionId)
    .eq("project_id", projectId)
    .single();

  if (error) throw error;
  if (suggestion.status !== "suggestion") {
    throw new Error("Location is not a suggestion");
  }

  const sceneNumbers =
    (suggestion.metadata?.linked_scene_numbers as string[] | undefined) ?? [];

  const { error: updateError } = await supabase
    .from("locations")
    .update({
      status: "scouting",
      source: "manual",
      metadata: {
        ...(suggestion.metadata ?? {}),
        approved_at: new Date().toISOString(),
      },
    })
    .eq("id", suggestionId);

  if (updateError) throw updateError;

  const linksCreated = await linkScenesToLocation(
    supabase,
    projectId,
    suggestionId,
    scenes,
    sceneNumbers
  );

  await refreshLocationCounts(supabase, suggestionId, scenes);

  return { locationId: suggestionId, linksCreated };
}

export async function mergeLocationSuggestion(
  supabase: SupabaseClient,
  projectId: string,
  suggestionId: string,
  targetLocationId: string,
  scenes: Scene[]
): Promise<{ linksCreated: number }> {
  const [{ data: suggestion }, { data: target }] = await Promise.all([
    supabase
      .from("locations")
      .select("*")
      .eq("id", suggestionId)
      .eq("project_id", projectId)
      .single(),
    supabase
      .from("locations")
      .select("*")
      .eq("id", targetLocationId)
      .eq("project_id", projectId)
      .single(),
  ]);

  if (!suggestion || !target) throw new Error("Suggestion or target not found");
  if (suggestion.status !== "suggestion") {
    throw new Error("Location is not a suggestion");
  }

  const sceneNumbers =
    (suggestion.metadata?.linked_scene_numbers as string[] | undefined) ?? [];

  const linksCreated = await linkScenesToLocation(
    supabase,
    projectId,
    targetLocationId,
    scenes,
    sceneNumbers
  );

  await supabase
    .from("locations")
    .update({
      status: "archived",
      metadata: {
        ...(suggestion.metadata ?? {}),
        merged_into: targetLocationId,
        merged_at: new Date().toISOString(),
      },
    })
    .eq("id", suggestionId);

  await refreshLocationCounts(supabase, targetLocationId, scenes);

  return { linksCreated };
}

export async function ignoreLocationSuggestion(
  supabase: SupabaseClient,
  projectId: string,
  suggestionId: string
): Promise<void> {
  const { error } = await supabase
    .from("locations")
    .update({
      status: "archived",
      metadata: {
        ignored: true,
        archived_at: new Date().toISOString(),
      },
    })
    .eq("id", suggestionId)
    .eq("project_id", projectId)
    .eq("status", "suggestion");

  if (error) throw error;
}
