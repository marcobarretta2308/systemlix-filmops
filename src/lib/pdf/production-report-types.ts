import type {
  IssueCategory,
  IssueSeverity,
  ProductionReportStatus,
  SceneReportStatus,
} from "@/lib/types";

export type ProductionReportPdfData = {
  brand: string;
  projectTitle: string;
  productionName: string;
  reportTitle: string;
  reportDate: string;
  shootingDayLabel: string;
  callSheetLabel: string;
  status: ProductionReportStatus;
  statusLabel: string;
  actualCrewCallTime: string;
  actualFirstShotTime: string;
  actualWrapTime: string;
  mealBreakTime: string;
  totalShootingHours: string;
  overtimeNotes: string;
  weatherNotes: string;
  generalNotes: string;
  scenes: Array<{
    sceneNumber: string;
    status: SceneReportStatus;
    statusLabel: string;
    notes: string;
  }>;
  issues: Array<{
    title: string;
    category: IssueCategory;
    categoryLabel: string;
    department: string;
    severity: IssueSeverity;
    severityLabel: string;
    description: string;
    resolved: boolean;
    notes: string;
  }>;
  departmentNotes: Array<{
    department: string;
    notes: string;
  }>;
  createdBy: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy: string;
  approvedAt: string;
  generatedAt: string;
};

export function dash(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function formatPdfDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatGeneratedAt(): string {
  return new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slugifyReportFilenamePart(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}

export function buildProductionReportFilename(
  projectTitle: string,
  dayNumber: string,
  reportDate?: string
): string {
  const slug = slugifyReportFilenamePart(projectTitle);
  const day =
    slugifyReportFilenamePart(dayNumber) ||
    slugifyReportFilenamePart(reportDate ?? "report");
  return `filmops-production-report-${slug}-day-${day}.pdf`;
}
