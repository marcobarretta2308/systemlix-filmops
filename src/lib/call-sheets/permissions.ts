import { isPlatformOwnerUser, isProjectFinished } from "@/lib/access-control";
import type {
  CallSheet,
  CallSheetRecipient,
  CompanyRole,
  Project,
  ProjectMember,
  ProjectRole,
  User,
} from "@/lib/types";
import { normalizeCallSheetStatus } from "./constants";
import { isRecipientForUser } from "./inbox";

const SEND_ROLES: ProjectRole[] = [
  "project_admin",
  "producer",
  "assistant_director",
];

const RECEIPT_ADMIN_ROLES: ProjectRole[] = [
  "project_admin",
  "producer",
  "assistant_director",
];

export function canSendCallSheet(
  project: Project,
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined
): boolean {
  if (isProjectFinished(project.status)) return false;
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  if (!projectRole) return false;
  return SEND_ROLES.includes(projectRole);
}

export function canManageReadReceipts(
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined
): boolean {
  if (isPlatformOwnerUser(user) || companyRole === "platform_owner") return true;
  if (companyRole === "company_admin") return true;
  if (!projectRole) return false;
  return RECEIPT_ADMIN_ROLES.includes(projectRole);
}

export function canApproveCallSheet(
  project: Project,
  user: User | null,
  companyRole: CompanyRole | null | undefined,
  projectRole: ProjectRole | null | undefined
): boolean {
  return canSendCallSheet(project, user, companyRole, projectRole);
}

export function callSheetRequiresNewVersion(sheet: CallSheet): boolean {
  const status = normalizeCallSheetStatus(sheet.status);
  return status === "sent";
}

const RESTRICTED_CALL_SHEET_ROLES: ProjectRole[] = [
  "department_user",
  "cast_crew_user",
  "viewer",
];

export function isCallSheetRestrictedView(
  projectRole: ProjectRole | null | undefined,
  canSend: boolean,
  canManageReceipts: boolean
): boolean {
  if (canSend || canManageReceipts) return false;
  if (!projectRole) return false;
  return RESTRICTED_CALL_SHEET_ROLES.includes(projectRole);
}

export function filterRecipientsForUser(
  recipients: CallSheetRecipient[],
  userId: string | null,
  membership: ProjectMember | null | undefined,
  projectRole: ProjectRole | null | undefined,
  canManage: boolean
): CallSheetRecipient[] {
  if (canManage) return recipients;
  if (!userId) return [];

  return recipients.filter((r) =>
    isRecipientForUser(r, userId, membership?.department)
  );
}

export function getPendingAcknowledgements(
  recipients: CallSheetRecipient[],
  userId: string
): CallSheetRecipient[] {
  return recipients.filter(
    (r) => r.user_id === userId && !r.acknowledged_at
  );
}
