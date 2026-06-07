const COMPANY_KEY = "systemlix_active_company_id";
const WORKSPACE_KEY = "systemlix_active_workspace_id";
const PROJECT_KEY = "systemlix_active_project_id";

export function getStoredCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(COMPANY_KEY);
}

export function setStoredCompanyId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(COMPANY_KEY, id);
  else localStorage.removeItem(COMPANY_KEY);
}

export function getStoredWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(WORKSPACE_KEY);
}

export function setStoredWorkspaceId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(WORKSPACE_KEY, id);
  else localStorage.removeItem(WORKSPACE_KEY);
}

export function getStoredProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROJECT_KEY);
}

export function setStoredProjectId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(PROJECT_KEY, id);
  else localStorage.removeItem(PROJECT_KEY);
}

export function clearStoredSession() {
  setStoredCompanyId(null);
  setStoredWorkspaceId(null);
  setStoredProjectId(null);
}
