import {
  normalizeSceneKey,
  proSceneToInsertRow,
  type ProBreakdownCharacter,
  type ProBreakdownDepartment,
  type ProBreakdownLocation,
  type ProBreakdownResult,
  type ProBreakdownScene,
} from "@/lib/ai/script-breakdown-pro";
import { saveLocationSuggestions } from "@/lib/locations/save-suggestions";
import type { CastCrew, Location, Scene } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SaveBreakdownOptions = {
  createScenes: boolean;
  updateExistingScenes: boolean;
  createCharacters: boolean;
  createLocations: boolean;
  applyDepartmentNotes: boolean;
};

export type SaveBreakdownSummary = {
  scenesSaved: number;
  scenesUpdated: number;
  scenesSkipped: number;
  charactersCreated: number;
  locationsCreated: number;
  locationSuggestionsSaved: number;
  departmentNotesApplied: number;
};

function castRoleLabel(type: ProBreakdownCharacter["suggested_cast_type"]): string {
  const map: Record<string, string> = {
    principal: "Principal",
    supporting: "Supporting",
    extra: "Extra",
    unknown: "Character",
  };
  return map[type] ?? "Character";
}

function appendNote(existing: string, addition: string): string {
  const trimmed = addition.trim();
  if (!trimmed) return existing;
  if (!existing.trim()) return trimmed;
  if (existing.includes(trimmed)) return existing;
  return `${existing}\n${trimmed}`;
}

function applyDepartmentNotesToScenes(
  scenes: ProBreakdownScene[],
  departments: ProBreakdownDepartment[]
): ProBreakdownScene[] {
  if (departments.length === 0) return scenes;

  return scenes.map((scene) => {
    const key = normalizeSceneKey(scene.scene_number);
    const notes: string[] = [];
    for (const dept of departments) {
      const matches = dept.related_scenes.some(
        (s) => normalizeSceneKey(s) === key
      );
      if (matches && dept.notes.trim()) {
        notes.push(`[${dept.department}] ${dept.notes.trim()}`);
      }
    }
    if (notes.length === 0) return scene;
    return {
      ...scene,
      department_notes: appendNote(scene.department_notes, notes.join("\n")),
    };
  });
}

export async function saveBreakdownToProjectDb(
  supabase: SupabaseClient,
  projectId: string,
  breakdown: ProBreakdownResult,
  options: SaveBreakdownOptions,
  existing: {
    scenes: Scene[];
    castCrew: CastCrew[];
    locations: Location[];
  }
): Promise<SaveBreakdownSummary> {
  const summary: SaveBreakdownSummary = {
    scenesSaved: 0,
    scenesUpdated: 0,
    scenesSkipped: 0,
    charactersCreated: 0,
    locationsCreated: 0,
    locationSuggestionsSaved: 0,
    departmentNotesApplied: 0,
  };

  let scenesToSave = [...breakdown.scenes];
  if (options.applyDepartmentNotes) {
    scenesToSave = applyDepartmentNotesToScenes(
      scenesToSave,
      breakdown.departments
    );
    summary.departmentNotesApplied = breakdown.departments.filter((d) =>
      d.notes.trim()
    ).length;
  }

  const sceneByNumber = new Map(
    existing.scenes.map((s) => [normalizeSceneKey(s.scene_number), s])
  );

  if (options.createScenes) {
    for (const scene of scenesToSave) {
      const key = normalizeSceneKey(scene.scene_number);
      if (!key || key === "—") continue;

      const existingScene = sceneByNumber.get(key);
      const row = proSceneToInsertRow(projectId, scene);

      if (existingScene) {
        if (!options.updateExistingScenes) {
          summary.scenesSkipped += 1;
          continue;
        }
        const { error } = await supabase
          .from("scenes")
          .update({
            int_ext: row.int_ext,
            day_night: row.day_night,
            location: row.location,
            short_description: row.short_description,
            characters: row.characters,
            props: row.props,
            costumes: row.costumes,
            vfx: row.vfx,
            stunts: row.stunts,
            vehicles: row.vehicles,
            animals: row.animals,
            special_requirements: row.special_requirements,
            complexity: row.complexity,
            production_notes: row.production_notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingScene.id);
        if (error) throw error;
        summary.scenesUpdated += 1;
      } else {
        const { error } = await supabase.from("scenes").insert(row);
        if (error) throw error;
        summary.scenesSaved += 1;
      }
    }
  }

  const castNames = new Set(
    existing.castCrew.map((c) => normalizeSceneKey(c.full_name))
  );

  if (options.createCharacters) {
    for (const character of breakdown.characters) {
      const name = character.name.trim();
      if (!name) continue;
      const key = normalizeSceneKey(name);
      if (castNames.has(key)) continue;

      const { error } = await supabase.from("cast_crew").insert({
        project_id: projectId,
        full_name: name,
        role: castRoleLabel(character.suggested_cast_type),
        department: "Cast",
        phone: "",
        email: "",
        call_time: "07:00",
        permission_level: "viewer",
        status: "pending",
      });
      if (error) throw error;
      castNames.add(key);
      summary.charactersCreated += 1;
    }
  }

  if (options.createLocations) {
    const locSummary = await saveLocationSuggestions(
      supabase,
      projectId,
      breakdown,
      existing.locations
    );
    summary.locationSuggestionsSaved = locSummary.created + locSummary.updated;
    summary.locationsCreated = 0;
  }

  return summary;
}

export function formatSaveSummary(summary: SaveBreakdownSummary): string {
  const parts = [
    `${summary.scenesSaved} scene${summary.scenesSaved === 1 ? "" : "s"} saved`,
    summary.scenesUpdated > 0
      ? `${summary.scenesUpdated} updated`
      : null,
    summary.scenesSkipped > 0
      ? `${summary.scenesSkipped} skipped (already exist)`
      : null,
    `${summary.charactersCreated} character${summary.charactersCreated === 1 ? "" : "s"} created`,
    summary.locationSuggestionsSaved > 0
      ? `${summary.locationSuggestionsSaved} location suggestion${summary.locationSuggestionsSaved === 1 ? "" : "s"} saved`
      : null,
    summary.departmentNotesApplied > 0
      ? `${summary.departmentNotesApplied} department notes applied`
      : null,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}
