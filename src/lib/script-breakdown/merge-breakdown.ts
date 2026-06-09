import {
  normalizeSceneKey,
  type ProBreakdownCharacter,
  type ProBreakdownCostume,
  type ProBreakdownDepartment,
  type ProBreakdownLocation,
  type ProBreakdownProp,
  type ProBreakdownResult,
  type ProBreakdownScene,
} from "@/lib/ai/script-breakdown-pro";
import type {
  BreakdownProcessingReport,
  ChunkProcessingSummary,
} from "@/lib/script-breakdown/types";

function mergeStringArrays(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = normalizeSceneKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function mergeScene(
  existing: ProBreakdownScene,
  incoming: ProBreakdownScene
): ProBreakdownScene {
  return {
    ...existing,
    slugline: existing.slugline || incoming.slugline,
    interior_exterior:
      existing.interior_exterior !== "UNKNOWN"
        ? existing.interior_exterior
        : incoming.interior_exterior,
    day_night:
      existing.day_night !== "UNKNOWN" ? existing.day_night : incoming.day_night,
    location: existing.location || incoming.location,
    short_description: existing.short_description || incoming.short_description,
    characters: mergeStringArrays(existing.characters, incoming.characters),
    props: mergeStringArrays(existing.props, incoming.props),
    costumes: mergeStringArrays(existing.costumes, incoming.costumes),
    vehicles: mergeStringArrays(existing.vehicles, incoming.vehicles),
    animals: mergeStringArrays(existing.animals, incoming.animals),
    vfx: mergeStringArrays(existing.vfx, incoming.vfx),
    stunts: mergeStringArrays(existing.stunts, incoming.stunts),
    special_equipment: mergeStringArrays(
      existing.special_equipment,
      incoming.special_equipment
    ),
    department_notes: [existing.department_notes, incoming.department_notes]
      .filter(Boolean)
      .join("\n"),
    production_warnings: mergeStringArrays(
      existing.production_warnings,
      incoming.production_warnings
    ),
    confidence_score: Math.max(
      existing.confidence_score ?? 0,
      incoming.confidence_score ?? 0
    ),
  };
}

function dedupeCharacters(chars: ProBreakdownCharacter[]): ProBreakdownCharacter[] {
  const map = new Map<string, ProBreakdownCharacter>();
  for (const char of chars) {
    const key = normalizeSceneKey(char.name);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, char);
      continue;
    }
    map.set(key, {
      ...existing,
      description: existing.description || char.description,
      scenes_present: mergeStringArrays(
        existing.scenes_present,
        char.scenes_present
      ),
      notes: [existing.notes, char.notes].filter(Boolean).join("\n"),
      confidence_score: Math.max(
        existing.confidence_score ?? 0,
        char.confidence_score ?? 0
      ),
    });
  }
  return [...map.values()];
}

function dedupeLocations(locs: ProBreakdownLocation[]): ProBreakdownLocation[] {
  const map = new Map<string, ProBreakdownLocation>();
  for (const loc of locs) {
    const key = normalizeSceneKey(loc.name);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, loc);
      continue;
    }
    map.set(key, {
      ...existing,
      type: existing.type !== "unknown" ? existing.type : loc.type,
      scenes: mergeStringArrays(existing.scenes, loc.scenes),
      notes: [existing.notes, loc.notes].filter(Boolean).join("\n"),
      confidence_score: Math.max(
        existing.confidence_score ?? 0,
        loc.confidence_score ?? 0
      ),
    });
  }
  return [...map.values()];
}

function dedupeDepartments(
  depts: ProBreakdownDepartment[]
): ProBreakdownDepartment[] {
  const map = new Map<string, ProBreakdownDepartment>();
  for (const dept of depts) {
    const key = normalizeSceneKey(dept.department);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, dept);
      continue;
    }
    map.set(key, {
      ...existing,
      notes: [existing.notes, dept.notes].filter(Boolean).join("\n"),
      related_scenes: mergeStringArrays(
        existing.related_scenes,
        dept.related_scenes
      ),
      priority:
        existing.priority === "critical" || dept.priority === "critical"
          ? "critical"
          : existing.priority === "high" || dept.priority === "high"
            ? "high"
            : existing.priority,
      confidence_score: Math.max(
        existing.confidence_score ?? 0,
        dept.confidence_score ?? 0
      ),
    });
  }
  return [...map.values()];
}

