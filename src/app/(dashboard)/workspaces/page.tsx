"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { useCompany, useProject } from "@/lib/context/PlatformContext";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function WorkspacesPage() {
  const {
    activeCompany,
    companyWorkspaces,
    activeWorkspace,
    setActiveWorkspace,
    createWorkspace,
    canCreateWorkspace,
  } = useCompany();
  const { accessibleProjectsAll } = useProject();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const projectsInWorkspace = (wsId: string) =>
    accessibleProjectsAll.filter((p) => p.workspace_id === wsId);

  const handleCreate = () => {
    if (!name.trim()) return;
    createWorkspace({ name: name.trim(), description: description.trim() });
    setModalOpen(false);
    setName("");
    setDescription("");
  };

  return (
    <div>
      <PageHeader
        title="Workspace"
        description={activeCompany?.name ?? "—"}
        actions={
          canCreateWorkspace && (
            <Button onClick={() => setModalOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              Nuovo workspace
            </Button>
          )
        }
      />

      {companyWorkspaces.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nessun workspace presente"
          description="Crea un workspace per organizzare i progetti della produzione."
          action={
            canCreateWorkspace && (
              <Button onClick={() => setModalOpen(true)} size="sm">Crea workspace</Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companyWorkspaces.map((ws) => (
            <Card key={ws.id} padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--accent-cyan-muted)] shrink-0">
                    <Building2 className="h-4 w-4 text-cyan-400/70" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-[14px] break-words">{ws.name}</CardTitle>
                    <CardDescription className="mt-0.5 line-clamp-2">{ws.description}</CardDescription>
                  </div>
                </div>
                {activeWorkspace?.id === ws.id && (
                  <span className="text-[10px] font-medium uppercase tracking-wider text-cyan-400/80 shrink-0">
                    Attivo
                  </span>
                )}
              </div>
              <p className="mt-3 text-[12px] text-slate-600">
                {projectsInWorkspace(ws.id).length} progetti
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant={activeWorkspace?.id === ws.id ? "secondary" : "outline"}
                  onClick={() => setActiveWorkspace(ws.id)}
                >
                  {activeWorkspace?.id === ws.id ? "Selezionato" : "Seleziona"}
                </Button>
                <Link href="/projects">
                  <Button size="sm" variant="ghost">Vedi progetti</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo workspace">
        <div className="space-y-4">
          <Input label="Nome workspace" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Produzione 2026" />
          <Textarea label="Descrizione" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>Crea workspace</Button>
        </div>
      </Modal>
    </div>
  );
}
