import { isPlatformOwnerUser, isProjectFinished } from "@/lib/access-control";
import type {
  CompanyRole,
  Project,
  ProjectDocument,
  ProjectMember,
  ProjectRole,
  User,
} from "@/lib/types";
import type { DocumentVisibility } from "./constants";
import { MEMBER_DEPARTMENT_TO_DOCUMENT } from "./constants";

const UPLOAD_ROLES: ProjectRole[] = [
  "project_admin",
  "producer",
  "assistant_director",
  "department_user",
];

const FULL_ACCESS_ROLES: ProjectRole[] = ["project_admin", "producer"];

const DELETE_ROLES: ProjectRole[] = ["project_admin", "producer"];

const AD_OPERATIONAL_DEPARTMENTS = new Set([
  "Production",
  "Direction",
  "AD Department",
]);

export function canUploadDocuments(
  project: Project,
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined
): boolean {
  if (isProjectFinished(project.status)) return false;
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  if (!projectRole) return false;
  return UPLOAD_ROLES.includes(projectRole);
}

export function canDeleteDocument(
  project: Project,
  document: ProjectDocument,
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined,
  currentUserId: string | null
): boolean {
  if (isProjectFinished(project.status)) return false;
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  if (projectRole && DELETE_ROLES.includes(projectRole)) return true;
  if (currentUserId && document.uploaded_by === currentUserId) {
    return canUploadDocuments(project, user, companyRole, projectRole);
  }
  return false;
}

export function canViewDocuments(
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined
): boolean {
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  return Boolean(projectRole);
}

function userSeesDepartmentDoc(
  projectRole: ProjectRole,
  memberDepartment: string | null | undefined,
  docDepartment: string | null | undefined
): boolean {
  if (!docDepartment) return true;

  if (FULL_ACCESS_ROLES.includes(projectRole)) return true;

  if (projectRole === "assistant_director") {
    if (AD_OPERATIONAL_DEPARTMENTS.has(docDepartment)) return true;
    const normalized = memberDepartment
      ? MEMBER_DEPARTMENT_TO_DOCUMENT[memberDepartment] ?? memberDepartment
      : null;
    return Boolean(normalized && docDepartment === normalized);
  }

  if (projectRole === "department_user") {
    const normalized = memberDepartment
      ? MEMBER_DEPARTMENT_TO_DOCUMENT[memberDepartment] ?? memberDepartment
      : null;
    return Boolean(normalized && docDepartment === normalized);
  }

  return false;
}

export function filterVisibleDocuments(
  documents: ProjectDocument[],
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  membership: ProjectMember | null | undefined,
  projectRole: ProjectRole | null | undefined
): ProjectDocument[] {
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") {
    return documents.filter((d) => !d.is_deleted);
  }
  if (companyRole === "company_admin") {
    return documents.filter((d) => !d.is_deleted);
  }

  const role = projectRole ?? membership?.role;
  if (!role) return [];

  return documents.filter((doc) => {
    if (doc.is_deleted) return false;
    if (FULL_ACCESS_ROLES.includes(role)) return true;

    const visibility = (doc.visibility ?? "project") as DocumentVisibility;
    if (visibility === "project") return true;

    return userSeesDepartmentDoc(role, membership?.department, doc.department);
  });
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isPreviewableMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return (
    mime === "application/pdf" ||
    mime.startsWith("image/")
  );
}
