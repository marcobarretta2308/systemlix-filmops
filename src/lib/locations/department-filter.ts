import { sceneMatchesLocation } from "@/lib/locations/scene-counts";
import type { Location, Scene, ShootingDay } from "@/lib/types";

export function getDepartmentRelevantSceneIds(
  scenes: Scene[],
  department?: string | null
): Set<string> {
  const dept = department?.trim();
  const ids = new Set<string>();

  for (const scene of scenes) {
    if (!dept) {
      ids.add(scene.id);
      continue;
    }
    if (dept === "Costumi" && (scene.costumes?.length || scene.characters?.length)) {
      ids.add(scene.id);
    } else if (dept === "Props" && scene.props?.length) {
      ids.add(scene.id);
    } else if (dept === "Trucco" && scene.characters?.length) {
      ids.add(scene.id);
    } else if (dept === "Trasporti" && scene.vehicles?.length) {
      ids.add(scene.id);
    } else if (dept === "Location") {
      ids.add(scene.id);
    }
  }

  return ids;
}

export function filterLocationsForDepartmentUser(
  locations: Location[],
  scenes: Scene[],
  shootingDays: ShootingDay[],
  department?: string | null
): Location[] {
  const relevantSceneIds = getDepartmentRelevantSceneIds(scenes, department);
  const relevantScenes = scenes.filter((s) => relevantSceneIds.has(s.id));

  const shootingDayLocationIds = new Set(
    shootingDays
      .filter((d) =>
        d.selected_scene_ids.some((id) => relevantSceneIds.has(id))
      )
      .map((d) => d.location_id)
      .filter(Boolean)
  );

  return locations.filter((loc) => {
    if (loc.status === "archived" || loc.status === "suggestion") return false;
    if (shootingDayLocationIds.has(loc.id)) return true;
    return relevantScenes.some((scene) => sceneMatchesLocation(scene, loc));
  });
}
