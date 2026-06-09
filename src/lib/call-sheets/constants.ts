import type { CallSheetStatus, ProjectMember } from "@/lib/types";

export const CALL_SHEET_WORKFLOW_STATUSES: CallSheetStatus[] = [
  "draft",
  "ready_for_approval",
  "approved",
  "sent",
  "archived",
];

export const CALL_SHEET_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready_for_approval: "Ready for Approval",
  approved: "Approved",
  sent: "Sent",
  archived: "Archived",
  final: "Ready for Approval",
  locked: "Approved",
};

export const CALL_SHEET_STATUS_VARIANTS: Record<
  string,
  "draft" | "pending" | "final" | "cyan" | "active" | "archived"
> = {
  draft: "draft",
  ready_for_approval: "pending",
  approved: "final",
  sent: "cyan",
  archived: "archived",
  final: "pending",
  locked: "final",
};

export const CALL_SHEET_RECIPIENT_GROUPS = [
  { key: "all", label: "All project members" },
  { key: "Production", label: "Production" },
  { key: "Direction", label: "Direction" },
  { key: "AD Department", label: "AD Department" },
  { key: "Camera", label: "Camera" },
  { key: "Lighting", label: "Lighting" },
  { key: "Sound", label: "Sound" },
  { key: "Art", label: "Art" },
  { key: "Costume", label: "Costume" },
  { key: "Makeup", label: "Makeup" },
  { key: "Props", label: "Props" },
  { key: "VFX", label: "VFX" },
  { key: "Stunts", label: "Stunts" },
  { key: "Locations", label: "Locations" },
  { key: "Transport", label: "Transport" },
  { key: "Cast", label: "Cast" },
] as const;

export type RecipientGroupKey = (typeof CALL_SHEET_RECIPIENT_GROUPS)[number]["key"];

const DEPARTMENT_ALIASES: Record<string, string> = {
  costumi: "costume",
  costume: "costume",
  trucco: "makeup",
  makeup: "makeup",
  props: "props",
  trasporti: "transport",
  transport: "transport",
  location: "locations",
  locations: "locations",
  produzione: "production",
  production: "production",
  regia: "direction",
  direction: "direction",
  camera: "camera",
  lighting: "lighting",
  sound: "sound",
  art: "art",
  vfx: "vfx",
  stunts: "stunts",
  cast: "cast",
};

export function normalizeDepartmentKey(dept: string): string {
  const key = dept.trim().toLowerCase();
  return DEPARTMENT_ALIASES[key] ?? key;
}

export function departmentsMatch(
  a?: string | null,
  b?: string | null
): boolean {
  if (!a || !b) return false;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  return normalizeDepartmentKey(a) === normalizeDepartmentKey(b);
}

/** Map project_members.department → distribution recipient group key */
export const MEMBER_TO_RECIPIENT_DEPT: Record<string, string> = {
  Costumi: "Costume",
  Costume: "Costume",
  Trucco: "Makeup",
  Makeup: "Makeup",
  Props: "Props",
  Trasporti: "Transport",
  Transport: "Transport",
  Location: "Locations",
  Locations: "Locations",
  Produzione: "Production",
  Production: "Production",
  Regia: "Direction",
  Direction: "Direction",
  Camera: "Camera",
  Lighting: "Lighting",
  Sound: "Sound",
  Art: "Art",
  VFX: "VFX",
  Stunts: "Stunts",
  Cast: "Cast",
};

/** Department value stored on call_sheet_recipients (sourced from project_members.department) */
export function recipientDepartmentFromMember(
  member: ProjectMember
): string | null {
  if (member.department) {
    return MEMBER_TO_RECIPIENT_DEPT[member.department] ?? member.department;
  }
  if (member.role === "cast_crew_user") return "Cast";
  return null;
}

export function memberMatchesRecipientGroup(
  member: ProjectMember,
  deptKey: RecipientGroupKey
): boolean {
  if (deptKey === "all") return true;

  if (deptKey === "Cast") {
    return (
      member.role === "cast_crew_user" ||
      member.department === "Cast" ||
      recipientDepartmentFromMember(member) === "Cast"
    );
  }

  if (deptKey === "Production") {
    return (
      member.role === "producer" ||
      member.role === "project_admin" ||
      recipientDepartmentFromMember(member) === "Production"
    );
  }

  if (deptKey === "AD Department") {
    return member.role === "assistant_director";
  }

  const normalized = recipientDepartmentFromMember(member);
  return (
    normalized === deptKey ||
    member.department === deptKey ||
    departmentsMatch(member.department, deptKey) ||
    (member.department != null &&
      MEMBER_TO_RECIPIENT_DEPT[member.department] === deptKey)
  );
}

export function normalizeCallSheetStatus(status: string): CallSheetStatus {
  if (status === "final") return "ready_for_approval";
  if (status === "locked") return "approved";
  if (
    status === "draft" ||
    status === "ready_for_approval" ||
    status === "approved" ||
    status === "sent" ||
    status === "archived"
  ) {
    return status;
  }
  return "draft";
}

export function isCallSheetEditable(status: CallSheetStatus): boolean {
  return status === "draft" || status === "ready_for_approval" || status === "approved";
}
