import { normalizeSceneKey } from "@/lib/ai/script-breakdown-pro";
import {
  buildDisplayName,
  inferLocationType,
  normalizeLocationKey,
  parseMainSubLocation,
  type LocationMetadata,
} from "@/lib/locations/normalization";
import { insertSceneLocationLink } from "@/lib/supabase/data";
import type { Location, Scene } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BackfillSummary = {
  locationsMerged: number;
  locationsCreated: number;
  locationsUpdated: number;
  sceneLinksCreated: number;
  orphansResolved: number;
};

function findParentCanonicalForOrphanSub(
  subName: string,
  scenes: Scene[]
): string | null {
  const subKey = normalizeLocationKey(subName);
  const parents = new Set<string>();

  for (const scene of scenes) {
    const parsed = parseMainSubLocation(scene.location);
    if (
      parsed.sub_location &&
      normalizeLocationKey(parsed.sub_location) === subKey &&
      parsed.canonical_name
    ) {
      parents.add(parsed.canonical_name);
    }
  }

  if (parents.size === 1) return [...parents][0];
  return null;
}

export async function backfillProjectLocations(
  supabase: SupabaseClient,
  projectId: string
): Promise<BackfillSummary> {
  const summary: BackfillSummary = {
    locationsMerged: 0,
    locationsCreated: 0,
    locationsUpdated: 0,
    sceneLinksCreated: 0,
    orphansResolved: 0,
  };

  const [scenesRes, locsRes, linksRes] = await Promise.all([
    supabase.from("scenes").select("*").eq("project_id", projectId),
    supabase.from("locations").select("*").eq("project_id", projectId),
    supabase
      .from("scene_locations")
      .select("scene_id, location_id, sub_location")
      .eq("project_id", projectId),
  ]);

  if (scenesRes.error) throw scenesRes.error;
  if (locsRes.error) throw locsRes.error;
  if (linksRes.error && !String(linksRes.error.message).includes("does not exist")) {
    throw linksRes.error;
  }

  const scenes = (scenesRes.data ?? []) as Scene[];
  let locations = (locsRes.data ?? []) as Location[];
  const existingLinks = linksRes.data ?? [];

  const canonicalToLocationId = new Map<string, string>();

  const resolveCanonicalId = (canonical: string): string | null => {
    const key = normalizeLocationKey(canonical);
    return canonicalToLocationId.get(key) ?? null;
  };

  const registerLocation = (loc: Location) => {
    const key = normalizeLocationKey(loc.canonical_name || loc.name);
    if (!canonicalToLocationId.has(key)) {
      canonicalToLocationId.set(key, loc.id);
    }
  };

  for (const loc of locations) {
    registerLocation(loc);
  }

  for (const loc of [...locations]) {
    const parsed = parseMainSubLocation(loc.canonical_name || loc.name);
    const canonical = parsed.canonical_name;
    const sub = parsed.sub_location || loc.sub_location || "";

    if (
      !sub &&
      parsed.canonical_name &&
      normalizeLocationKey(parsed.canonical_name) !==
        normalizeLocationKey(loc.canonical_name || loc.name)
    ) {
      /* parsed from full name */
    }

    let targetCanonical = canonical;
    if (!sub && canonical.split(" ").length <= 2) {
      const parent = findParentCanonicalForOrphanSub(canonical, scenes);
      if (parent) {
        targetCanonical = parent;
        summary.orphansResolved += 1;
      }
    }

    const targetKey = normalizeLocationKey(targetCanonical);
    let targetId = canonicalToLocationId.get(targetKey);

    if (!targetId) {
      const locType = inferLocationType(targetCanonical, sub, "");
      const { data, error } = await supabase
        .from("locations")
        .insert({
          project_id: projectId,
          name: buildDisplayName(targetCanonical, sub || null),
          canonical_name: targetCanonical,
          sub_location: sub,
          location_type: locType,
          status: "scouting",
          source: "backfill",
          address: "",
          maps_link: "",
          parking_notes: "",
          access_notes: "",
          production_notes: loc.production_notes ?? "",
          metadata: {},
        })
        .select("*")
        .single();
      if (error) throw error;
      const createdId = data?.id;
      if (!createdId) throw new Error("Backfill: created location missing id");
      targetId = createdId;
      locations.push(data as Location);
      canonicalToLocationId.set(targetKey, createdId);
      summary.locationsCreated += 1;
      continue;
    }

    if (
      targetId &&
      loc.id !== targetId &&
      normalizeLocationKey(loc.canonical_name || loc.name) !== targetKey
    ) {
      for (const link of existingLinks) {
        if (link.location_id === loc.id) {
          await supabase
            .from("scene_locations")
            .update({ location_id: targetId })
            .eq("scene_id", link.scene_id)
            .eq("location_id", loc.id);
        }
      }

      await supabase
        .from("locations")
        .update({
          status: "archived",
          metadata: {
            ...(loc.metadata ?? {}),
            merged_into: targetId,
            merged_at: new Date().toISOString(),
          },
        })
        .eq("id", loc.id);

      summary.locationsMerged += 1;
    }
  }

  locations = locations.filter((l) => l.status !== "archived");

  for (const scene of scenes) {
    const raw = scene.location?.trim();
    if (!raw) continue;

    const parsed = parseMainSubLocation(raw);
    let canonical = parsed.canonical_name;
    let sub = parsed.sub_location;

    if (!sub) {
      const parent = findParentCanonicalForOrphanSub(canonical, scenes);
      if (parent && parent !== canonical) {
        sub = canonical;
        canonical = parent;
      }
    }

    const key = normalizeLocationKey(canonical);
    let locationId = canonicalToLocationId.get(key);

    if (!locationId) {
      const locType = inferLocationType(
        canonical,
        sub,
        scene.int_ext ?? ""
      );
      const { data, error } = await supabase
        .from("locations")
        .insert({
          project_id: projectId,
          name: buildDisplayName(canonical, sub || null),
          canonical_name: canonical,
          sub_location: sub,
          location_type: locType,
          status: "scouting",
          source: "backfill",
          address: "",
          maps_link: "",
          parking_notes: "",
          access_notes: `Type: ${locType}`,
          production_notes: "",
          metadata: { linked_scene_numbers: [scene.scene_number] },
        })
        .select("*")
        .single();
      if (error) throw error;
      const createdId = data?.id;
      if (!createdId) throw new Error("Backfill: created location missing id");
      locationId = createdId;
      locations.push(data as Location);
      canonicalToLocationId.set(key, createdId);
      summary.locationsCreated += 1;
    }

    if (!locationId) continue;

    try {
      await insertSceneLocationLink(supabase, {
        project_id: projectId,
        scene_id: scene.id,
        location_id: locationId,
        sub_location: sub || null,
      });
      summary.sceneLinksCreated += 1;
    } catch {
      /* duplicate link */
    }
  }

  const sceneCountByCanonical = new Map<string, Set<string>>();
  const subLocationsByCanonical = new Map<
    string,
    Map<string, { scenes: string[] }>
  >();

  const { data: allLinks } = await supabase
    .from("scene_locations")
    .select("scene_id, location_id, sub_location")
    .eq("project_id", projectId);

  const locById = new Map(locations.map((l) => [l.id, l]));

  for (const link of allLinks ?? []) {
    const loc = locById.get(link.location_id);
    if (!loc || loc.status === "archived") continue;

    const canonical = loc.canonical_name || loc.name;
    const cKey = normalizeLocationKey(canonical);

    if (!sceneCountByCanonical.has(cKey)) {
      sceneCountByCanonical.set(cKey, new Set());
    }
    sceneCountByCanonical.get(cKey)!.add(link.scene_id);

    const sub = link.sub_location || loc.sub_location || "";
    if (sub) {
      if (!subLocationsByCanonical.has(cKey)) {
        subLocationsByCanonical.set(cKey, new Map());
      }
      const subMap = subLocationsByCanonical.get(cKey)!;
      if (!subMap.has(sub)) subMap.set(sub, { scenes: [] });
      const scene = scenes.find((s) => s.id === link.scene_id);
      if (scene) subMap.get(sub)!.scenes.push(scene.scene_number);
    }
  }

  for (const [cKey, sceneIds] of sceneCountByCanonical) {
    const locationId = canonicalToLocationId.get(cKey);
    if (!locationId) continue;

    const subMap = subLocationsByCanonical.get(cKey);
    const metadata: LocationMetadata = {
      linked_scene_numbers: scenes
        .filter((s) => sceneIds.has(s.id))
        .map((s) => s.scene_number),
      sub_locations: subMap
        ? [...subMap.entries()].map(([name, data]) => ({
            name,
            scenes: [...new Set(data.scenes)],
          }))
        : [],
    };

    const { error } = await supabase
      .from("locations")
      .update({
        scene_count: sceneIds.size,
        metadata,
        canonical_name:
          locById.get(locationId)?.canonical_name ||
          locById.get(locationId)?.name,
      })
      .eq("id", locationId);

    if (!error) summary.locationsUpdated += 1;
  }

  return summary;
}
