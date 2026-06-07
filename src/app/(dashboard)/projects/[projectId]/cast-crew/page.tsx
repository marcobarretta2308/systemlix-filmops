"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
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
import type { CastCrewStatus } from "@/lib/types";
import { Plus, Users } from "lucide-react";
import { useState } from "react";

const STATUS_LABELS: Record<CastCrewStatus, string> = {
  confirmed: "Confermato", pending: "In attesa", issue: "Problema",
};

export default function CastCrewPage() {
  useSyncProjectFromUrl();
  const { castCrew, addCastCrewMember, canEditProject } = useProject();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "", role: "", department: "", phone: "", email: "",
    call_time: "07:00", permission_level: "viewer", status: "pending" as CastCrewStatus,
  });

  const handleAdd = () => {
    if (!form.full_name.trim()) return;
    addCastCrewMember({
      full_name: form.full_name,
      role: form.role,
      department: form.department,
      phone: form.phone,
      email: form.email,
      call_time: form.call_time,
      permission_level: form.permission_level,
      status: form.status,
    });
    setOpen(false);
    setForm({ full_name: "", role: "", department: "", phone: "", email: "", call_time: "07:00", permission_level: "viewer", status: "pending" });
  };

  return (
    <div>
      <PageHeader
        title="Cast & Crew"
        description={`${castCrew.length} persone nel progetto attivo`}
        actions={canEditProject && (
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4" />Aggiungi elemento
          </Button>
        )}
      />

      {castCrew.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun dato presente"
          description="Aggiungi cast e crew per gestire convocazioni e permessi."
          action={
            canEditProject && (
              <Button onClick={() => setOpen(true)} size="sm">Aggiungi persona</Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHead>
              <TableRow>
                {["Nome", "Ruolo", "Reparto", "Telefono", "Email", "Convocazione", "Stato", "Permessi"].map((h) => (
                  <TableTh key={h}>{h}</TableTh>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {castCrew.map((m) => (
                <TableRow key={m.id}>
                  <TableTd className="font-medium text-slate-200">{m.full_name}</TableTd>
                  <TableTd>{m.role}</TableTd>
                  <TableTd className="text-slate-500">{m.department}</TableTd>
                  <TableTd className="text-[12px] text-slate-500">{m.phone}</TableTd>
                  <TableTd className="text-[12px] text-slate-500">{m.email}</TableTd>
                  <TableTd className="font-mono text-slate-300">{m.call_time}</TableTd>
                  <TableTd>
                    <Badge variant={m.status === "confirmed" ? "confirmed" : m.status === "issue" ? "issue" : "pending"}>
                      {STATUS_LABELS[m.status]}
                    </Badge>
                  </TableTd>
                  <TableTd><Badge variant="violet">{m.permission_level}</Badge></TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Aggiungi cast / crew" size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
          <Input label="Ruolo" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
          <Input label="Reparto" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
          <Input label="Telefono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <Input label="Convocazione" value={form.call_time} onChange={(e) => setForm((p) => ({ ...p, call_time: e.target.value }))} />
          <Select label="Permessi" value={form.permission_level} onChange={(e) => setForm((p) => ({ ...p, permission_level: e.target.value }))} options={[{ value: "viewer", label: "Viewer" }, { value: "editor", label: "Editor" }, { value: "admin", label: "Admin" }]} />
          <Select label="Stato conferma" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as CastCrewStatus }))} options={[{ value: "confirmed", label: "Confermato" }, { value: "pending", label: "In attesa" }, { value: "issue", label: "Problema" }]} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
          <Button onClick={handleAdd} disabled={!form.full_name.trim()}>Aggiungi</Button>
        </div>
      </Modal>
    </div>
  );
}
