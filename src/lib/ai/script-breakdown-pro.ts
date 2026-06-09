import type { Complexity } from "@/lib/types";
import type {
  BreakdownProcessingReport,
  BreakdownQualityCheck,
  ScriptExtractionMeta,
} from "@/lib/script-breakdown/types";
import { extractLocationFromSlugline } from "@/lib/script-breakdown/scene-detection";
import {
  normalizeAiBreakdownScene,
  normalizeComplexity,
  normalizeDayNight,
  normalizeIntExt,
  type AiBreakdownScene,
} from "@/lib/ai/script-breakdown";

export type BreakdownPriority = "low" | "medium" | "high" | "critical";
export type CastType = "principal" | "supporting" | "extra" | "unknown";
export type LocationType =
  | "interior"
  | "exterior"
  | "mixed"
  | "vehicle"
  | "unknown";

export type ProProjectSummary = {
  title_guess: string;
  total_scenes: number;
  detected_characters_count: number;
  detected_locations_count: number;
  production_warnings: string[];
};

export type ProBreakdownScene = {
  scene_number: string;
  slugline: string;
  interior_exterior: string;
  day_night: string;
  location: string;
  short_description: string;
  characters: string[];
  props: string[];
  costumes: string[];
  vehicles: string[];
  animals: string[];
  vfx: string[];
  stunts: string[];
  special_equipment: string[];
  department_notes: string;
  estimated_page_count: string;
  complexity: string;
  production_warnings: string[];
  confidence_score?: number;
};

export type ProBreakdownCharacter = {
  name: string;
  description: string;
  scenes_present: string[];
  suggested_cast_type: CastType;
  notes: string;
  confidence_score?: number;
};

export type ProBreakdownLocation = {
  name: string;
  type: LocationType;
  scenes: string[];
  notes: string;
  confidence_score?: number;
  canonical_name?: string;
  sub_location?: string;
  display_name?: string;
  day_night_usage?: string[];
  complexity_peak?: string;
  warnings?: string[];
  merge_with_existing_id?: string | null;
  merge_with_existing_name?: string | null;
  create?: boolean;
  update_existing?: boolean;
};

export type ProBreakdownDepartment = {
  department: string;
  notes: string;
  related_scenes: string[];
  priority: BreakdownPriority;
  confidence_score?: number;
};

export type ProBreakdownProp = {
  name: string;
  scenes: string[];
  department: string;
  notes: string;
  confidence_score?: number;
};

export type ProBreakdownCostume = {
  character: string;
  scenes: string[];
  costume_notes: string;
  continuity_notes: string;
  confidence_score?: number;
};

export type ProBreakdownResult = {
  project_summary: ProProjectSummary;
  scenes: ProBreakdownScene[];
  characters: ProBreakdownCharacter[];
  locations: ProBreakdownLocation[];
  departments: ProBreakdownDepartment[];
  props: ProBreakdownProp[];
  costumes: ProBreakdownCostume[];
  processing_report?: BreakdownProcessingReport;
  quality_check?: BreakdownQualityCheck;
  extraction_meta?: ScriptExtractionMeta;
  script_revision_id?: string | null;
  breakdown_run_id?: string | null;
};

