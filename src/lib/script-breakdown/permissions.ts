import { isPlatformOwnerUser } from "@/lib/access-control";
import type { CompanyRole, ProjectRole, User } from "@/lib/types";

const MANAGE_BREAKDOWN_ROLES: ProjectRole[] = [
  "project_admin",
  "producer",
  "assistant_director",
];

export function canGenerateBreakdown(
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined,
  canEditBreakdownFlag: boolean
): boolean {
  if (!canEditBreakdownFlag) return false;
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  if (!projectRole) return false;
  return MANAGE_BREAKDOWN_ROLES.includes(projectRole);
}

export function canViewBreakdown(
  canViewBreakdownFlag: boolean,
  projectRole: ProjectRole | null | undefined
): boolean {
  return canViewBreakdownFlag && Boolean(projectRole);
}
