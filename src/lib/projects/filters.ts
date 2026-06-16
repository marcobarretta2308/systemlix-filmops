import type { Project } from "@/lib/types";

const HIDDEN_STATUSES = new Set(["deleted", "trashed"]);

export function isProjectVisible(project: Project): boolean {
  if (project.is_deleted === true) return false;
  const status = (project.status ?? "").toLowerCase();
  if (HIDDEN_STATUSES.has(status)) return false;
  return true;
}

export function filterVisibleProjects(projects: Project[]): Project[] {
  return projects.filter(isProjectVisible);
}
