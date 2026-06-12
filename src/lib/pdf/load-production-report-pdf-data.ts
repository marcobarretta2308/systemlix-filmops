import {
  buildProductionReportFilename,
  dash,
  formatGeneratedAt,
  formatPdfDate,
  type ProductionReportPdfData,
} from "@/lib/pdf/production-report-types";
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITY_LABELS,
  PRODUCTION_REPORT_STATUS_LABELS,
  SCENE_REPORT_STATUS_LABELS,
} from "@/lib/production-reports/constants";
import {
  mapCallSheet,
  mapCompany,
  mapProductionReport,
  mapProductionReportDepartmentNote,
  mapProductionReportIssue,
  mapProductionReportScene,
  mapProject,
  mapShootingDay,
} from "@/lib/supabase/mappers";
import type { SupabaseClient } from "@supabase/supabase-js";

type LoadParams = {
  projectId: string;
  reportId: string;
};

async function profileName(
  supabase: SupabaseClient,
  uid?: string | null
): Promise<string> {
  if (!uid) return "—";
  const { data } = await supabase.rpc("profile_display_name", { uid });
  return data ? String(data) : uid.slice(0, 8);
}

export async function loadProductionReportPdfData(
  supabase: SupabaseClient,
  params: LoadParams
): Promise<{ data: ProductionReportPdfData; filename: string }> {
  const { projectId, reportId } = params;

  const [reportRes, projectRes, scenesRes, issuesRes, notesRes] =
    await Promise.all([
      supabase
        .from("production_reports")
        .select("*")
        .eq("id", reportId)
        .eq("project_id", projectId)
        .single(),
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase
        .from("production_report_scenes")
        .select("*")
        .eq("report_id", reportId)
        .order("scene_number"),
      supabase
        .from("production_report_issues")
        .select("*")
        .eq("report_id", reportId)
        .order("created_at"),
      supabase
        .from("production_report_department_notes")
        .select("*")
        .eq("report_id", reportId)
        .order("department"),
    ]);

  if (reportRes.error) throw reportRes.error;
  if (projectRes.error) throw projectRes.error;
  if (scenesRes.error) throw scenesRes.error;
  if (issuesRes.error) throw issuesRes.error;
  if (notesRes.error) throw notesRes.error;

  const report = mapProductionReport(reportRes.data);
  const project = mapProject(projectRes.data);

  const { data: companyRow } = await supabase
    .from("companies")
    .select("*")
    .eq("id", project.company_id)
    .single();

  const company = companyRow ? mapCompany(companyRow) : null;

  let shootingDayLabel = "—";
  let shootingDayNumber = report.report_date;
  if (report.shooting_day_id) {
    const { data: dayRow } = await supabase
      .from("shooting_days")
      .select("*")
      .eq("id", report.shooting_day_id)
      .single();
    if (dayRow) {
      const day = mapShootingDay(dayRow);
      shootingDayNumber = day.day_number;
      shootingDayLabel = `Day ${day.day_number} · ${formatPdfDate(day.date)}`;
    }
  }

  let callSheetLabel = "—";
  if (report.call_sheet_id) {
    const { data: sheetRow } = await supabase
      .from("call_sheets")
      .select("*")
      .eq("id", report.call_sheet_id)
      .single();
    if (sheetRow) {
      const sheet = mapCallSheet(sheetRow);
      callSheetLabel = `Day ${sheet.day_number} · v${sheet.version}`;
    }
  }

  const [createdBy, submittedBy, approvedBy] = await Promise.all([
    profileName(supabase, report.created_by),
    profileName(supabase, report.submitted_by),
    profileName(supabase, report.approved_by),
  ]);

  const categoryLabels = Object.fromEntries(
    ISSUE_CATEGORIES.map((c) => [c.value, c.label])
  ) as Record<string, string>;

  const data: ProductionReportPdfData = {
    brand: "FilmOps",
    projectTitle: project.title,
    productionName: company?.name ?? "Production",
    reportTitle: dash(report.title) === "—" ? "Production Report" : report.title!,
    reportDate: formatPdfDate(report.report_date),
    shootingDayLabel,
    callSheetLabel,
    status: report.status,
    statusLabel: PRODUCTION_REPORT_STATUS_LABELS[report.status],
    actualCrewCallTime: dash(report.actual_crew_call_time),
    actualFirstShotTime: dash(report.actual_first_shot_time),
    actualWrapTime: dash(report.actual_wrap_time),
    mealBreakTime: dash(report.meal_break_time),
    totalShootingHours:
      report.total_shooting_hours != null
        ? String(report.total_shooting_hours)
        : "—",
    overtimeNotes: dash(report.overtime_notes),
    weatherNotes: dash(report.weather_notes),
    generalNotes: dash(report.general_notes),
    scenes: (scenesRes.data ?? []).map((row) => {
      const s = mapProductionReportScene(row);
      return {
        sceneNumber: dash(s.scene_number),
        status: s.status,
        statusLabel: SCENE_REPORT_STATUS_LABELS[s.status],
        notes: dash(s.notes),
      };
    }),
    issues: (issuesRes.data ?? []).map((row) => {
      const i = mapProductionReportIssue(row);
      return {
        title: i.title,
        category: i.category,
        categoryLabel: categoryLabels[i.category] ?? i.category,
        department: dash(i.department),
        severity: i.severity,
        severityLabel: ISSUE_SEVERITY_LABELS[i.severity],
        description: dash(i.description),
        resolved: i.resolved,
        notes: dash(i.notes),
      };
    }),
    departmentNotes: (notesRes.data ?? [])
      .map((row) => mapProductionReportDepartmentNote(row))
      .filter((n) => n.notes?.trim())
      .map((n) => ({
        department: n.department,
        notes: n.notes!.trim(),
      })),
    createdBy,
    submittedBy,
    submittedAt: report.submitted_at
      ? new Date(report.submitted_at).toLocaleString("en-GB")
      : "—",
    approvedBy,
    approvedAt: report.approved_at
      ? new Date(report.approved_at).toLocaleString("en-GB")
      : "—",
    generatedAt: formatGeneratedAt(),
  };

  return {
    data,
    filename: buildProductionReportFilename(
      project.title,
      shootingDayNumber,
      report.report_date
    ),
  };
}
