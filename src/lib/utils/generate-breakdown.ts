import type { Scene } from "@/lib/types";

let sceneCounter = 0;

export function generateMockBreakdownScenes(
  projectId: string,
  scriptText: string
): Scene[] {
  const now = new Date().toISOString();
  const lines = scriptText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const hasNight = scriptText.toLowerCase().includes("notte") || scriptText.toLowerCase().includes("night");
  const hasInt = scriptText.toLowerCase().includes("interno") || scriptText.toLowerCase().includes("int");

  const templates = [
    {
      scene_number: "1",
      int_ext: hasInt ? ("INT" as const) : ("EXT" as const),
      day_night: "DAY" as const,
      location: "Location principale — Esterno",
      short_description: "Establishing e introduzione sequenza.",
      characters: ["Protagonista", "Comparsazione"],
      complexity: "medium" as const,
    },
    {
      scene_number: "2",
      int_ext: "INT" as const,
      day_night: "DAY" as const,
      location: "Set interno — Ufficio",
      short_description: "Dialogo espositivo tra personaggi principali.",
      characters: ["Protagonista", "Consulente"],
      complexity: "low" as const,
    },
    {
      scene_number: "3",
      int_ext: "EXT" as const,
      day_night: hasNight ? ("NIGHT" as const) : ("DAY" as const),
      location: "Location secondaria — Strada",
      short_description: "Sequenza d'azione o spostamento.",
      characters: ["Protagonista", "Antagonista"],
      complexity: "high" as const,
    },
    {
      scene_number: "4",
      int_ext: "INT" as const,
      day_night: "DAY" as const,
      location: "Set interno — Sala riunioni",
      short_description: "Confronto e decisione narrativa.",
      characters: ["Cast principale"],
      complexity: "medium" as const,
    },
    {
      scene_number: "5",
      int_ext: "EXT" as const,
      day_night: "NIGHT" as const,
      location: "Location notturna — Parcheggio",
      short_description: "Chiusura episodio o cliffhanger.",
      characters: ["Protagonista"],
      complexity: "very_high" as const,
    },
  ];

  const count = Math.min(5, Math.max(3, Math.ceil(lines.length / 4) || 3));

  return templates.slice(0, count).map((t, i) => {
    sceneCounter += 1;
    return {
      id: `scene-${projectId}-bd-${sceneCounter}`,
      project_id: projectId,
      scene_number: t.scene_number,
      int_ext: t.int_ext,
      day_night: t.day_night,
      location: t.location,
      short_description: t.short_description,
      characters: t.characters,
      props: i % 2 === 0 ? ["Telefono", "Documenti"] : [],
      costumes: ["Look principale"],
      vfx: i === 4 ? ["Pulizia luci"] : [],
      stunts: i === 2 ? ["Movimento coordinato"] : [],
      vehicles: i === 2 ? ["Auto produzione"] : [],
      animals: [],
      special_requirements: [],
      complexity: t.complexity,
      production_notes: "Generato da Script Breakdown AI — verificare prima del salvataggio.",
      created_at: now,
      updated_at: now,
    };
  });
}
