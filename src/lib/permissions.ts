import {
  isPlatformOwnerUser,
  isProjectFinished,
  isProjectMembershipActive,
} from "@/lib/access-control";
import type { ProjectPermissions } from "@/lib/permissions/project-permissions";
import type {
  CompanyMember,
  CompanyRole,
  Project,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
  User,
} from "@/lib/types";

export function hasAnyEditPermission(permissions: ProjectPermissions): boolean {
  return (
    permissions.can_edit_breakdown ||
    permissions.can_edit_scenes ||
    permissions.can_edit_cast_crew ||
    permissions.can_edit_locations ||
    permissions.can_edit_shooting_days ||
    permissions.can_edit_call_sheets
  );
}

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

const SCENE_DAY_CALLSHEET_ROLES: ProjectRole[] = [
  "project_admin",
  "producer",
  "assistant_director",
];

export function isProjectRestricted(status: ProjectStatus): boolean {
  return isProjectFinished(status);
}

export function isCompanyAdmin(role: CompanyRole): boolean {
  return role === "company_admin";
}

export function canManagePlatform(user: User | null, companyRole?: CompanyRole | null): boolean {
  return isPlatformOwnerUser(user) || companyRole === "platform_owner";
}

export function canManageCompany(role: CompanyRole): boolean {
  return ADMIN_COMPANY_ROLES.includes(role);
}

export function canCreateWorkspace(user: User | null, role: CompanyRole): boolean {
  return canManagePlatform(user, role) || role === "company_admin";
}

export function canCreateProject(user: User | null, role: CompanyRole): boolean {
  if (canManagePlatform(user, role)) return true;
  if (role === "company_admin") return true;
  return false;
}

export function canInviteUsers(user: User | null, role: CompanyRole): boolean {
  if (canManagePlatform(user)) return true;
  return role === "company_admin";
}

export function canCreateGlobalUsers(user: User | null): boolean {
  return isPlatformOwnerUser(user);
}

export function canArchiveProject(
  user: User | null,
  companyRole: CompanyRole,
  projectRole?: ProjectRole
): boolean {
  if (canManagePlatform(user, companyRole)) return true;
  if (companyRole === "company_admin") return true;
  return projectRole !== undefined && ADMIN_PROJECT_ROLES.includes(projectRole);
}

const DELETE_PROJECT_ROLES: ProjectRole[] = ["project_admin", "producer"];

export function canDeleteProject(
  user: User | null,
  companyRole: CompanyRole,
  projectRole?: ProjectRole
): boolean {
  if (canManagePlatform(user, companyRole)) return true;
  if (companyRole === "company_admin") return true;
  return (
    projectRole !== undefined && DELETE_PROJECT_ROLES.includes(projectRole)
  );
}

export function canEditProject(
  project: Project,
  user: User | null,
  companyRole: CompanyRole,
  projectRole?: ProjectRole,
  projectMembership?: ProjectMember | null,
  permissions?: ProjectPermissions | null
): boolean {
  if (projectMembership && !isProjectMembershipActive(projectMembership)) {
    return false;
  }

  if (isProjectRestricted(project.status)) {
    return canManagePlatform(user, companyRole);
  }

  if (project.status === "paused") {
    if (canManagePlatform(user, companyRole) || companyRole === "company_admin") return true;
    if (projectRole && ADMIN_PROJECT_ROLES.includes(projectRole)) return true;
    return false;
  }

  if (canManagePlatform(user, companyRole) || companyRole === "company_admin") return true;

  if (permissions && hasAnyEditPermission(permissions)) return true;

  if (!projectRole) return false;

  if (projectRole === "viewer" || projectRole === "cast_crew_user") return false;
  if (projectRole === "department_user") return false;

  return EDIT_PROJECT_ROLES.includes(projectRole);
}

export function canManageScenesAndSchedule(
  project: Project,
  user: User | null,
  companyRole: CompanyRole,
  projectRole?: ProjectRole
): boolean {
  if (!canEditProject(project, user, companyRole, projectRole)) return false;
  if (!projectRole) return canManagePlatform(user, companyRole);
  return SCENE_DAY_CALLSHEET_ROLES.includes(projectRole) || canManagePlatform(user, companyRole);
}

export function canReactivateProject(user: User | null, companyRole: CompanyRole): boolean {
  return canManagePlatform(user, companyRole);
}

export function isProjectSoftDeleted(project: Project): boolean {
  return Boolean(project.is_deleted);
}

export function canViewProject(
  project: Project,
  user: User | null,
  companyRole: CompanyRole,
  projectRole?: ProjectRole,
  projectMembership?: ProjectMember | null,
  companyMembership?: CompanyMember | null
): boolean {
  if (isProjectSoftDeleted(project)) {
    return canManagePlatform(user, companyRole) || companyRole === "company_admin";
  }

  if (canManagePlatform(user, companyRole) || companyRole === "company_admin") return true;

  if (projectMembership && !isProjectMembershipActive(projectMembership)) {
    return false;
  }

  if (companyMembership?.status === "revoked" || companyMembership?.status === "suspended") {
    return false;
  }

  if (!projectRole) return false;

  if (isProjectRestricted(project.status)) {
    return ADMIN_PROJECT_ROLES.includes(projectRole);
  }

  return true;
}

export function canReadOnlyProject(projectRole?: ProjectRole): boolean {
  return projectRole === "viewer";
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
  cast_crew_user: "Cast/Crew",
  viewer: "Viewer",
};
