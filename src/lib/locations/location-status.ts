import { uniqueSceneCountForCanonical } from "@/lib/locations/scene-counts";
import { normalizeLocationKey } from "@/lib/locations/normalization";
import type { Location, Scene } from "@/lib/types";

const AI_SOURCES = new Set(["script_breakdown", "backfill", "ai", "rebuild"]);

export function isArchivedLocation(loc: Location): boolean {
  return loc.status === "archived";
}

export function isSuggestionLocation(loc: Location): boolean {
  return loc.status === "suggestion";
}

export function isManualLocation(loc: Location): boolean {
  return loc.source === "manual" || !loc.source;
}

export function isAiGeneratedLocation(loc: Location): boolean {
  return AI_SOURCES.has(loc.source ?? "");
}

export function sceneCountForLocation(
  loc: Location,
  allLocations: Location[],
  scenes: Scene[]
): number {
  return uniqueSceneCountForCanonical(
    loc.canonical_name || loc.name,
    allLocations.filter(
      (l) =>
        normalizeLocationKey(l.canonical_name || l.name) ===
        normalizeLocationKey(loc.canonical_name || loc.name)
    ),
    scenes
  );
}

/** Active production location: not archived/suggestion, and has scenes OR was created manually. */
export function isActiveOperationalLocation(
  loc: Location,
  sceneCount: number
): boolean {
  if (isArchivedLocation(loc) || isSuggestionLocation(loc)) return false;
  if (isManualLocation(loc)) return true;
  return sceneCount > 0;
}

/** Sub-only rows should not appear as main location cards when parent canonical exists. */
export function isOrphanSubLocationRow(
  loc: Location,
  allLocations: Location[],
  scenes: Scene[]
): boolean {
  const sub = loc.sub_location?.trim();
  if (!sub) return false;

  const canonical = loc.canonical_name || loc.name;
  const canonicalKey = normalizeLocationKey(canonical);
  const subKey = normalizeLocationKey(sub);

  if (canonicalKey === subKey) return true;

  const hasParent = allLocations.some((other) => {
    if (other.id === loc.id || isArchivedLocation(other)) return false;
    const otherCanonical = normalizeLocationKey(
      other.canonical_name || other.name
    );
    if (otherCanonical === canonicalKey) return false;
    return scenes.some((scene) => {
      const raw = scene.location?.trim();
      if (!raw) return false;
      return raw.toLowerCase().includes(otherCanonical) && raw.toLowerCase().includes(subKey);
    });
  });

  return hasParent;
}

export function filterActiveOperationalLocations(
  locations: Location[],
  scenes: Scene[]
): Location[] {
  return locations.filter((loc) => {
    const count = sceneCountForLocation(loc, locations, scenes);
    if (!isActiveOperationalLocation(loc, count)) return false;
    if (isOrphanSubLocationRow(loc, locations, scenes)) return false;
    return true;
  });
}