export const SCRIPT_BREAKDOWN_PRO_PROMPT = `You are a professional film production script breakdown assistant for Systemlix FilmOps.

Analyze the screenplay and return a complete operational breakdown as JSON.

LANGUAGE (critical):
- Detect the language of the screenplay (Italian, English, etc.)
- Write ALL human-readable text fields in the SAME language as the script
- NEVER translate Italian scripts into English (or vice versa)
- Fields that MUST follow script language: title_guess, slugline, location, short_description, production_warnings, department_notes, character descriptions/notes, location names/notes, department names/notes, props names/notes, costume_notes, continuity_notes
- If the script is Italian, examples: "Strada del quartiere", "Magazzino abbandonato", "Vecchia stazione", "Auto nera di Bruno" — NOT "Street in the neighborhood", "Abandoned warehouse", etc.

STANDARDIZED TECHNICAL VALUES ONLY (always in English, never translated):
- interior_exterior / int_ext: INT | EXT | INT/EXT | UNKNOWN
- day_night: DAY | NIGHT | EVENING | MORNING | UNKNOWN
- complexity: low | medium | high | critical
- priority: low | medium | high | critical
- suggested_cast_type: principal | supporting | extra | unknown
- location type enum: interior | exterior | mixed | vehicle | unknown

LOCATION EXTRACTION (critical):
- The slugline / scene heading is the PRIMARY source for scene location
- Parse slugline patterns in any language, e.g.:
  - INT. CUCINA - GIORNO → location: "Cucina"
  - EXT. STRADA DEL QUARTIERE - NOTTE → location: "Strada del quartiere"
  - INTERNO CASA MARCO - SERA → location: "Casa Marco"
  - ESTERNO BAR - MATTINA → location: "Bar"
- Use exact or naturally shortened names from the script text; preserve proper nouns and Italian wording
- Do NOT invent generic English placeholders ("Street", "House", "Office") when the script gives a specific place name
- For locations list, dedupe by meaning but keep the script's naming (e.g. "Magazzino abbandonato", not "Abandoned warehouse")
- Vehicles, props, and set pieces keep script language: "Auto nera di Bruno", not "Bruno's black car" on Italian scripts
- Vehicle interiors (car, bus, train cabin) → type: vehicle; classify tunnel/underpass as exterior or mixed from slugline context

General rules:
- Extract only what is supported by the script text; do not invent details
- Use empty arrays when lists have no items
- Use UNKNOWN or unknown enums when not deducible

Return ONLY valid JSON in this exact shape:
{
  "project_summary": {
    "title_guess": "string",
    "total_scenes": 0,
    "detected_characters_count": 0,
    "detected_locations_count": 0,
    "production_warnings": ["string"]
  },
  "scenes": [{
    "scene_number": "string",
    "slugline": "string",
    "interior_exterior": "INT | EXT | INT/EXT | UNKNOWN",
    "day_night": "DAY | NIGHT | EVENING | MORNING | UNKNOWN",
    "location": "string",
    "short_description": "string",
    "characters": ["string"],
    "props": ["string"],
    "costumes": ["string"],
    "vehicles": ["string"],
    "animals": ["string"],
    "vfx": ["string"],
    "stunts": ["string"],
    "special_equipment": ["string"],
    "department_notes": "string",
    "estimated_page_count": "string",
    "complexity": "low | medium | high | critical",
    "production_warnings": ["string"]
  }],
  "characters": [{
    "name": "string",
    "description": "string",
    "scenes_present": ["string"],
    "suggested_cast_type": "principal | supporting | extra | unknown",
    "notes": "string"
  }],
  "locations": [{
    "name": "string",
    "canonical_name": "main location in script language",
    "sub_location": "set area or empty string",
    "type": "interior | exterior | mixed | vehicle | unknown",
    "scenes": ["string"],
    "notes": "string"
  }],
  "departments": [{
    "department": "string",
    "notes": "string",
    "related_scenes": ["string"],
    "priority": "low | medium | high | critical"
  }],
  "props": [{
    "name": "string",
    "scenes": ["string"],
    "department": "string",
    "notes": "string"
  }],
  "costumes": [{
    "character": "string",
    "scenes": ["string"],
    "costume_notes": "string",
    "continuity_notes": "string"
  }]
}`;

export const SCRIPT_BREAKDOWN_CHUNK_PROMPT = `${SCRIPT_BREAKDOWN_PRO_PROMPT}

Additional rules for PARTIAL script sections (chunked analysis):
- You are analyzing ONE section of a longer screenplay. Chunk metadata (index, total, scene range) is provided in the user message.
- Analyze ONLY scenes present in this section. Do NOT invent scenes missing from the text.
- Preserve scene_number values exactly as they appear in sluglines. Keep numbering consistent with the script — do not renumber from 1.
- If scene_number is unclear, infer from slugline order within this section only, continuing any visible numbering sequence.
- Do not reference, summarize, or assume scenes outside this section.
- Include confidence_score (0.0 to 1.0) on scenes, characters, locations, departments, props, costumes.
- Keep the same language as the script in every text field; chunk boundaries do not change language rules.
- Derive each scene location primarily from its slugline in this section.
- Return a complete breakdown JSON for this section only (scenes, characters, locations, departments, props, costumes in this section).`;

function normalizeConfidence(value: unknown): number | undefined {
  const num = Number(value);
  if (Number.isNaN(num)) return undefined;
  return Math.min(1, Math.max(0, num));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
    .filter(Boolean);
}

function normalizePriority(value: unknown): BreakdownPriority {
  const raw = String(value ?? "medium").toLowerCase();
  if (raw === "low") return "low";
  if (raw === "high") return "high";
  if (raw === "critical") return "critical";
  return "medium";
}

function normalizeCastType(value: unknown): CastType {
  const raw = String(value ?? "unknown").toLowerCase();
  if (raw === "principal" || raw === "lead") return "principal";
  if (raw === "supporting") return "supporting";
  if (raw === "extra" || raw === "background") return "extra";
  return "unknown";
}

