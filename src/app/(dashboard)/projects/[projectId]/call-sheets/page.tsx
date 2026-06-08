"use client";

import { CallSheetPreview } from "@/components/call-sheets/CallSheetPreview";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import type { CallSheet, CallSheetStatus } from "@/lib/types";
import { CheckCircle, Download, FileText, Lock, Save, Sparkles } from "lucide-react";
import { useState } from "react";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABELS: Record<CallSheetStatus, string> = {
  draft: "Bozza",
  final: "Finale",
  locked: "Bloccato",
  archived: "Archiviato",
};

export default function CallSheetsPage() {
  const { projectId, project, isProjectReady } = useSyncProjectFromUrl();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const {
    shootingDays, locations, scenes, castCrew, callSheets,
    activeCallSheet, setActiveCallSheet, saveCallSheet, canEditProject,
  } = useProject();

  const [selectedDayId, setSelectedDayId] = useState("");
  const [localPreview, setLocalPreview] = useState<CallSheet | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error" | "warning">("success");

  const effectiveDayId = selectedDayId || shootingDays[0]?.id || "";
  const preview =
    (localPreview?.project_id === projectId ? localPreview : null) ??
    (activeCallSheet?.project_id === projectId ? activeCallSheet : null);

  const generateCallSheet = async () => {
    const day = shootingDays.find((d) => d.id === effectiveDayId);
    if (!day || !project || !user || !projectId) return;

    const location = locations.find((l) => l.id === day.location_id);
    const sceneNums = day.selected_scene_ids.map(
      (id) => scenes.find((s) => s.id === id)?.scene_number ?? id
    );
    const version = (preview?.version ?? callSheets.reduce((m, c) => Math.max(m, c.version), 0)) + 1;

    const generated: CallSheet = {
      id: `cs-${projectId}-${Date.now()}`,
      project_id: projectId,
      shooting_day_id: day.id,
      version,
      status: "draft",
      generated_by: user.id,
      production_title: activeCompany?.name ?? "Produzione",
      project_title: project.title,
      day_number: day.day_number,
      date: day.date,
      location: location?.name ?? "—",
      maps_link: location?.maps_link ?? "",
      weather_notes: "Aggiornare previsioni meteo il giorno prima delle riprese.",
      schedule: [
        { time: day.general_crew_call, activity: "Convocazione crew generale" },
        { time: day.makeup_call, activity: "Convocazione trucco e parrucco" },
        { time: day.cast_call, activity: "Convocazione cast" },
        { time: day.first_shot, activity: "Primo ciak" },
        { time: day.lunch.split("–")[0]?.trim() ?? day.lunch, activity: "Pausa pranzo" },
        { time: day.estimated_wrap, activity: "Wrap stimato" },
      ],
      scenes_to_shoot: sceneNums,
      cast_call_times: castCrew
        .filter((c) => c.department === "Cast")
        .map((c) => ({ name: c.full_name, role: c.role, department: c.department, call_time: c.call_time || day.cast_call })),
      crew_call_times: castCrew
        .filter((c) => c.department !== "Cast")
        .map((c) => ({ name: c.full_name, role: c.role, department: c.department, call_time: c.call_time || day.general_crew_call })),
      department_notes: {
        Produzione: day.production_notes || "—",
        Trasporti: day.transport_notes || "—",
      },
      parking_notes: day.parking || location?.parking_notes || "—",
      transport_notes: day.transport_notes,
      emergency_contacts: day.emergency_contact
        ? [{ name: "Produzione", role: "Emergenza", phone: day.emergency_contact }]
        : [],
      production_notes: day.production_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLocalPreview(generated);
    setActiveCallSheet(generated);
    const saved = await saveCallSheet(generated);
    if (saved) {
      setLocalPreview(saved);
      setActiveCallSheet(saved);
    }
    setToastVariant("success");
    setToast(`Call sheet v${version} generato per ${day.day_number}.`);
  };

  const updateStatus = async (status: CallSheetStatus) => {
    if (!preview) return;
    const updated = { ...preview, status, updated_at: new Date().toISOString() };
    setLocalPreview(updated);
    setActiveCallSheet(updated);
    await saveCallSheet(updated);
    setToastVariant("success");
    setToast(`Stato aggiornato: ${STATUS_LABELS[status]}.`);
  };

  const handleSaveVersion = async () => {
    if (!preview) return;
    const saved = await saveCallSheet(preview);
    if (saved) {
      setLocalPreview(saved);
      setActiveCallSheet(saved);
      setToastVariant("success");
      setToast(`Call sheet v${saved.version} salvato.`);
    } else {
      setToastVariant("error");
      setToast("Errore nel salvataggio del call sheet.");
    }
  };

  const handleExportPdf = async () => {
    if (!projectId) return;

    const callSheetId =
      preview?.id && UUID_RE.test(preview.id) ? preview.id : undefined;
    const shootingDayId =
      preview?.shooting_day_id && UUID_RE.test(preview.shooting_day_id)
        ? preview.shooting_day_id
        : effectiveDayId && UUID_RE.test(effectiveDayId)
          ? effectiveDayId
          : undefined;

    if (!callSheetId && !shootingDayId) {
      setToastVariant("warning");
      setToast("Seleziona una giornata o genera un call sheet prima dell'export.");
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/call-sheets/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...(callSheetId ? { callSheetId } : {}),
          ...(!callSheetId && shootingDayId ? { shootingDayId } : {}),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setToastVariant("error");
        setToast(data.error ?? "Generazione PDF fallita");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? "systemlix-call-sheet.pdf";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setToastVariant("success");
      setToast("PDF scaricato correttamente.");
    } catch {
      setToastVariant("error");
      setToast("Errore di rete durante la generazione del PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isProjectReady) {
    return (
      <EmptyState
        icon={FileText}
        title="Nessun progetto attivo"
        description="Seleziona un progetto per gestire i call sheet."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Call Sheet Generator"
        description={`${callSheets.length} versioni salvate nel progetto`}
      />

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)] items-start">
        {/* Left — Controls */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <PremiumCard padding="md">
            <Select
              label="Giornata di ripresa"
              value={effectiveDayId}
              onChange={(e) => setSelectedDayId(e.target.value)}
              options={shootingDays.length ? shootingDays.map((d) => ({
                value: d.id,
                label: `${d.day_number} — ${new Date(d.date).toLocaleDateString("it-IT")}`,
              })) : [{ value: "", label: "Nessuna giornata" }]}
            />

            {preview && (
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <Badge variant={preview.status === "final" ? "final" : preview.status === "locked" ? "locked" : "draft"}>
                  v{preview.version} · {STATUS_LABELS[preview.status]}
                </Badge>
              </div>
            )}
          </PremiumCard>

          <PremiumCard padding="md" className="space-y-2">
            <Button
              onClick={generateCallSheet}
              disabled={!canEditProject || !effectiveDayId}
              className="w-full"
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5" />Genera call sheet
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveVersion}
              disabled={!preview || !canEditProject}
              className="w-full"
              size="sm"
            >
              <Save className="h-3.5 w-3.5" />Salva versione
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={isExporting || (!preview && !effectiveDayId)}
              className="w-full"
              size="sm"
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? "Generazione PDF in corso..." : "Esporta PDF"}
            </Button>
            <div className="flex gap-2 pt-1">
              <Button
                variant="subtle"
                onClick={() => updateStatus("final")}
                disabled={!preview || !canEditProject}
                className="flex-1"
                size="sm"
              >
                <CheckCircle className="h-3.5 w-3.5" />Finale
              </Button>
              <Button
                variant="danger"
                onClick={() => updateStatus("locked")}
                disabled={!preview || !canEditProject}
                className="flex-1"
                size="sm"
              >
                <Lock className="h-3.5 w-3.5" />Blocca
              </Button>
            </div>
          </PremiumCard>
        </div>

        {/* Right — Preview */}
        <div>
          {preview ? (
            <CallSheetPreview callSheet={preview} />
          ) : (
            <EmptyState
              icon={FileText}
              title="Nessun call sheet generato"
              description={
                shootingDays.length === 0
                  ? "Crea una giornata di ripresa per generare il call sheet."
                  : "Seleziona una giornata e clicca Genera call sheet."
              }
              action={
                shootingDays.length > 0 && (
                  <Button onClick={generateCallSheet} disabled={!canEditProject} size="sm">
                    Genera call sheet
                  </Button>
                )
              }
            />
          )}
        </div>
      </div>

      <Toast
        message={toast ?? ""}
        open={!!toast}
        onClose={() => setToast(null)}
        variant={toastVariant}
      />
    </div>
  );
}
