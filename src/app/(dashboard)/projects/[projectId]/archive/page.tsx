"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import type { ArchiveAction } from "@/lib/types";
import { PROJECT_STATUS_LABELS } from "@/lib/utils/project-status";
import {
  Archive,
  AlertTriangle,
  Download,
  Loader2,
  Lock,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { operationFailed } from "@/lib/utils/user-facing-error";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ACTION_LABELS: Record<string, string> = {
  project_archived: "Progetto archiviato",
  project_locked: "Progetto bloccato",
  project_deleted: "Progetto spostato nel cestino",
  access_revoked: "Accessi revocati",
  user_suspended: "Utente sospeso",
  user_reactivated: "Utente riattivato",
  project_exported: "Export dati",
  project_reactivated: "Progetto riattivato",
};

type ToastState = { message: string; variant: "success" | "error" } | null;

export default function ArchivePage() {
  const { project: urlProject } = useSyncProjectFromUrl();
  const { user, isPlatformOwner } = useAuth();
  const { canManagePlatform } = useCompany();
  const {
    activeProject,
    archiveProject,
    deleteProject,
    reactivateProject,
    archiveLogs,
    canArchiveProject,
    canDeleteProject,
    canReactivateProject,
  } = useProject();
  const router = useRouter();
  const project = urlProject ?? activeProject;
  const [modalAction, setModalAction] = useState<ArchiveAction | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [submitting, setSubmitting] = useState(false);

  const canManageLifecycle = isPlatformOwner || canManagePlatform;

  if (!project) {
    return <p className="text-[13px] text-[var(--text-muted)]">Progetto non trovato.</p>;
  }

  if (!canArchiveProject && !canDeleteProject) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        Non hai i permessi per visualizzare l&apos;archivio di questo progetto.
      </p>
    );
  }

  const showToast = (message: string, variant: "success" | "error") => {
    setToast({ message, variant });
  };

  const handleConfirm = async () => {
    if (!modalAction || submitting) return;
    setSubmitting(true);
    try {
      if (modalAction === "project_exported") {
        const result = await archiveProject("project_exported", "Export richiesto");
        if (result.ok) {
          showToast("Esportazione dati progetto — pronta per integrazione backend.", "success");
        } else {
          showToast(operationFailed(result.error ?? "Export failed"), "error");
        }
      } else {
        const result = await archiveProject(modalAction);
        if (result.ok) {
          const msg =
            modalAction === "project_archived"
              ? "Progetto archiviato. Gli accessi operativi non admin sono stati revocati."
              : "Progetto bloccato. Gli accessi operativi non admin sono stati revocati.";
          showToast(msg, "success");
        } else {
          showToast(operationFailed(result.error ?? "Operation failed"), "error");
        }
      }
    } finally {
      setSubmitting(false);
      setModalAction(null);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirm.trim() !== "ELIMINA") {
      showToast("Type ELIMINA to confirm", "error");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await deleteProject(deleteConfirm.trim());
      if (result.ok) {
        showToast("Project moved to trash", "success");
        setDeleteModalOpen(false);
        setDeleteConfirm("");
        router.push("/projects");
      } else {
        showToast(
          operationFailed(result.error ?? "Failed to delete project"),
          "error"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await reactivateProject();
      if (result.ok) {
        showToast(
          "Progetto riattivato. Gli accessi utenti vanno riabilitati manualmente.",
          "success"
        );
      } else {
        showToast(operationFailed(result.error ?? "Reactivation failed"), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const performerName = (userId: string) =>
    userId === user?.id ? user.full_name : userId;

  const isFinished = project.status === "archived" || project.status === "locked";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Archivio / Blocco progetto"
        description={project.title}
        badge={<StatusBadge status={project.status} />}
      />

      <PremiumCard padding="md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-[var(--text-muted)]">
              Progetto
            </p>
            <p className="mt-1 text-[16px] font-medium text-[var(--text-primary)]">
              {project.title}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] uppercase tracking-wide text-[var(--text-muted)]">
              Stato attuale
            </p>
            <p className="mt-1 text-[16px] font-medium text-[var(--text-primary)]">
              {PROJECT_STATUS_LABELS[project.status]}
            </p>
          </div>
          {isFinished && (
            <p className="text-[12px] text-[var(--text-muted)] max-w-sm leading-relaxed">
              Gli utenti non admin non possono accedere. I dati del progetto restano conservati.
            </p>
          )}
        </div>
      </PremiumCard>

      {canArchiveProject && (
        <PremiumCard padding="md" className="border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.03)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-[var(--accent-amber)] shrink-0 mt-0.5 opacity-80" />
            <div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Archiviare o bloccare un progetto revoca gli accessi operativi per cast, crew e reparti.
                I dati restano conservati. Solo il Platform Owner può archiviare, bloccare o riattivare.
              </p>
            </div>
          </div>
        </PremiumCard>
      )}

      {canArchiveProject && (
      <section>
        <SectionTitle title="Azioni disponibili" />
        <div className="grid gap-[var(--card-gap)] sm:grid-cols-2">
          <PremiumCard padding="md">
            <div className="flex items-start gap-3">
              <Download className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[14px] text-[var(--text-primary)]">Esporta dati</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  Full project export will be available in a future release. Use module exports (call sheets, reports) in the meantime.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={submitting}
                  onClick={() => setModalAction("project_exported")}
                >
                  Export dati
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
                  Imposta stato archiviato e revoca accessi operativi non admin.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={!canManageLifecycle || submitting || project.status === "archived"}
                  onClick={() => setModalAction("project_archived")}
                >
                  Archivia progetto
                </Button>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard padding="md">
            <div className="flex items-start gap-3">
              <Lock className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[14px] text-[var(--text-primary)]">Blocca progetto</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  Imposta stato bloccato e revoca accessi operativi non admin.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-3"
                  disabled={!canManageLifecycle || submitting || project.status === "locked"}
                  onClick={() => setModalAction("project_locked")}
                >
                  Blocca progetto
                </Button>
              </div>
            </div>
          </PremiumCard>

          {isFinished && canReactivateProject && (
            <PremiumCard padding="md" className="border-[var(--border-default)]">
              <div className="flex items-start gap-3">
                <RotateCcw className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[14px] text-[var(--text-primary)]">Riattiva progetto</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                    Ripristina stato attivo. Gli accessi revocati vanno riassegnati manualmente.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={submitting}
                    onClick={() => setModalAction("project_reactivated")}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />Riattiva progetto
                  </Button>
                </div>
              </div>
            </PremiumCard>
          )}
        </div>
      </section>
      )}

      {canDeleteProject && (
        <section>
          <SectionTitle
            title="Danger Zone"
            description="This action hides the project from active workspaces. Data is kept for recovery."
          />
          <PremiumCard
            padding="md"
            className="border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-[14px] font-medium text-[var(--text-primary)]">
                  Elimina progetto
                </p>
                <p className="mt-1 text-[12px] text-[var(--text-muted)] leading-relaxed">
                  Il progetto verrà spostato nel cestino e non comparirà più nella
                  dashboard. Scene, call sheet, documenti e report restano nel
                  database per un eventuale ripristino.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                disabled={submitting || project.is_deleted}
                onClick={() => setDeleteModalOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Elimina progetto
              </Button>
            </div>
          </PremiumCard>
        </section>
      )}

      {canArchiveProject && (
      <section>
        <SectionTitle title="Log attività" description="Storico operazioni sul progetto" />
        {archiveLogs.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">Nessuna operazione registrata.</p>
        ) : (
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
        )}
      </section>
      )}

      <Modal
        open={deleteModalOpen}
        onClose={() => !submitting && setDeleteModalOpen(false)}
        title="Elimina progetto"
      >
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed mb-4">
          Il progetto verrà spostato nel cestino e non comparirà più nella
          dashboard. I dati non verranno cancellati definitivamente.
        </p>
        <Input
          label="Scrivi ELIMINA per confermare"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder="ELIMINA"
          autoComplete="off"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => {
              setDeleteModalOpen(false);
              setDeleteConfirm("");
            }}
          >
            Annulla
          </Button>
          <Button
            variant="danger"
            disabled={submitting || deleteConfirm.trim() !== "ELIMINA"}
            onClick={handleDeleteProject}
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                In corso…
              </>
            ) : (
              "Conferma eliminazione"
            )}
          </Button>
        </div>
      </Modal>

      <Modal
        open={modalAction !== null}
        onClose={() => !submitting && setModalAction(null)}
        title="Conferma azione"
      >
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed mb-6">
          {modalAction === "project_reactivated"
            ? "Confermi la riattivazione del progetto? L'azione verrà registrata nel log."
            : "Confermi questa operazione? L'azione verrà registrata nel log."}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={submitting} onClick={() => setModalAction(null)}>
            Annulla
          </Button>
          <Button
            variant={modalAction === "project_locked" ? "danger" : "primary"}
            disabled={submitting}
            onClick={modalAction === "project_reactivated" ? handleReactivate : handleConfirm}
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                In corso…
              </>
            ) : (
              "Conferma"
            )}
          </Button>
        </div>
      </Modal>

      <Toast
        message={toast?.message ?? ""}
        open={!!toast}
        variant={toast?.variant ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
