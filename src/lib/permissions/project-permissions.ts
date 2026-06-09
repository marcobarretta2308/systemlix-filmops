import { isPlatformOwnerUser } from "@/lib/access-control";
import type {
  CompanyRole,
  ProjectMember,
  ProjectRole,
  User,
} from "@/lib/types";

export const DEPARTMENT_OPTIONS = [
  "Costumi",
  "Trucco",
  "Props",
  "Trasporti",
  "Location",
] as const;

export type DepartmentName = (typeof DEPARTMENT_OPTIONS)[number];

export interface ProjectPermissions {
  department?: string;
  permission_profile: string;
  can_view_breakdown: boolean;
  can_edit_breakdown: boolean;
  can_view_scenes: boolean;
  can_edit_scenes: boolean;
  can_view_cast_crew: boolean;
  can_edit_cast_crew: boolean;
  can_view_locations: boolean;
  can_edit_locations: boolean;
  can_view_shooting_days: boolean;
  can_edit_shooting_days: boolean;
  can_view_call_sheets: boolean;
  can_edit_call_sheets: boolean;
  can_view_production_reports: boolean;
  can_edit_production_reports: boolean;
  can_view_set_assistant: boolean;
  can_manage_access: boolean;
}

const ALL_TRUE: ProjectPermissions = {
  permission_profile: "full_access",
  can_view_breakdown: true,
  can_edit_breakdown: true,
  can_view_scenes: true,
  can_edit_scenes: true,
  can_view_cast_crew: true,
  can_edit_cast_crew: true,
  can_view_locations: true,
  can_edit_locations: true,
  can_view_shooting_days: true,
  can_edit_shooting_days: true,
  can_view_call_sheets: true,
  can_edit_call_sheets: true,
  can_view_production_reports: true,
  can_edit_production_reports: true,
  can_view_set_assistant: true,
  can_manage_access: true,
};

function base(
  profile: string,
  flags: Partial<ProjectPermissions>
): ProjectPermissions {
  return {
    permission_profile: profile,
    department: flags.department,
    can_view_breakdown: false,
    can_edit_breakdown: false,
    can_view_scenes: false,
    can_edit_scenes: false,
    can_view_cast_crew: false,
    can_edit_cast_crew: false,
    can_view_locations: false,
    can_edit_locations: false,
    can_view_shooting_days: false,
    can_edit_shooting_days: false,
    can_view_call_sheets: false,
    can_edit_call_sheets: false,
    can_view_production_reports: false,
    can_edit_production_reports: false,
    can_view_set_assistant: false,
    can_manage_access: false,
    ...flags,
  };
}

function departmentProfile(
  department: string,
  flags: Partial<ProjectPermissions>
): ProjectPermissions {
  return base(`department_${department.toLowerCase()}`, {
    department,
    ...flags,
  });
}