function normalizeLocationType(value: unknown): LocationType {
  const raw = String(value ?? "unknown").toLowerCase();
  if (raw === "interior" || raw === "int") return "interior";
  if (raw === "exterior" || raw === "ext") return "exterior";
  if (raw === "mixed") return "mixed";
  if (raw === "vehicle" || raw === "car" || raw === "auto") return "vehicle";
  return "unknown";
}

export function normalizeProComplexity(value: unknown): Complexity {
  const raw = String(value ?? "medium").toLowerCase();
  if (raw === "critical" || raw.includes("very")) return "very_high";
  if (raw === "high") return "high";
  if (raw === "low") return "low";
  return "medium";
}

export function normalizeProScene(raw: Record<string, unknown>): ProBreakdownScene {
  const legacy = normalizeAiBreakdownScene({
    scene_number: raw.scene_number ?? raw.slugline,
    int_ext: raw.interior_exterior ?? raw.int_ext,
    day_night: raw.day_night,
    location: raw.location,
    short_description: raw.short_description ?? raw.slugline,
    characters: raw.characters,
    props: raw.props,
    costumes: raw.costumes,
    vfx: raw.vfx,
    stunts: raw.stunts,
    vehicles: raw.vehicles,
    animals: raw.animals,
    special_requirements: raw.special_equipment ?? raw.special_requirements,
    complexity: raw.complexity,
    production_notes: raw.department_notes ?? raw.production_notes,
  });

  const slugline = String(raw.slugline ?? legacy.short_description ?? "").trim();
  const locationFromSlugline = extractLocationFromSlugline(slugline);

  return {
    scene_number: legacy.scene_number,
    slugline,
    interior_exterior: legacy.int_ext,
    day_night: legacy.day_night,
    location: legacy.location.trim() || locationFromSlugline,
    short_description: legacy.short_description,
    characters: legacy.characters,
    props: legacy.props,
    costumes: legacy.costumes,
    vehicles: legacy.vehicles,
    animals: legacy.animals,
    vfx: legacy.vfx,
    stunts: legacy.stunts,
    special_equipment: asStringArray(
      raw.special_equipment ?? raw.special_requirements
    ),
    department_notes: String(
      raw.department_notes ?? legacy.production_notes ?? ""
    ).trim(),
    estimated_page_count: String(raw.estimated_page_count ?? "").trim(),
    complexity: String(raw.complexity ?? "medium"),
    production_warnings: asStringArray(raw.production_warnings),
    confidence_score: normalizeConfidence(raw.confidence_score),
  };
}

