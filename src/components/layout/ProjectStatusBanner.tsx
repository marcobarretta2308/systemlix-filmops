"use client";

import { useCompany, useProject } from "@/lib/context/PlatformContext";
import {
  isProjectPaused,
  isProjectRestricted,
  PROJECT_STATUS_LABELS,
} from "@/lib/utils/project-status";
import { Lock, PauseCircle } from "lucide-react";

export function ProjectStatusBanner() {
  const { canManageCompany } = useCompany();
  const { activeProject, canEditProject } = useProject();

  if (!activeProject) return null;

  const { status } = activeProject;

  if (isProjectRestricted(status)) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-[rgba(248,113,113,0.12)] bg-[rgba(248,113,113,0.04)] px-4 py-3">
        <Lock className="h-3.5 w-3.5 text-[var(--accent-red)] shrink-0 mt-0.5 opacity-80" />
        <div>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            <span className="text-[var(--text-primary)]">Blocco operativo.</span>{" "}
            Progetto {PROJECT_STATUS_LABELS[status].toLowerCase()} — accessi operativi disabilitati
            {!canManageCompany ? " per il tuo ruolo" : ""}.
          </p>
          {!canEditProject && (
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              La modifica dei dati non è consentita.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isProjectPaused(status)) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.04)] px-4 py-3">
        <PauseCircle className="h-3.5 w-3.5 text-[var(--accent-amber)] shrink-0 mt-0.5 opacity-80" />
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          Progetto in pausa — alcune azioni di produzione possono essere limitate.
        </p>
      </div>
    );
  }

  return null;
}
