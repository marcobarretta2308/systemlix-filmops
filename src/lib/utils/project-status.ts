import type { ProjectStatus } from "@/lib/types";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Attivo",
  paused: "In pausa",
  archived: "Archiviato",
  locked: "Bloccato",
};

export const PROJECT_STATUS_VARIANTS: Record<
  ProjectStatus,
  "active" | "paused" | "archived" | "locked"
> = {
  active: "active",
  paused: "paused",
  archived: "archived",
  locked: "locked",
};

export function isProjectPaused(status: ProjectStatus): boolean {
  return status === "paused";
}

export function isProjectRestricted(status: ProjectStatus): boolean {
  return status === "archived" || status === "locked";
}