export function getDefaultProjectPermissions(
  role: ProjectRole,
  department?: string | null
): ProjectPermissions {
  switch (role) {
    case "project_admin":
      return base("project_admin", {
        can_view_breakdown: true,
        can_edit_breakdown: true,
        can_view_scenes: true,
        can_edit_scenes: true,
        can_view_cast_crew: true,
        can_edit_cast_crew: true,
        can_view_locations: true,
        can_edit_locations: true,
        can_view_shooting_days: true,
        can_edit_shooting_days: true,
        can_view_call_sheets: true,
        can_edit_call_sheets: true,
        can_view_production_reports: true,
        can_edit_production_reports: true,
        can_view_set_assistant: true,
        can_manage_access: true,
      });
    case "producer":
      return base("producer", {
        can_view_breakdown: true,
        can_edit_breakdown: true,
        can_view_scenes: true,
        can_edit_scenes: true,
        can_view_cast_crew: true,
        can_edit_cast_crew: true,
        can_view_locations: true,
        can_edit_locations: true,
        can_view_shooting_days: true,
        can_edit_shooting_days: true,
        can_view_call_sheets: true,
        can_edit_call_sheets: true,
        can_view_production_reports: true,
        can_edit_production_reports: true,
        can_view_set_assistant: true,
      });
    case "assistant_director":
      return base("assistant_director", {
        can_view_breakdown: true,
        can_edit_breakdown: true,
        can_view_scenes: true,
        can_edit_scenes: true,
        can_view_cast_crew: true,
        can_view_locations: true,
        can_view_shooting_days: true,
        can_edit_shooting_days: true,
        can_view_call_sheets: true,
        can_edit_call_sheets: true,
        can_view_production_reports: true,
        can_edit_production_reports: true,
        can_view_set_assistant: true,
      });
    case "department_user": {
      const dept = department?.trim();
      if (dept === "Costumi") {
        return departmentProfile(dept, {
          can_view_scenes: true,
          can_view_cast_crew: true,
          can_view_locations: true,
          can_view_shooting_days: true,
          can_view_call_sheets: true,
          can_view_production_reports: true,
          can_view_set_assistant: true,
        });
      }
      if (dept === "Trucco") {
        return departmentProfile(dept, {
          can_view_scenes: true,
          can_view_cast_crew: true,
          can_view_shooting_days: true,
          can_view_call_sheets: true,
          can_view_production_reports: true,
          can_view_set_assistant: true,
        });
      }
      if (dept === "Props") {
        return departmentProfile(dept, {
          can_view_scenes: true,
          can_view_locations: true,
          can_view_call_sheets: true,
          can_view_production_reports: true,
          can_view_set_assistant: true,
        });
      }
      if (dept === "Trasporti") {
        return departmentProfile(dept, {
          can_view_cast_crew: true,
          can_view_locations: true,
          can_view_shooting_days: true,
          can_view_call_sheets: true,
          can_view_production_reports: true,
          can_view_set_assistant: true,
        });
      }
      if (dept === "Location") {
        return departmentProfile(dept, {
          can_view_locations: true,
          can_view_shooting_days: true,
          can_view_call_sheets: true,
          can_view_production_reports: true,
          can_view_set_assistant: true,
        });
      }
      return base("department_user", {
        department: dept,
        can_view_scenes: true,
        can_view_call_sheets: true,
        can_view_production_reports: true,
        can_view_set_assistant: true,
        can_view_cast_crew: true,
      });
    }
    case "cast_crew_user":
      return base("cast_crew", {
        can_view_call_sheets: true,
        can_view_production_reports: true,
        can_view_set_assistant: true,
        can_view_shooting_days: true,
      });
    case "viewer":
      return base("viewer", {
        can_view_scenes: true,
        can_view_call_sheets: true,
        can_view_production_reports: true,
      });
    default:
      return base("viewer", { can_view_scenes: true });
  }
}

export function getCompanyAdminPermissions(): ProjectPermissions {
  return { ...ALL_TRUE, permission_profile: "company_admin" };
}

export function permissionsFromMember(
  member: ProjectMember | null | undefined
): ProjectPermissions | null {
  if (!member) return null;
  if (
    member.permission_profile === undefined &&
    member.can_view_scenes === undefined
  ) {
    return getDefaultProjectPermissions(member.role, member.department);
  }
  return {
    permission_profile: member.permission_profile ?? member.role,
    department: member.department,
    can_view_breakdown: member.can_view_breakdown ?? false,
    can_edit_breakdown: member.can_edit_breakdown ?? false,
    can_view_scenes: member.can_view_scenes ?? false,
    can_edit_scenes: member.can_edit_scenes ?? false,
    can_view_cast_crew: member.can_view_cast_crew ?? false,
    can_edit_cast_crew: member.can_edit_cast_crew ?? false,
    can_view_locations: member.can_view_locations ?? false,
    can_edit_locations: member.can_edit_locations ?? false,
    can_view_shooting_days: member.can_view_shooting_days ?? false,
    can_edit_shooting_days: member.can_edit_shooting_days ?? false,
    can_view_call_sheets: member.can_view_call_sheets ?? false,
    can_edit_call_sheets: member.can_edit_call_sheets ?? false,
    can_view_production_reports:
      member.can_view_production_reports ?? false,
    can_edit_production_reports:
      member.can_edit_production_reports ?? false,
    can_view_set_assistant: member.can_view_set_assistant ?? false,
    can_manage_access: member.can_manage_access ?? false,
  };
}

