import {
  inferLocationType,
  normalizeLocationKey,
  parseMainSubLocation,
  type LocationMetadata,
} from "@/lib/locations/normalization";
import { insertSceneLocationLink } from "@/lib/supabase/data";
import type { Location, Scene } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RebuildSummary = {
  activeLocations: number;
  archivedSuggestions: number;
  sceneLinksRebuilt: number;
  orphansArchived: number;
};

type CanonicalBuild = {
  canonical_name: string;
  location_type: string;
  sub_locations: Map<string, Set<string>>;
  scene_ids: Set<string>;
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

export async function rebuildLocationsFromScenes(
  supabase: SupabaseClient,
  projectId: string
): Promise<RebuildSummary> {
  const summary: RebuildSummary = {
    activeLocations: 0,
    archivedSuggestions: 0,
    sceneLinksRebuilt: 0,
    orphansArchived: 0,
  };

  const [scenesRes, locsRes] = await Promise.all([
    supabase.from("scenes").select("*").eq("project_id", projectId),
    supabase.from("locations").select("*").eq("project_id", projectId),
  ]);

  if (scenesRes.error) throw scenesRes.error;
  if (locsRes.error) throw locsRes.error;

  const scenes = (scenesRes.data ?? []) as Scene[];
  let locations = (locsRes.data ?? []) as Location[];

  const canonicalBuilds = new Map<string, CanonicalBuild>();

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
    const build = canonicalBuilds.get(key) ?? {
      canonical_name: canonical,
      location_type: inferLocationType(
        canonical,
        sub,
        scene.int_ext ?? ""
      ),
      sub_locations: new Map<string, Set<string>>(),
      scene_ids: new Set<string>(),
    };

    build.scene_ids.add(scene.id);
    if (sub) {
      const subSet = build.sub_locations.get(sub) ?? new Set<string>();
      subSet.add(scene.scene_number);
      build.sub_locations.set(sub, subSet);
    }

    canonicalBuilds.set(key, build);
  }

  const canonicalToId = new Map<string, string>();

  for (const loc of locations) {
    if (loc.status === "archived") continue;
    const key = normalizeLocationKey(loc.canonical_name || loc.name);
    if (key && !canonicalToId.has(key) && loc.status !== "suggestion") {
      canonicalToId.set(key, loc.id);
    }
  }

  for (const [key, build] of canonicalBuilds) {
    let locationId = canonicalToId.get(key);

    const metadata: LocationMetadata = {
      linked_scene_numbers: scenes
        .filter((s) => build.scene_ids.has(s.id))
        .map((s) => s.scene_number),
      sub_locations: [...build.sub_locations.entries()].map(([name, nums]) => ({
        name,
        scenes: [...nums],
      })),
    };

    if (!locationId) {
      const { data, error } = await supabase
        .from("locations")
        .insert({
          project_id: projectId,
          name: build.canonical_name,
          canonical_name: build.canonical_name,
          sub_location: "",
          location_type: build.location_type,
          status: "scouting",
          source: "rebuild",
          address: "",
          maps_link: "",
          parking_notes: "",
          access_notes: "",
          production_notes: "",
          metadata,
          scene_count: build.scene_ids.size,
        })
        .select("id")
        .single();
      if (error) throw error;
      const createdId = data?.id;
      if (!createdId) throw new Error("Rebuild: missing location id");
      locationId = createdId;
      locations.push({
        id: createdId,
        project_id: projectId,
        name: build.canonical_name,
        canonical_name: build.canonical_name,
        address: "",
        maps_link: "",
        parking_notes: "",
        access_notes: "",
        production_notes: "",
        status: "scouting",
        source: "rebuild",
        metadata,
        created_at: new Date().toISOString(),
      });
    } else {
      await supabase
        .from("locations")
        .update({
          canonical_name: build.canonical_name,
          name: build.canonical_name,
          location_type: build.location_type,
          status: "scouting",
          metadata,
          scene_count: build.scene_ids.size,
        })
        .eq("id", locationId);
    }

    const resolvedId = locationId;
    if (!resolvedId) continue;
    canonicalToId.set(key, resolvedId);
  }

  await supabase
    .from("scene_locations")
    .delete()
    .eq("project_id", projectId);

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

    const locationId = canonicalToId.get(normalizeLocationKey(canonical));
    if (!locationId) continue;

    await insertSceneLocationLink(supabase, {
      project_id: projectId,
      scene_id: scene.id,
      location_id: locationId,
      sub_location: sub || null,
    });
    summary.sceneLinksRebuilt += 1;
  }

  for (const loc of locations) {
    if (loc.status === "suggestion") {
      await supabase
        .from("locations")
        .update({
          status: "archived",
          metadata: {
            ...(loc.metadata ?? {}),
            rebuild_archived: true,
            archived_at: new Date().toISOString(),
          },
        })
        .eq("id", loc.id);
      summary.archivedSuggestions += 1;
      continue;
    }

    if (loc.status === "archived") continue;

    const key = normalizeLocationKey(loc.canonical_name || loc.name);
    const keeperId = canonicalToId.get(key);
    const inSceneBuild = canonicalBuilds.has(key);

    if ((keeperId && keeperId !== loc.id) || (!inSceneBuild && loc.source !== "manual")) {
      await supabase
        .from("locations")
        .update({
          status: "archived",
          metadata: {
            ...(loc.metadata ?? {}),
            rebuild_archived: true,
            merged_into: keeperId ?? undefined,
            orphan: !inSceneBuild,
          },
        })
        .eq("id", loc.id);
      summary.orphansArchived += 1;
    }
  }

  summary.activeLocations = canonicalBuilds.size;

  return summary;
}
