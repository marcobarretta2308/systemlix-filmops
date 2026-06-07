"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useProject } from "@/lib/context/PlatformContext";
import { Car, ExternalLink, FileText, KeyRound, MapPin, Plus } from "lucide-react";
import { useState } from "react";

export default function LocationsPage() {
  useSyncProjectFromUrl();
  const { locations, addLocation, canEditProject } = useProject();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", maps_link: "https://maps.google.com/",
    parking_notes: "", access_notes: "", production_notes: "",
  });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addLocation({
      name: form.name,
      address: form.address,
      maps_link: form.maps_link,
      parking_notes: form.parking_notes,
      access_notes: form.access_notes,
      production_notes: form.production_notes,
    });
    setOpen(false);
    setForm({ name: "", address: "", maps_link: "https://maps.google.com/", parking_notes: "", access_notes: "", production_notes: "" });
  };

  return (
    <div>
      <PageHeader
        title="Location"
        description={`${locations.length} location nel progetto attivo`}
        actions={canEditProject && (
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4" />Aggiungi elemento
          </Button>
        )}
      />

      {locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nessun dato presente"
          description="Registra le location di ripresa con indirizzo, accesso e note operative."
          action={
            canEditProject && (
              <Button onClick={() => setOpen(true)} size="sm">Nuova location</Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map((loc) => (
            <Card key={loc.id} padding="md">
              <div className="flex gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--accent-cyan-muted)] shrink-0">
                  <MapPin className="h-4 w-4 text-cyan-400/70" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-[14px]">{loc.name}</CardTitle>
                  <CardDescription className="mt-0.5 break-words">{loc.address}</CardDescription>
                </div>
              </div>

              <a
                href={loc.maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-cyan-400/90 transition-colors mb-4"
              >
                <ExternalLink className="h-3.5 w-3.5" />Apri mappa
              </a>

              <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
                <div className="flex gap-2.5">
                  <Car className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Parcheggio</p>
                    <p className="text-[13px] text-slate-400 mt-0.5">{loc.parking_notes || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <KeyRound className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Accesso</p>
                    <p className="text-[13px] text-slate-400 mt-0.5">{loc.access_notes || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <FileText className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Note produzione</p>
                    <p className="text-[13px] text-slate-400 mt-0.5">{loc.production_notes || "—"}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuova location" size="lg">
        <div className="grid gap-4">
          <Input label="Nome location" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Indirizzo" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          <Input label="Link Google Maps" value={form.maps_link} onChange={(e) => setForm((p) => ({ ...p, maps_link: e.target.value }))} />
          <Textarea label="Note parcheggio" value={form.parking_notes} onChange={(e) => setForm((p) => ({ ...p, parking_notes: e.target.value }))} />
          <Textarea label="Note accesso" value={form.access_notes} onChange={(e) => setForm((p) => ({ ...p, access_notes: e.target.value }))} />
          <Textarea label="Note produzione" value={form.production_notes} onChange={(e) => setForm((p) => ({ ...p, production_notes: e.target.value }))} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
          <Button onClick={handleAdd} disabled={!form.name.trim()}>Crea location</Button>
        </div>
      </Modal>
    </div>
  );
}