export function resolveProjectPermissions(
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  membership: ProjectMember | null | undefined
): ProjectPermissions {
  if (isPlatformOwnerUser(user)) return { ...ALL_TRUE, permission_profile: "platform_owner" };
  if (companyRole === "company_admin" || companyRole === "platform_owner") {
    return getCompanyAdminPermissions();
  }
  const fromMember = permissionsFromMember(membership);
  if (fromMember) return fromMember;
  return getDefaultProjectPermissions("viewer");
}

export function projectMemberPermissionPayload(
  role: ProjectRole,
  department?: string | null,
  permissionProfile?: string | null
): Record<string, unknown> {
  const defaults =
    permissionProfile && permissionProfile !== "custom"
      ? getDefaultProjectPermissions(role, department)
      : getDefaultProjectPermissions(role, department);

  return {
    role,
    department: department ?? null,
    permission_profile: permissionProfile ?? defaults.permission_profile,
    can_view_breakdown: defaults.can_view_breakdown,
    can_edit_breakdown: defaults.can_edit_breakdown,
    can_view_scenes: defaults.can_view_scenes,
    can_edit_scenes: defaults.can_edit_scenes,
    can_view_cast_crew: defaults.can_view_cast_crew,
    can_edit_cast_crew: defaults.can_edit_cast_crew,
    can_view_locations: defaults.can_view_locations,
    can_edit_locations: defaults.can_edit_locations,
    can_view_shooting_days: defaults.can_view_shooting_days,
    can_edit_shooting_days: defaults.can_edit_shooting_days,
    can_view_call_sheets: defaults.can_view_call_sheets,
    can_edit_call_sheets: defaults.can_edit_call_sheets,
    can_view_production_reports: defaults.can_view_production_reports,
    can_edit_production_reports: defaults.can_edit_production_reports,
    can_view_set_assistant: defaults.can_view_set_assistant,
    can_manage_access: defaults.can_manage_access,
  };
}

export function isDepartmentUser(
  membership: ProjectMember | null | undefined
): boolean {
  return membership?.role === "department_user" && Boolean(membership.department);
}

export function isCostumiDepartment(
  permissions: ProjectPermissions,
  isDepartment: boolean
): boolean {
  return isDepartment && permissions.department === "Costumi";
}

/** Nav items visible to any department_user (not only Costumi) */
const DEPARTMENT_USER_NAV_KEYS = new Set([
  "department",
  "scenes",
  "call-sheets",
  "documents",
  "production-reports",
  "set-assistant",
]);

export function shouldShowProjectNavItem(
  navKey: string,
  permissions: ProjectPermissions,
  isDepartment: boolean,
  defaultVisible: boolean
): boolean {
  if (isDepartment) {
    return DEPARTMENT_USER_NAV_KEYS.has(navKey);
  }
  return defaultVisible;
}

export function getDepartmentDashboardLabel(department?: string | null): string {
  if (department === "Costumi") return "Dashboard Costumi";
  return department ? `Dashboard ${department}` : "Dashboard reparto";
}

export function resolveAutoProjectId(
  storedProjectId: string | null,
  allowedProjectIds: Set<string>,
  projects: Array<{ id: string }>
): string | null {
  if (storedProjectId && allowedProjectIds.has(storedProjectId)) {
    return storedProjectId;
  }
  const allowed = projects.filter((p) => allowedProjectIds.has(p.id));
  if (allowed.length === 1) return allowed[0].id;
  return null;
}

export function departmentToAssistantRole(
  department?: string | null
): string | null {
  if (!department) return null;
  const map: Record<string, string> = {
    Costumi: "costumi",
    Trucco: "trucco",
    Props: "props",
    Trasporti: "trasporti",
    Location: "location_department",
  };
  return map[department] ?? "crew";
}
