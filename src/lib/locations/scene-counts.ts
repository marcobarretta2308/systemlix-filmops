import { normalizeSceneKey } from "@/lib/ai/script-breakdown-pro";
import {
  normalizeLocationKey,
  parseMainSubLocation,
} from "@/lib/locations/normalization";
import type { Location, Scene } from "@/lib/types";

export type SceneLocationLink = {
  scene_id: string;
  location_id: string;
  sub_location?: string | null;
};

export function sceneMatchesLocation(scene: Scene, loc: Location): boolean {
  const raw = scene.location?.trim();
  if (!raw) return false;

  const parsed = parseMainSubLocation(raw);
  const locCanonical = normalizeLocationKey(loc.canonical_name || loc.name);
  const parsedCanonical = normalizeLocationKey(parsed.canonical_name);
  const rawKey = normalizeLocationKey(raw);
  const locNameKey = normalizeLocationKey(loc.name);

  if (parsedCanonical && locCanonical && parsedCanonical === locCanonical) {
    return true;
  }
  if (rawKey === locNameKey || rawKey === locCanonical) {
    return true;
  }
  if (loc.sub_location) {
    const subKey = normalizeLocationKey(loc.sub_location);
    if (parsed.sub_location && normalizeLocationKey(parsed.sub_location) === subKey) {
      return parsedCanonical === locCanonical || !locCanonical;
    }
  }

  const linked = loc.metadata?.linked_scene_numbers ?? [];
  if (linked.includes(scene.scene_number)) return true;

  return false;
}

export function computeSceneCountsByLocationId(
  locations: Location[],
  scenes: Scene[],
  links: SceneLocationLink[] = []
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const loc of locations) {
    counts.set(loc.id, 0);
  }

  const linkedSceneIds = new Set<string>();
  for (const link of links) {
    linkedSceneIds.add(link.scene_id);
    counts.set(link.location_id, (counts.get(link.location_id) ?? 0) + 1);
  }

  for (const scene of scenes) {
    if (linkedSceneIds.has(scene.id)) continue;
    for (const loc of locations) {
      if (sceneMatchesLocation(scene, loc)) {
        counts.set(loc.id, (counts.get(loc.id) ?? 0) + 1);
        break;
      }
    }
  }

  return counts;
}

export function computeGroupedSceneCounts(
  locations: Location[],
  scenes: Scene[],
  links: SceneLocationLink[] = []
): Map<string, number> {
  const byId = computeSceneCountsByLocationId(locations, scenes, links);
  const byCanonical = new Map<string, number>();

  for (const loc of locations) {
    const canonical = loc.canonical_name || loc.name;
    const key = normalizeLocationKey(canonical);
    const count = byId.get(loc.id) ?? 0;
    byCanonical.set(key, (byCanonical.get(key) ?? 0) + count);
  }

  return byCanonical;
}

export function scenesForLocation(
  loc: Location,
  scenes: Scene[],
  links: SceneLocationLink[] = []
): Scene[] {
  const linkSceneIds = new Set(
    links.filter((l) => l.location_id === loc.id).map((l) => l.scene_id)
  );

  return scenes.filter((scene) => {
    if (linkSceneIds.has(scene.id)) return true;
    return sceneMatchesLocation(scene, loc);
  });
}

export function uniqueSceneCountForCanonical(
  canonical: string,
  locations: Location[],
  scenes: Scene[],
  links: SceneLocationLink[] = []
): number {
  const keys = new Set(
    locations
      .filter(
        (l) =>
          normalizeLocationKey(l.canonical_name || l.name) ===
          normalizeLocationKey(canonical)
      )
      .map((l) => l.id)
  );

  const sceneIds = new Set<string>();
  for (const link of links) {
    if (keys.has(link.location_id)) sceneIds.add(link.scene_id);
  }
  for (const scene of scenes) {
    for (const loc of locations) {
      if (!keys.has(loc.id)) continue;
      if (sceneMatchesLocation(scene, loc)) {
        sceneIds.add(scene.id);
        break;
      }
    }
  }
  return sceneIds.size;
}

export function normalizeSceneNumberKey(sceneNumber: string): string {
  return normalizeSceneKey(sceneNumber);
}
