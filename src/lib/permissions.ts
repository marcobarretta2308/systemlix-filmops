import type {
  CompanyRole,
  Project,
  ProjectRole,
  ProjectStatus,
} from "@/lib/types";

const ADMIN_COMPANY_ROLES: CompanyRole[] = [
  "platform_owner",
  "company_admin",
];

const ADMIN_PROJECT_ROLES: ProjectRole[] = ["project_admin"];

const EDIT_PROJECT_ROLES: ProjectRole[] = [
  "project_admin",
  "producer",
  "assistant_director",
];

export function isProjectRestricted(status: ProjectStatus): boolean {
  return status === "archived" || status === "locked";
}

export function canManagePlatform(role: CompanyRole): boolean {
  return role === "platform_owner";
}

export function canManageCompany(role: CompanyRole): boolean {
  return ADMIN_COMPANY_ROLES.includes(role);
}

export function canCreateWorkspace(role: CompanyRole): boolean {
  return ADMIN_COMPANY_ROLES.includes(role);
}

export function canCreateProject(role: CompanyRole): boolean {
  return ADMIN_COMPANY_ROLES.includes(role) || role === "producer";
}

export function canInviteUsers(role: CompanyRole): boolean {
  return ADMIN_COMPANY_ROLES.includes(role);
}

export function canArchiveProject(
  companyRole: CompanyRole,
  projectRole?: ProjectRole
): boolean {
  return (
    canManageCompany(companyRole) ||
    (projectRole !== undefined && ADMIN_PROJECT_ROLES.includes(projectRole))
  );
}

export function canEditProject(
  project: Project,
  companyRole: CompanyRole,
  projectRole?: ProjectRole
): boolean {
  if (isProjectRestricted(project.status)) {
    return canManageCompany(companyRole);
  }
  if (project.status === "paused") {
    if (canManageCompany(companyRole)) return true;
    if (projectRole && ADMIN_PROJECT_ROLES.includes(projectRole)) return true;
    return false;
  }
  if (canManageCompany(companyRole)) return true;
  if (!projectRole) return false;
  return EDIT_PROJECT_ROLES.includes(projectRole);
}

export function canReactivateProject(companyRole: CompanyRole): boolean {
  return canManageCompany(companyRole);
}

export function canViewProject(
  project: Project,
  companyRole: CompanyRole,
  projectRole?: ProjectRole
): boolean {
  if (canManageCompany(companyRole)) return true;
  if (!projectRole) return false;
  if (isProjectRestricted(project.status)) {
    return ADMIN_PROJECT_ROLES.includes(projectRole);
  }
  return true;
}

export function canAccessCastCrewView(projectRole?: ProjectRole): boolean {
  if (!projectRole) return false;
  return [
    "cast_crew_user",
    "department_user",
    "assistant_director",
    "producer",
    "project_admin",
  ].includes(projectRole);
}

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  platform_owner: "Platform Owner",
  company_admin: "Company Admin",
  producer: "Producer",
  viewer: "Viewer",
};

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  project_admin: "Project Admin",
  producer: "Producer",
  assistant_director: "Assistant Director",
  department_user: "Department User",
  cast_crew_user: "Cast/Crew User",
  viewer: "Viewer",
};
