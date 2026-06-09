import type {
  IssueCategory,
  IssueSeverity,
  ProductionReportStatus,
  SceneReportStatus,
} from "@/lib/types";

export const PRODUCTION_REPORT_STATUSES: ProductionReportStatus[] = [
  "draft",
  "submitted",
  "approved",
  "archived",
];

export const PRODUCTION_REPORT_STATUS_LABELS: Record<
  ProductionReportStatus,
  string
> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  archived: "Archived",
};

export const PRODUCTION_REPORT_STATUS_VARIANTS: Record<
  ProductionReportStatus,
  "draft" | "pending" | "final" | "cyan" | "archived"
> = {
  draft: "draft",
  submitted: "pending",
  approved: "final",
  archived: "archived",
};

export const SCENE_REPORT_STATUSES: SceneReportStatus[] = [
  "completed",
  "partially_completed",
  "postponed",
  "cancelled",
];

export const SCENE_REPORT_STATUS_LABELS: Record<SceneReportStatus, string> = {
  completed: "Completed",
  partially_completed: "Partially completed",
  postponed: "Postponed",
  cancelled: "Cancelled",
};

export const ISSUE_CATEGORIES: { value: IssueCategory; label: string }[] = [
  { value: "delay", label: "Delay" },
  { value: "missing_prop", label: "Missing prop" },
  { value: "cast_issue", label: "Cast issue" },
  { value: "location_issue", label: "Location issue" },
  { value: "weather_issue", label: "Weather issue" },
  { value: "technical_issue", label: "Technical issue" },
  { value: "safety_issue", label: "Safety issue" },
  { value: "other", label: "Other" },
];

export const ISSUE_SEVERITIES: IssueSeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const REPORT_DEPARTMENTS = [
  "Production",
  "Direction",
  "AD Department",
  "Camera",
  "Lighting",
  "Sound",
  "Art",
  "Costume",
  "Makeup",
  "Props",
  "VFX",
  "Stunts",
  "Locations",
  "Transport",
  "Cast",
  "Other",
] as const;

/** Map project_members.department → report department key */
export const MEMBER_DEPT_TO_REPORT: Record<string, string> = {
  Costumi: "Costume",
  Trucco: "Makeup",
  Props: "Props",
  Trasporti: "Transport",
  Location: "Locations",
  Produzione: "Production",
  Regia: "Direction",
};

export function memberDepartmentToReportKey(dept?: string | null): string | null {
  if (!dept) return null;
  return MEMBER_DEPT_TO_REPORT[dept] ?? dept;
}
