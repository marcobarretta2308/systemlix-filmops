"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useProject } from "@/lib/context/PlatformContext";
import type { ShootingDay } from "@/lib/types";
import { Calendar, Loader2, Plus } from "lucide-react";
import { useState } from "react";

function ScheduleCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-0.5 text-[13px] font-mono text-slate-200">{value || "—"}</p>
    </div>
  );
}

export default function ShootingDaysPage() {
  const { projectId, isProjectReady } = useSyncProjectFromUrl();
  const {
    shootingDays,
    addShootingDay,
    locations,
    scenes,
    canEditProject,
    isLoadingProjectData,
  } = useProject();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ShootingDay>>({
    day_number: "", date: new Date().toISOString().split("T")[0],
    location_id: locations[0]?.id ?? "", selected_scene_ids: [],
    general_crew_call: "06:00", cast_call: "07:00", makeup_call: "06:30",
    first_shot: "08:00", lunch: "13:00–14:00", estimated_wrap: "20:00",
    parking: "", transport_notes: "", emergency_contact: "", production_notes: "",
  });

  const getLocationName = (id: string) => locations.find((l) => l.id === id)?.name ?? "—";
  const getSceneNumbers = (ids: string[]) => ids.map((id) => scenes.find((s) => s.id === id)?.scene_number ?? id).join(", ");

  const toggleScene = (id: string) => {
    setForm((p) => ({
      ...p,
      selected_scene_ids: p.selected_scene_ids?.includes(id)
        ? p.selected_scene_ids.filter((x) => x !== id)
        : [...(p.selected_scene_ids ?? []), id],
    }));
  };

  const handleCreate = async () => {
    if (!projectId || !form.day_number) return;
    const day = await addShootingDay({
      day_number: form.day_number!,
      date: form.date!,
      location_id: form.location_id!,
      selected_scene_ids: form.selected_scene_ids ?? [],
      general_crew_call: form.general_crew_call!,
      cast_call: form.cast_call!,
      makeup_call: form.makeup_call!,
      first_shot: form.first_shot!,
      lunch: form.lunch!,
      estimated_wrap: form.estimated_wrap!,
      parking: form.parking ?? "",
      transport_notes: form.transport_notes ?? "",
      emergency_contact: form.emergency_contact ?? "",
      production_notes: form.production_notes ?? "",
    });
    if (day) setOpen(false);
  };

  if (!isProjectReady) {
    return (
      <EmptyState
        icon={Calendar}
        title="No active project"
        description="Select a project to plan shooting days."
      />
    );
  }

  if (isLoadingProjectData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Shooting Days"
        description={`${shootingDays.length} giornate nel progetto attivo`}
        actions={canEditProject && (
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4" />Nuova giornata
          </Button>
        )}
      />

      {shootingDays.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No shooting days planned yet"
          description="Create your first shooting day to generate a call sheet."
          action={
            canEditProject && (
              <Button onClick={() => setOpen(true)} size="sm">Aggiungi giornata</Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {shootingDays.map((day) => (
            <Card key={day.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-violet-500/15 bg-violet-500/[0.06]">
                    <Calendar className="h-4 w-4 text-violet-300/80" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-slate-100">{day.day_number}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      {new Date(day.date).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="violet">{getLocationName(day.location_id)}</Badge>
                  {day.selected_scene_ids.length > 0 && (
                    <p className="mt-1.5 text-[12px] text-slate-500 font-mono">
                      Scene: {getSceneNumbers(day.selected_scene_ids)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <ScheduleCell label="Crew call" value={day.general_crew_call} />
                <ScheduleCell label="Cast call" value={day.cast_call} />
                <ScheduleCell label="Trucco" value={day.makeup_call} />
                <ScheduleCell label="Primo ciak" value={day.first_shot} />
                <ScheduleCell label="Pranzo" value={day.lunch} />
                <ScheduleCell label="Wrap" value={day.estimated_wrap} />
                <ScheduleCell label="Emergenza" value={day.emergency_contact} />
                <ScheduleCell label="Parcheggio" value={day.parking} />
              </div>

              {day.transport_notes && (
                <p className="mt-3 text-[12px] text-slate-600 border-t border-[var(--border-subtle)] pt-3">
                  Trasporti: {day.transport_notes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuova giornata di ripresa" size="xl">
        <div className="grid gap-4 sm:grid-cols-2 max-h-[65vh] overflow-y-auto pr-1">
          <Input label="Numero giornata" value={form.day_number} onChange={(e) => setForm((p) => ({ ...p, day_number: e.target.value }))} placeholder="Day 01" />
          <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          <Select label="Location" value={form.location_id} onChange={(e) => setForm((p) => ({ ...p, location_id: e.target.value }))} options={locations.map((l) => ({ value: l.id, label: l.name }))} />
          <Input label="Crew call" value={form.general_crew_call} onChange={(e) => setForm((p) => ({ ...p, general_crew_call: e.target.value }))} />
          <Input label="Cast call" value={form.cast_call} onChange={(e) => setForm((p) => ({ ...p, cast_call: e.target.value }))} />
          <Input label="Trucco" value={form.makeup_call} onChange={(e) => setForm((p) => ({ ...p, makeup_call: e.target.value }))} />
          <Input label="Primo ciak" value={form.first_shot} onChange={(e) => setForm((p) => ({ ...p, first_shot: e.target.value }))} />
          <Input label="Pranzo" value={form.lunch} onChange={(e) => setForm((p) => ({ ...p, lunch: e.target.value }))} />
          <Input label="Wrap previsto" value={form.estimated_wrap} onChange={(e) => setForm((p) => ({ ...p, estimated_wrap: e.target.value }))} />
          <Input label="Contatto emergenza" value={form.emergency_contact} onChange={(e) => setForm((p) => ({ ...p, emergency_contact: e.target.value }))} />
          <div className="sm:col-span-2"><Textarea label="Note trasporto" value={form.transport_notes} onChange={(e) => setForm((p) => ({ ...p, transport_notes: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Textarea label="Note produzione" value={form.production_notes} onChange={(e) => setForm((p) => ({ ...p, production_notes: e.target.value }))} /></div>
          <div className="sm:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">Scene selezionate</p>
            <div className="flex flex-wrap gap-1.5">
              {scenes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleScene(s.id)}
                  className={`rounded-full border px-3 py-1 text-[12px] transition-all duration-150 ${
                    form.selected_scene_ids?.includes(s.id)
                      ? "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-400/90"
                      : "border-[var(--border-subtle)] text-slate-500 hover:border-[var(--border-default)]"
                  }`}
                >
                  Scena {s.scene_number}
                </button>
              ))}
              {scenes.length === 0 && <p className="text-[12px] text-slate-600">Aggiungi scene prima di pianificare la giornata.</p>}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
          <Button onClick={handleCreate} disabled={!form.day_number}>Crea giornata</Button>
        </div>
      </Modal>
    </div>
  );
}
