import { isPlatformOwnerUser, isProjectFinished } from "@/lib/access-control";
import { memberDepartmentToReportKey } from "@/lib/production-reports/constants";
import type {
  CompanyRole,
  ProductionReport,
  ProductionReportStatus,
  Project,
  ProjectMember,
  ProjectRole,
  User,
} from "@/lib/types";

const MANAGE_ROLES: ProjectRole[] = [
  "project_admin",
  "producer",
  "assistant_director",
];

export function canViewProductionReports(
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined,
  canViewFlag: boolean
): boolean {
  if (!canViewFlag) return false;
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  return Boolean(projectRole);
}

export function canCreateProductionReport(
  project: Project,
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined
): boolean {
  if (isProjectFinished(project.status)) return false;
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  if (!projectRole) return false;
  return MANAGE_ROLES.includes(projectRole);
}

export function canEditProductionReport(
  report: ProductionReport,
  project: Project,
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined
): boolean {
  if (report.status === "approved" || report.status === "archived") return false;
  if (isProjectFinished(project.status)) return false;
  return canCreateProductionReport(project, user, companyRole, projectRole);
}

export function canSubmitOrApproveReport(
  project: Project,
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined
): boolean {
  if (isProjectFinished(project.status)) return false;
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  if (!projectRole) return false;
  return MANAGE_ROLES.includes(projectRole);
}

export function canEditDepartmentNote(
  report: ProductionReport,
  membership: ProjectMember | null | undefined,
  projectRole: ProjectRole | null | undefined,
  department: string,
  canManage: boolean
): boolean {
  if (report.status !== "draft") return false;
  if (canManage) return true;
  if (projectRole !== "department_user" || !membership?.department) return false;
  const memberKey = memberDepartmentToReportKey(membership.department);
  return memberKey === department || membership.department === department;
}

export function isReportEditableStatus(status: ProductionReportStatus): boolean {
  return status === "draft" || status === "submitted";
}
