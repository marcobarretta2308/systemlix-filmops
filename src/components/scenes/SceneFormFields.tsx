"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { Complexity, DayNight, IntExt, Scene } from "@/lib/types";

interface SceneFormFieldsProps {
  scene: Scene;
  onChange: (updates: Partial<Scene>) => void;
}

const complexityOptions = [
  { value: "low", label: "Bassa" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "very_high", label: "Molto alta" },
];

export function SceneFormFields({ scene, onChange }: SceneFormFieldsProps) {
  const arrayField = (
    key: keyof Pick<
      Scene,
      | "characters"
      | "props"
      | "costumes"
      | "vfx"
      | "stunts"
      | "vehicles"
      | "animals"
      | "special_requirements"
    >,
    label: string
  ) => (
    <Input
      label={label}
      value={(scene[key] as string[]).join(", ")}
      onChange={(e) =>
        onChange({
          [key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
        })
      }
    />
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Numero scena"
        value={scene.scene_number}
        onChange={(e) => onChange({ scene_number: e.target.value })}
      />
      <Select
        label="INT/EXT"
        value={scene.int_ext}
        onChange={(e) => onChange({ int_ext: e.target.value as IntExt })}
        options={[
          { value: "INT", label: "INT" },
          { value: "EXT", label: "EXT" },
        ]}
      />
      <Select
        label="DAY/NIGHT"
        value={scene.day_night}
        onChange={(e) => onChange({ day_night: e.target.value as DayNight })}
        options={[
          { value: "DAY", label: "DAY" },
          { value: "NIGHT", label: "NIGHT" },
        ]}
      />
      <Input
        label="Location"
        value={scene.location}
        onChange={(e) => onChange({ location: e.target.value })}
      />
      <Select
        label="Complessità"
        value={scene.complexity}
        onChange={(e) => onChange({ complexity: e.target.value as Complexity })}
        options={complexityOptions}
      />
      <div className="sm:col-span-2">
        <Textarea
          label="Descrizione breve"
          value={scene.short_description}
          onChange={(e) => onChange({ short_description: e.target.value })}
        />
      </div>
      {arrayField("characters", "Personaggi (separati da virgola)")}
      {arrayField("props", "Props")}
      {arrayField("costumes", "Costumi")}
      {arrayField("vfx", "VFX")}
      {arrayField("stunts", "Stunt")}
      {arrayField("vehicles", "Veicoli")}
      {arrayField("animals", "Animali")}
      {arrayField("special_requirements", "Requisiti speciali")}
      <div className="sm:col-span-2">
        <Textarea
          label="Note produzione"
          value={scene.production_notes}
          onChange={(e) => onChange({ production_notes: e.target.value })}
        />
      </div>
    </div>
  );
}
