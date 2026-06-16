import { canManagePlatform } from "@/lib/permissions";
import type { CompanyRole, ProjectRole, User } from "@/lib/types";

const ACTIVITY_LOG_PROJECT_ROLES: ProjectRole[] = [
  "project_admin",
  "producer",
  "assistant_director",
];

export function canViewActivityLog(
  user: User | null,
  companyRole: CompanyRole,
  projectRole?: ProjectRole
): boolean {
  if (canManagePlatform(user, companyRole)) return true;
  if (companyRole === "company_admin") return true;
  return (
    projectRole !== undefined &&
    ACTIVITY_LOG_PROJECT_ROLES.includes(projectRole)
  );
}
