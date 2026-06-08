import type { Complexity, DayNight, IntExt, Scene } from "@/lib/types";

export type AiBreakdownScene = {
  scene_number: string;
  int_ext: string;
  day_night: string;
  location: string;
  short_description: string;
  characters: string[];
  props: string[];
  costumes: string[];
  vfx: string[];
  stunts: string[];
  vehicles: string[];
  animals: string[];
  special_requirements: string[];
  complexity: string;
  production_notes: string;
};

export type AiBreakdownResponse = {
  scenes: AiBreakdownScene[];
};

export const SCRIPT_BREAKDOWN_SYSTEM_PROMPT = `Sei un assistente di produzione cinematografica professionale per Systemlix FilmOps.

Analizza la sceneggiatura fornita e crea un breakdown operativo utile a:
- produzione
- aiuto regia
- location manager
- costumi
- props
- trucco
- VFX
- stunt
- trasporti

Per ogni scena estrai:
- scene_number
- int_ext (INT | EXT | INT/EXT | UNKNOWN)
- day_night (DAY | NIGHT | EVENING | MORNING | UNKNOWN)
- location
- short_description (breve, operativa)
- characters (array di nomi)
- props, costumes, vfx, stunts, vehicles, animals, special_requirements (array)
- complexity (Bassa | Media | Alta | Molto alta)
- production_notes

Regole:
- Se un dato non è presente: array vuoto per le liste
- Usa UNKNOWN per int_ext o day_night se non deducibile
- Non inventare dettagli non presenti nel testo
- Puoi dedurre solo elementi chiaramente implicati dal copione
- Complessità Bassa: scena semplice, pochi elementi
- Complessità Media: più personaggi, props o location operativa
- Complessità Alta: notte, esterni complessi, veicoli, folla, permessi, VFX, stunt
- Complessità Molto alta: stunt, armi, animali, minori, acqua/fuoco, inseguimenti, molti reparti

Rispondi ESCLUSIVAMENTE con JSON valido nel formato:
{
  "scenes": [
    {
      "scene_number": "string",
      "int_ext": "INT | EXT | INT/EXT | UNKNOWN",
      "day_night": "DAY | NIGHT | EVENING | MORNING | UNKNOWN",
      "location": "string",
      "short_description": "string",
      "characters": ["string"],
      "props": ["string"],
      "costumes": ["string"],
      "vfx": ["string"],
      "stunts": ["string"],
      "vehicles": ["string"],
      "animals": ["string"],
      "special_requirements": ["string"],
      "complexity": "Bassa | Media | Alta | Molto alta",
      "production_notes": "string"
    }
  ]
}`;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
    .filter(Boolean);
}

function normalizeIntExt(value: unknown): IntExt {
  const raw = String(value ?? "UNKNOWN").toUpperCase().trim();
  if (raw === "EXT" || raw.startsWith("EXT")) return "EXT";
  if (raw.includes("INT/EXT") || raw.includes("INT-EXT")) return "INT";
  if (raw === "INT" || raw.startsWith("INT")) return "INT";
  return "INT";
}

function normalizeDayNight(value: unknown): DayNight {
  const raw = String(value ?? "UNKNOWN").toUpperCase().trim();
  if (
    raw === "NIGHT" ||
    raw === "EVENING" ||
    raw === "NOTTE" ||
    raw === "SERALE"
  ) {
    return "NIGHT";
  }
  return "DAY";
}

function normalizeComplexity(value: unknown): Complexity {
  const raw = String(value ?? "Media").toLowerCase().trim();
  if (raw.includes("molto") || raw.includes("very")) return "very_high";
  if (raw.includes("alta") || raw === "high") return "high";
  if (raw.includes("bassa") || raw === "low") return "low";
  return "medium";
}

export function normalizeAiBreakdownScene(raw: Record<string, unknown>): AiBreakdownScene {
  return {
    scene_number: String(raw.scene_number ?? "").trim() || "—",
    int_ext: String(raw.int_ext ?? "UNKNOWN"),
    day_night: String(raw.day_night ?? "UNKNOWN"),
    location: String(raw.location ?? "").trim(),
    short_description: String(raw.short_description ?? "").trim(),
    characters: asStringArray(raw.characters),
    props: asStringArray(raw.props),
    costumes: asStringArray(raw.costumes),
    vfx: asStringArray(raw.vfx),
    stunts: asStringArray(raw.stunts),
    vehicles: asStringArray(raw.vehicles),
    animals: asStringArray(raw.animals),
    special_requirements: asStringArray(raw.special_requirements),
    complexity: String(raw.complexity ?? "Media"),
    production_notes: String(raw.production_notes ?? "").trim(),
  };
}

export function parseAiBreakdownJson(content: string): AiBreakdownResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Risposta AI non valida: JSON malformato");
  }

  if (!parsed || typeof parsed !== "object" || !("scenes" in parsed)) {
    throw new Error("Risposta AI non valida: campo scenes mancante");
  }

  const scenes = (parsed as { scenes: unknown }).scenes;
  if (!Array.isArray(scenes)) {
    throw new Error("Risposta AI non valida: scenes non è un array");
  }

  if (scenes.length === 0) {
    throw new Error("L'AI non ha estratto scene dal copione");
  }

  return {
    scenes: scenes.map((scene) =>
      normalizeAiBreakdownScene(
        scene && typeof scene === "object" ? (scene as Record<string, unknown>) : {}
      )
    ),
  };
}

export function aiScenesToDraftScenes(
  projectId: string,
  aiScenes: AiBreakdownScene[]
): Scene[] {
  const now = new Date().toISOString();
  const stamp = Date.now();

  return aiScenes.map((scene, index) => ({
    id: `scene-${projectId}-ai-${stamp}-${index}`,
    project_id: projectId,
    scene_number: scene.scene_number,
    int_ext: normalizeIntExt(scene.int_ext),
    day_night: normalizeDayNight(scene.day_night),
    location: scene.location,
    short_description: scene.short_description,
    characters: scene.characters,
    props: scene.props,
    costumes: scene.costumes,
    vfx: scene.vfx,
    stunts: scene.stunts,
    vehicles: scene.vehicles,
    animals: scene.animals,
    special_requirements: scene.special_requirements,
    complexity: normalizeComplexity(scene.complexity),
    production_notes: scene.production_notes,
    created_at: now,
    updated_at: now,
  }));
}

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
}

export function getOpenAiFallbackModel(): string {
  return "gpt-5-mini";
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
