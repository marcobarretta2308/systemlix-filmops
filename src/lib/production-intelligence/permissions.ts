import { isPlatformOwnerUser } from "@/lib/access-control";
import type { CompanyRole, ProjectRole, User } from "@/lib/types";

const FULL_ACCESS_ROLES: ProjectRole[] = [
  "project_admin",
  "producer",
  "assistant_director",
];

export function canUseFullProductionIntelligence(
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined
): boolean {
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  if (!projectRole) return false;
  return FULL_ACCESS_ROLES.includes(projectRole);
}

/** Any authenticated project member with page access */
export function canUseProjectSearch(
  projectRole: ProjectRole | null | undefined
): boolean {
  return Boolean(projectRole);
}
