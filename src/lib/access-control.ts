import type {
  AccessStatus,
  AuthStatus,
  CompanyMember,
  GlobalRole,
  MemberStatus,
  Project,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
  User,
} from "@/lib/types";

export function isAuthActive(user: User | null): boolean {
  if (!user) return false;
  return (user.auth_status ?? "active") === "active";
}

export function isPlatformOwnerUser(user: User | null): boolean {
  if (!user) return false;
  return user.global_role === "platform_owner";
}

export function isAccessWithinDateRange(
  start?: string | null,
  end?: string | null,
  now: Date = new Date()
): boolean {
  const today = now.toISOString().split("T")[0];
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

export function isCompanyMembershipActive(member: CompanyMember): boolean {
  if (member.status !== "active") return false;
  return isAccessWithinDateRange(
    member.access_start_date,
    member.access_end_date
  );
}

export function isProjectMembershipActive(member: ProjectMember): boolean {
  if (member.access_status !== "active") return false;
  return isAccessWithinDateRange(
    member.access_start_date,
    member.access_end_date
  );
}

export function hasActiveCompanyAccess(
  memberships: CompanyMember[],
  companyId: string
): boolean {
  const m = memberships.find((x) => x.company_id === companyId);
  return m ? isCompanyMembershipActive(m) : false;
}

export function hasActiveProjectAccess(
  memberships: ProjectMember[],
  projectId: string
): boolean {
  const m = memberships.find((x) => x.project_id === projectId);
  return m ? isProjectMembershipActive(m) : false;
}

export type AccessDenialReason =
  | "not_authenticated"
  | "auth_suspended"
  | "auth_revoked"
  | "auth_banned"
  | "no_company"
  | "company_revoked"
  | "no_project"
  | "project_revoked"
  | "project_archived"
  | "unauthorized";

export function getAuthDenialReason(user: User | null): AccessDenialReason | null {
  if (!user) return "not_authenticated";
  const status = user.auth_status ?? "active";
  if (status === "suspended") return "auth_suspended";
  if (status === "revoked") return "auth_revoked";
  if (status === "banned") return "auth_banned";
  return null;
}

export function isProjectFinished(status: ProjectStatus): boolean {
  return status === "archived" || status === "locked";
}

export const AUTH_STATUS_LABELS: Record<AuthStatus, string> = {
  active: "Attivo",
  suspended: "Sospeso",
  revoked: "Revocato",
  banned: "Disabilitato",
};

export const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  platform_owner: "Platform Owner",
  user: "Utente",
};

export const MEMBER_ACCESS_LABELS: Record<MemberStatus, string> = {
  active: "Attivo",
  suspended: "Sospeso",
  revoked: "Revocato",
};

export const PROJECT_ACCESS_LABELS: Record<AccessStatus, string> = {
  active: "Attivo",
  suspended: "Sospeso",
  revoked: "Revocato",
};

/** Ruoli operativi revocabili a fine progetto */
export const REVOKABLE_PROJECT_ROLES: ProjectRole[] = [
  "producer",
  "assistant_director",
  "department_user",
  "cast_crew_user",
  "viewer",
];
