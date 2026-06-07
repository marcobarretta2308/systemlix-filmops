"use client";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useAuth, useProject } from "@/lib/context/PlatformContext";
import type { ArchiveAction } from "@/lib/types";
import { Archive, AlertTriangle, Download, Lock, RotateCcw } from "lucide-react";
import { useState } from "react";

const ACTION_LABELS: Record<string, string> = {
  archived: "Archiviato",
  locked: "Bloccato",
  completed: "Completato",
  exported: "Export dati",
  unlocked: "Riattivato",
};

export default function ArchivePage() {
  const { project } = useSyncProjectFromUrl();
  const { user } = useAuth();
  const {
    archiveProject,
    reactivateProject,
    archiveLogs,
    canArchiveProject,
    canReactivateProject,
  } = useProject();
  const [modalAction, setModalAction] = useState<ArchiveAction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!project) return <p className="text-[13px] text-[var(--text-muted)]">Progetto non trovato.</p>;

  const handleConfirm = () => {
    if (!modalAction) return;
    if (modalAction === "exported") {
      archiveProject("exported", "Export richiesto");
      setToast("Esportazione dati progetto — pronta per integrazione backend.");
    } else {
      archiveProject(modalAction);
      if (["archived", "locked", "completed"].includes(modalAction)) {
        setToast("Progetto aggiornato. Gli accessi operativi sono disabilitati per i non admin.");
      }
    }
    setModalAction(null);
  };

  const handleReactivate = () => {
    reactivateProject();
    setToast("Progetto riattivato con successo.");
  };

  const performerName = (userId: string) =>
    userId === user?.id ? user.full_name : userId;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Archivio e blocco"
        description="Gestione ciclo di vita e accessi del progetto"
        badge={<StatusBadge status={project.status} />}
      />

      {/* Warning */}
      <PremiumCard padding="md" className="border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.03)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[var(--accent-amber)] shrink-0 mt-0.5 opacity-80" />
          <div>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Archiviare o bloccare un progetto limita gli accessi operativi.
              I dati restano conservati ma cast, crew e reparti non admin non potranno modificare contenuti.
            </p>
          </div>
        </div>
      </PremiumCard>

      {/* Actions */}
      <section>
        <SectionTitle title="Azioni disponibili" />
        <div className="grid gap-[var(--card-gap)] sm:grid-cols-2">
          <PremiumCard padding="md">
            <div className="flex items-start gap-3">
              <Download className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[14px] text-[var(--text-primary)]">Esporta dati</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  Richiedi export completo del progetto.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setModalAction("exported")}>
                  Esporta
                </Button>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard padding="md">
            <div className="flex items-start gap-3">
              <Archive className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[14px] text-[var(--text-primary)]">Archivia progetto</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  Mantiene i dati, disabilita l&apos;accesso operativo.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={!canArchiveProject}
                  onClick={() => setModalAction("archived")}
                >
                  Archivia
                </Button>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard padding="md">
            <div className="flex items-start gap-3">
              <Lock className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[14px] text-[var(--text-primary)]">Blocca accessi</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  Blocca cast, crew e utenti non admin.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-3"
                  disabled={!canArchiveProject}
                  onClick={() => setModalAction("locked")}
                >
                  Blocca
                </Button>
              </div>
            </div>
          </PremiumCard>

          {(project.status === "archived" || project.status === "locked") && canReactivateProject && (
            <PremiumCard padding="md" className="border-[var(--border-default)]">
              <div className="flex items-start gap-3">
                <RotateCcw className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[14px] text-[var(--text-primary)]">Riattiva progetto</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                    Ripristina gli accessi operativi per il team.
                  </p>
                  <Button size="sm" className="mt-3" onClick={handleReactivate}>
                    <RotateCcw className="h-3.5 w-3.5" />Riattiva
                  </Button>
                </div>
              </div>
            </PremiumCard>
          )}
        </div>
      </section>

      {/* Log */}
      {archiveLogs.length > 0 && (
        <section>
          <SectionTitle title="Log attività" description="Storico operazioni sul progetto" />
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Azione</TableTh>
                <TableTh>Dettaglio</TableTh>
                <TableTh>Eseguito da</TableTh>
                <TableTh className="text-right">Data</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {archiveLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableTd className="text-[var(--text-primary)] font-medium">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </TableTd>
                  <TableTd className="text-[var(--text-muted)]">{log.notes || "—"}</TableTd>
                  <TableTd className="text-[var(--text-muted)]">{performerName(log.performed_by)}</TableTd>
                  <TableTd className="text-right text-[12px] text-[var(--text-muted)]">
                    {new Date(log.created_at).toLocaleString("it-IT")}
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <Modal open={modalAction !== null} onClose={() => setModalAction(null)} title="Conferma azione">
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed mb-6">
          Confermi questa operazione? L&apos;azione verrà registrata nel log.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalAction(null)}>Annulla</Button>
          <Button variant={modalAction === "locked" ? "danger" : "primary"} onClick={handleConfirm}>
            Conferma
          </Button>
        </div>
      </Modal>

      <Toast message={toast ?? ""} open={!!toast} onClose={() => setToast(null)} />
    </div>
  );
}
