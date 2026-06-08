"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "@/components/ui/Table";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useProject } from "@/lib/context/PlatformContext";
import { SAMPLE_SCRIPT_TEXT } from "@/lib/mock-data";
import { generateMockBreakdownScenes } from "@/lib/utils/generate-breakdown";
import type { Complexity, Scene } from "@/lib/types";
import { downloadCSV, scenesToCSV } from "@/lib/utils/export-csv";
import { Download, FileBarChart, Save, ScrollText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const cellInput =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-[12px] text-[var(--text-primary)] focus:border-[rgba(34,211,238,0.3)] focus:outline-none focus:ring-1 focus:ring-[rgba(34,211,238,0.06)] disabled:opacity-40";

export default function ScriptBreakdownPage() {
  const { projectId, isProjectReady } = useSyncProjectFromUrl();
  const { saveBreakdownToProject, canEditProject } = useProject();
  const [draftScenes, setDraftScenes] = useState<Scene[]>([]);
  const [scriptText, setScriptText] = useState(SAMPLE_SCRIPT_TEXT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error" | "warning">("success");

  const [filterLocation, setFilterLocation] = useState("");
  const [filterCharacter, setFilterCharacter] = useState("");
  const [filterComplexity, setFilterComplexity] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterDayNight, setFilterDayNight] = useState("");
  const [filterIntExt, setFilterIntExt] = useState("");

  const locations = useMemo(
    () => [...new Set(draftScenes.map((s) => s.location))],
    [draftScenes]
  );
  const characters = useMemo(
    () => [...new Set(draftScenes.flatMap((s) => s.characters))],
    [draftScenes]
  );

  const filteredScenes = useMemo(() => {
    return draftScenes.filter((s) => {
      if (filterLocation && s.location !== filterLocation) return false;
      if (filterCharacter && !s.characters.includes(filterCharacter)) return false;
      if (filterComplexity && s.complexity !== filterComplexity) return false;
      if (filterDayNight && s.day_night !== filterDayNight) return false;
      if (filterIntExt && s.int_ext !== filterIntExt) return false;
      if (filterDepartment) {
        const map: Record<string, (sc: Scene) => boolean> = {
          costumes: (sc) => sc.costumes.length > 0,
          props: (sc) => sc.props.length > 0,
          vfx: (sc) => sc.vfx.length > 0,
          stunts: (sc) => sc.stunts.length > 0,
        };
        const check = map[filterDepartment];
        if (check && !check(s)) return false;
      }
      return true;
    });
  }, [
    draftScenes,
    filterLocation,
    filterCharacter,
    filterComplexity,
    filterDepartment,
    filterDayNight,
    filterIntExt,
  ]);

  const updateDraftScene = (sceneId: string, updates: Partial<Scene>) => {
    setDraftScenes((prev) =>
      prev.map((s) =>
        s.id === sceneId
          ? { ...s, ...updates, updated_at: new Date().toISOString() }
          : s
      )
    );
  };

  const updateCell = (sceneId: string, field: keyof Scene, value: string) => {
    const arrayFields = [
      "characters",
      "props",
      "costumes",
      "vfx",
      "stunts",
      "vehicles",
      "animals",
      "special_requirements",
    ];
    if (arrayFields.includes(field)) {
      updateDraftScene(sceneId, {
        [field]: value.split(",").map((s) => s.trim()).filter(Boolean),
      });
    } else {
      updateDraftScene(sceneId, { [field]: value });
    }
  };

  const handleGenerate = async () => {
    if (!projectId || !scriptText.trim()) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 900));
    const generated = generateMockBreakdownScenes(projectId, scriptText);
    setDraftScenes(generated);
    setIsGenerating(false);
    setToastVariant("success");
    setToast(`${generated.length} scene generate dal copione.`);
  };

  const handleSave = async () => {
    if (!projectId) {
      setToastVariant("warning");
      setToast("Seleziona un progetto prima di salvare il breakdown.");
      return;
    }
    if (draftScenes.length === 0) {
      setToastVariant("warning");
      setToast("Nessuna scena da salvare.");
      return;
    }

    setIsSaving(true);
    const result = await saveBreakdownToProject(draftScenes, projectId);
    setIsSaving(false);

    if (result.error) {
      setToastVariant("error");
      setToast(result.error);
      return;
    }

    setDraftScenes([]);
    setToastVariant("success");
    setToast("Scene salvate correttamente");
  };

  if (!projectId || !isProjectReady) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Progetto non selezionato"
        description="Seleziona un progetto prima di usare Script Breakdown AI."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Script Breakdown AI"
        description={`${draftScenes.length} scene in breakdown · ${filteredScenes.length} visualizzate`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !canEditProject}
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isGenerating ? "Analisi..." : "Genera breakdown"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={!draftScenes.length || !canEditProject || isSaving}
              size="sm"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Salvataggio…" : "Salva"}
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCSV(scenesToCSV(filteredScenes), "breakdown.csv")}
              disabled={!filteredScenes.length}
              size="sm"
            >
              <Download className="h-3.5 w-3.5" />CSV
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setToastVariant("success");
                setToast(`Report: ${filteredScenes.length} scene.`);
              }}
              disabled={!filteredScenes.length}
              size="sm"
            >
              <FileBarChart className="h-3.5 w-3.5" />Report
            </Button>
          </div>
        }
      />

      <PremiumCard padding="md">
        <Textarea
          label="Testo sceneggiatura"
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          className="min-h-[200px] font-mono text-[12px] leading-relaxed"
          placeholder="Incolla il copione qui..."
        />
      </PremiumCard>

      {draftScenes.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nessuna scena presente"
          description="Genera un breakdown dal copione o aggiungi scene manualmente dal database."
          action={
            <Button onClick={handleGenerate} disabled={isGenerating || !canEditProject} size="sm">
              <Sparkles className="h-3.5 w-3.5" />Genera breakdown
            </Button>
          }
        />
      ) : (
        <>
          <PremiumCard padding="sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Select
                label="Location"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                options={[
                  { value: "", label: "Tutte" },
                  ...locations.map((l) => ({ value: l, label: l })),
                ]}
              />
              <Select
                label="Personaggio"
                value={filterCharacter}
                onChange={(e) => setFilterCharacter(e.target.value)}
                options={[
                  { value: "", label: "Tutti" },
                  ...characters.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="Complessità"
                value={filterComplexity}
                onChange={(e) => setFilterComplexity(e.target.value)}
                options={[
                  { value: "", label: "Tutte" },
                  { value: "low", label: "Bassa" },
                  { value: "medium", label: "Media" },
                  { value: "high", label: "Alta" },
                  { value: "very_high", label: "Molto alta" },
                ]}
              />
              <Select
                label="Reparto"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                options={[
                  { value: "", label: "Tutti" },
                  { value: "costumes", label: "Costumi" },
                  { value: "props", label: "Props" },
                  { value: "vfx", label: "VFX" },
                  { value: "stunts", label: "Stunt" },
                ]}
              />
              <Select
                label="DAY/NIGHT"
                value={filterDayNight}
                onChange={(e) => setFilterDayNight(e.target.value)}
                options={[
                  { value: "", label: "Tutti" },
                  { value: "DAY", label: "DAY" },
                  { value: "NIGHT", label: "NIGHT" },
                ]}
              />
              <Select
                label="INT/EXT"
                value={filterIntExt}
                onChange={(e) => setFilterIntExt(e.target.value)}
                options={[
                  { value: "", label: "Tutti" },
                  { value: "INT", label: "INT" },
                  { value: "EXT", label: "EXT" },
                ]}
              />
            </div>
          </PremiumCard>

          <Table className="min-w-[1000px]">
            <TableHead>
              <TableRow>
                {[
                  "Scena",
                  "INT/EXT",
                  "DAY/NIGHT",
                  "Location",
                  "Descrizione",
                  "Personaggi",
                  "Complessità",
                  "Note",
                ].map((h) => (
                  <TableTh key={h}>{h}</TableTh>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredScenes.map((scene) => (
                <TableRow key={scene.id}>
                  <TableTd className="py-1.5">
                    <input
                      className={`${cellInput} w-10`}
                      value={scene.scene_number}
                      onChange={(e) => updateCell(scene.id, "scene_number", e.target.value)}
                      disabled={!canEditProject}
                    />
                  </TableTd>
                  <TableTd className="py-1.5">
                    <select
                      className={cellInput}
                      value={scene.int_ext}
                      onChange={(e) => updateCell(scene.id, "int_ext", e.target.value)}
                      disabled={!canEditProject}
                    >
                      <option value="INT">INT</option>
                      <option value="EXT">EXT</option>
                    </select>
                  </TableTd>
                  <TableTd className="py-1.5">
                    <select
                      className={cellInput}
                      value={scene.day_night}
                      onChange={(e) => updateCell(scene.id, "day_night", e.target.value)}
                      disabled={!canEditProject}
                    >
                      <option value="DAY">DAY</option>
                      <option value="NIGHT">NIGHT</option>
                    </select>
                  </TableTd>
                  <TableTd className="py-1.5">
                    <input
                      className={`${cellInput} min-w-[100px]`}
                      value={scene.location}
                      onChange={(e) => updateCell(scene.id, "location", e.target.value)}
                      disabled={!canEditProject}
                    />
                  </TableTd>
                  <TableTd className="py-1.5">
                    <input
                      className={`${cellInput} min-w-[140px]`}
                      value={scene.short_description}
                      onChange={(e) =>
                        updateCell(scene.id, "short_description", e.target.value)
                      }
                      disabled={!canEditProject}
                    />
                  </TableTd>
                  <TableTd className="py-1.5 text-[12px] text-[var(--text-muted)]">
                    {scene.characters.join(", ")}
                  </TableTd>
                  <TableTd className="py-1.5">
                    <select
                      className={cellInput}
                      value={scene.complexity}
                      onChange={(e) =>
                        updateDraftScene(scene.id, {
                          complexity: e.target.value as Complexity,
                        })
                      }
                      disabled={!canEditProject}
                    >
                      <option value="low">Bassa</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="very_high">Molto alta</option>
                    </select>
                  </TableTd>
                  <TableTd className="py-1.5">
                    <input
                      className={`${cellInput} min-w-[100px]`}
                      value={scene.production_notes}
                      onChange={(e) =>
                        updateCell(scene.id, "production_notes", e.target.value)
                      }
                      disabled={!canEditProject}
                    />
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <Toast
        message={toast ?? ""}
        open={!!toast}
        onClose={() => setToast(null)}
        variant={toastVariant}
      />
    </div>
  );
}
