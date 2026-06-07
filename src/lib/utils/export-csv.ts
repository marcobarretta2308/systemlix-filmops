import type { Scene } from "@/lib/types";

const COMPLEXITY_LABELS: Record<string, string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
  very_high: "Molto alta",
};

export function scenesToCSV(scenes: Scene[]): string {
  const headers = [
    "Scena",
    "INT/EXT",
    "DAY/NIGHT",
    "Location",
    "Descrizione",
    "Personaggi",
    "Props",
    "Costumi",
    "VFX",
    "Stunt",
    "Veicoli",
    "Animali",
    "Requisiti speciali",
    "Complessità",
    "Note produzione",
  ];

  const rows = scenes.map((s) => [
    s.scene_number,
    s.int_ext,
    s.day_night,
    s.location,
    s.short_description,
    s.characters.join("; "),
    s.props.join("; "),
    s.costumes.join("; "),
    s.vfx.join("; "),
    s.stunts.join("; "),
    s.vehicles.join("; "),
    s.animals.join("; "),
    s.special_requirements.join("; "),
    COMPLEXITY_LABELS[s.complexity] ?? s.complexity,
    s.production_notes,
  ]);

  return [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