function dedupeProps(props: ProBreakdownProp[]): ProBreakdownProp[] {
  const map = new Map<string, ProBreakdownProp>();
  for (const prop of props) {
    const key = `${normalizeSceneKey(prop.name)}|${prop.scenes.join(",")}`;
    if (!map.has(key)) map.set(key, prop);
  }
  return [...map.values()];
}

function dedupeCostumes(costumes: ProBreakdownCostume[]): ProBreakdownCostume[] {
  const map = new Map<string, ProBreakdownCostume>();
  for (const costume of costumes) {
    const key = `${normalizeSceneKey(costume.character)}|${costume.scenes.join(",")}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, costume);
      continue;
    }
    map.set(key, {
      ...existing,
      costume_notes: [existing.costume_notes, costume.costume_notes]
        .filter(Boolean)
        .join("\n"),
      continuity_notes: [existing.continuity_notes, costume.continuity_notes]
        .filter(Boolean)
        .join("\n"),
      confidence_score: Math.max(
        existing.confidence_score ?? 0,
        costume.confidence_score ?? 0
      ),
    });
  }
  return [...map.values()];
}

export function mergeChunkResults(
  chunks: ProBreakdownResult[],
  meta?: {
    totalChunksPlanned: number;
    chunksCompleted: number;
    failedChunks?: { chunk_index: number; error: string }[];
    chunkSummaries?: ChunkProcessingSummary[];
  }
): ProBreakdownResult {
  const sceneMap = new Map<string, ProBreakdownScene>();
  const sceneOrder: string[] = [];

  let allCharacters: ProBreakdownCharacter[] = [];
  let allLocations: ProBreakdownLocation[] = [];
  let allDepartments: ProBreakdownDepartment[] = [];
  let allProps: ProBreakdownProp[] = [];
  let allCostumes: ProBreakdownCostume[] = [];
  const warnings: string[] = [];

  for (const chunk of chunks) {
    warnings.push(...chunk.project_summary.production_warnings);

    for (const scene of chunk.scenes) {
      const key = normalizeSceneKey(scene.scene_number) || `scene-${sceneOrder.length}`;
      if (!sceneMap.has(key)) {
        sceneMap.set(key, scene);
        sceneOrder.push(key);
      } else {
        sceneMap.set(key, mergeScene(sceneMap.get(key)!, scene));
      }
    }

    allCharacters = allCharacters.concat(chunk.characters);
    allLocations = allLocations.concat(chunk.locations);
    allDepartments = allDepartments.concat(chunk.departments);
    allProps = allProps.concat(chunk.props);
    allCostumes = allCostumes.concat(chunk.costumes);
  }

  const scenes = sceneOrder
    .map((key) => sceneMap.get(key))
    .filter((s): s is ProBreakdownScene => Boolean(s));

  const characters = dedupeCharacters(allCharacters);
  const locations = dedupeLocations(allLocations);
  const departments = dedupeDepartments(allDepartments);
  const props = dedupeProps(allProps);
  const costumes = dedupeCostumes(allCostumes);

  const uncertainScenes = scenes.filter(
    (s) => (s.confidence_score ?? 1) < 0.6
  ).length;

  if (meta?.failedChunks?.length) {
    warnings.push(
      `${meta.failedChunks.length} chunk(s) failed analysis and were excluded from merge.`
    );
  }

  const processing_report: BreakdownProcessingReport = {
    total_chunks_planned: meta?.totalChunksPlanned ?? chunks.length,
    total_chunks_analyzed: meta?.chunksCompleted ?? chunks.length,
    total_scenes_detected: scenes.length,
    total_characters_detected: characters.length,
    total_locations_detected: locations.length,
    uncertain_scenes_count: uncertainScenes,
    warnings_count: warnings.length,
    failed_chunks: meta?.failedChunks,
    chunk_summaries: meta?.chunkSummaries,
  };

  return {
    project_summary: {
      title_guess:
        chunks.find((c) => c.project_summary.title_guess)?.project_summary
          .title_guess ?? "",
      total_scenes: scenes.length,
      detected_characters_count: characters.length,
      detected_locations_count: locations.length,
      production_warnings: [...new Set(warnings.filter(Boolean))],
    },
    scenes,
    characters,
    locations,
    departments,
    props,
    costumes,
    processing_report,
  };
}