export function proSceneToAiScene(scene: ProBreakdownScene): AiBreakdownScene {
  return {
    scene_number: scene.scene_number,
    int_ext: scene.interior_exterior,
    day_night: scene.day_night,
    location: scene.location,
    short_description: scene.short_description || scene.slugline,
    characters: scene.characters,
    props: scene.props,
    costumes: scene.costumes,
    vfx: scene.vfx,
    stunts: scene.stunts,
    vehicles: scene.vehicles,
    animals: scene.animals,
    special_requirements: scene.special_equipment,
    complexity: scene.complexity,
    production_notes: [
      scene.department_notes,
      scene.production_warnings.length
        ? `Warnings: ${scene.production_warnings.join("; ")}`
        : "",
      scene.estimated_page_count
        ? `Pages: ${scene.estimated_page_count}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export class ScriptBreakdownParseError extends Error {
  rawResponse: string;
  parseError: string;

  constructor(message: string, rawResponse: string, parseError: string) {
    super(message);
    this.name = "ScriptBreakdownParseError";
    this.rawResponse = rawResponse;
    this.parseError = parseError;
  }
}

export function cleanAiJsonContent(content: string): string {
  let cleaned = content.trim();
  const fenced = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) {
    cleaned = fenced[1].trim();
  } else {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }
  return cleaned;
}

export function parseProBreakdownJson(content: string): ProBreakdownResult {
  const cleaned = cleanAiJsonContent(content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    const parseMessage =
      parseError instanceof Error ? parseError.message : String(parseError);
    throw new ScriptBreakdownParseError(
      "AI returned invalid JSON. Please retry or reduce script length.",
      content,
      parseMessage
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid AI response: expected JSON object");
  }

  const root = parsed as Record<string, unknown>;
  const scenesRaw = root.scenes;
  if (!Array.isArray(scenesRaw) || scenesRaw.length === 0) {
    throw new Error("No scenes extracted from the script");
  }

  const scenes = scenesRaw.map((s) =>
    normalizeProScene(s && typeof s === "object" ? (s as Record<string, unknown>) : {})
  );

  const summaryRaw =
    root.project_summary && typeof root.project_summary === "object"
      ? (root.project_summary as Record<string, unknown>)
      : {};

  return {
    project_summary: {
      title_guess: String(summaryRaw.title_guess ?? "").trim(),
      total_scenes: Number(summaryRaw.total_scenes ?? scenes.length) || scenes.length,
      detected_characters_count:
        Number(summaryRaw.detected_characters_count ?? 0) ||
        (Array.isArray(root.characters) ? root.characters.length : 0),
      detected_locations_count:
        Number(summaryRaw.detected_locations_count ?? 0) ||
        (Array.isArray(root.locations) ? root.locations.length : 0),
      production_warnings: asStringArray(summaryRaw.production_warnings),
    },
    scenes,
    characters: Array.isArray(root.characters)
      ? root.characters.map((c) => {
          const row =
            c && typeof c === "object" ? (c as Record<string, unknown>) : {};
          return {
            name: String(row.name ?? "").trim(),
            description: String(row.description ?? "").trim(),
            scenes_present: asStringArray(row.scenes_present),
            suggested_cast_type: normalizeCastType(row.suggested_cast_type),
            notes: String(row.notes ?? "").trim(),
            confidence_score: normalizeConfidence(row.confidence_score),
          };
        })
      : [],
    locations: Array.isArray(root.locations)
      ? root.locations.map((l) => {
          const row =
            l && typeof l === "object" ? (l as Record<string, unknown>) : {};
          const name = String(row.name ?? "").trim();
          const canonical =
            String(row.canonical_name ?? "").trim() || name;
          const sub = String(row.sub_location ?? "").trim();
          return {
            name: sub ? `${canonical} — ${sub}` : canonical || name,
            canonical_name: canonical,
            sub_location: sub,
            type: normalizeLocationType(row.type),
            scenes: asStringArray(row.scenes),
            notes: String(row.notes ?? "").trim(),
            confidence_score: normalizeConfidence(row.confidence_score),
          };
        })
      : [],
    departments: Array.isArray(root.departments)
      ? root.departments.map((d) => {
          const row =
            d && typeof d === "object" ? (d as Record<string, unknown>) : {};
          return {
            department: String(row.department ?? "").trim(),
            notes: String(row.notes ?? "").trim(),
            related_scenes: asStringArray(row.related_scenes),
            priority: normalizePriority(row.priority),
            confidence_score: normalizeConfidence(row.confidence_score),
          };
        })
      : [],
    props: Array.isArray(root.props)
      ? root.props.map((p) => {
          const row =
            p && typeof p === "object" ? (p as Record<string, unknown>) : {};
          return {
            name: String(row.name ?? "").trim(),
            scenes: asStringArray(row.scenes),
            department: String(row.department ?? "Props").trim(),
            notes: String(row.notes ?? "").trim(),
            confidence_score: normalizeConfidence(row.confidence_score),
          };
        })
      : [],
    costumes: Array.isArray(root.costumes)
      ? root.costumes.map((c) => {
          const row =
            c && typeof c === "object" ? (c as Record<string, unknown>) : {};
          return {
            character: String(row.character ?? "").trim(),
            scenes: asStringArray(row.scenes),
            costume_notes: String(row.costume_notes ?? "").trim(),
            continuity_notes: String(row.continuity_notes ?? "").trim(),
            confidence_score: normalizeConfidence(row.confidence_score),
          };
        })
      : [],
  };
}

export function parseProBreakdownChunkJson(
  content: string,
  chunkIndex: number
): ProBreakdownResult {
  try {
    return parseProBreakdownJson(content);
  } catch (err) {
    if (err instanceof ScriptBreakdownParseError) {
      throw new ScriptBreakdownParseError(
        `AI returned invalid JSON for chunk ${chunkIndex + 1}.`,
        err.rawResponse,
        err.parseError
      );
    }
    throw err;
  }
}

export function proSceneToInsertRow(
  projectId: string,
  scene: ProBreakdownScene
) {
  const ai = proSceneToAiScene(scene);
  return {
    project_id: projectId,
    scene_number: ai.scene_number,
    int_ext: normalizeIntExt(ai.int_ext),
    day_night: normalizeDayNight(ai.day_night),
    location: ai.location,
    short_description: ai.short_description,
    characters: ai.characters,
    props: ai.props,
    costumes: ai.costumes,
    vfx: ai.vfx,
    stunts: ai.stunts,
    vehicles: ai.vehicles,
    animals: ai.animals,
    special_requirements: ai.special_requirements,
    complexity: normalizeProComplexity(ai.complexity),
    production_notes: ai.production_notes,
  };
}

export function normalizeSceneKey(value: string): string {
  return value.trim().toLowerCase();
}
