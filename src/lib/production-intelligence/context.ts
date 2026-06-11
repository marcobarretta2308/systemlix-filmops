import { mapProject } from "@/lib/supabase/mappers";
import * as db from "@/lib/supabase/data";
import type {
  CallSheet,
  CastCrew,
  Location,
  ProductionReport,
  ProductionReportDepartmentNote,
  ProductionReportIssue,
  ProductionReportScene,
  Project,
  ProjectDocument,
  Scene,
  ShootingDay,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface BreakdownQualityRow {
  id: string;
  run_id: string;
  quality_status: string;
  issues: Array<Record<string, unknown>>;
  created_at: string;
}

export interface ProductionIntelligenceContext {
  project: Project;
  scenes: Scene[];
  castCrew: CastCrew[];
  locations: Location[];
  shootingDays: ShootingDay[];
  callSheets: CallSheet[];
  documents: ProjectDocument[];
  productionReports: ProductionReport[];
  productionReportScenes: ProductionReportScene[];
  productionReportIssues: ProductionReportIssue[];
  productionReportDeptNotes: ProductionReportDepartmentNote[];
  breakdownQualityChecks: BreakdownQualityRow[];
  breakdownRuns: Array<{ id: string; status: string; created_at: string }>;
}

export async function loadProductionIntelligenceContext(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProductionIntelligenceContext | null> {
  const { data: projectRow, error: projectErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectErr || !projectRow) return null;

  const data = await db.fetchProjectData(supabase, projectId);

  const [qualityRes, runsRes] = await Promise.all([
    supabase
      .from("script_breakdown_quality_checks")
      .select("id, run_id, quality_status, issues, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("script_breakdown_runs")
      .select("id, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    project: mapProject(projectRow),
    scenes: data.scenes,
    castCrew: data.castCrew,
    locations: data.locations,
    shootingDays: data.shootingDays,
    callSheets: data.callSheets,
    documents: data.documents,
    productionReports: data.productionReports,
    productionReportScenes: data.productionReportScenes,
    productionReportIssues: data.productionReportIssues,
    productionReportDeptNotes: data.productionReportDeptNotes,
    breakdownQualityChecks: (qualityRes.data ?? []) as BreakdownQualityRow[],
    breakdownRuns: (runsRes.data ?? []) as Array<{
      id: string;
      status: string;
      created_at: string;
    }>,
  };
}

export function buildContextSummary(ctx: ProductionIntelligenceContext): string {
  const lines: string[] = [
    `PROJECT: ${ctx.project.title} (${ctx.project.production_type || "production"})`,
    `Scenes: ${ctx.scenes.length}`,
    `Locations: ${ctx.locations.length}`,
    `Shooting days: ${ctx.shootingDays.length}`,
    `Call sheets: ${ctx.callSheets.length}`,
    `Documents: ${ctx.documents.length}`,
    `Production reports: ${ctx.productionReports.length}`,
  ];

  if (ctx.scenes.length > 0) {
    lines.push(
      "SCENES SAMPLE:",
      ...ctx.scenes.slice(0, 40).map(
        (s) =>
          `- ${s.scene_number} ${s.int_ext}/${s.day_night} @ ${s.location || "—"} | chars: ${s.characters.join(", ") || "—"} | props: ${s.props.join(", ") || "—"} | costumes: ${s.costumes.join(", ") || "—"} | vfx: ${s.vfx.join(", ") || "—"} | stunts: ${s.stunts.join(", ") || "—"}`
      )
    );
  }

  if (ctx.locations.length > 0) {
    lines.push(
      "LOCATIONS:",
      ...ctx.locations.slice(0, 30).map(
        (l) => `- ${l.name} status=${l.status ?? "unknown"} permit=${l.permit_status ?? "—"}`
      )
    );
  }

  if (ctx.callSheets.length > 0) {
    lines.push(
      "CALL SHEETS:",
      ...ctx.callSheets.slice(0, 10).map(
        (c) =>
          `- v${c.version} day ${c.day_number} ${c.date} status=${c.status} scenes=${c.scenes_to_shoot.length} location=${c.location || "—"}`
      )
    );
  }

  if (ctx.productionReports.length > 0) {
    lines.push(
      "PRODUCTION REPORTS:",
      ...ctx.productionReports.map(
        (r) => `- ${r.title ?? r.report_date} status=${r.status}`
      )
    );
  }

  if (ctx.documents.length > 0) {
    lines.push(
      "DOCUMENTS:",
      ...ctx.documents.slice(0, 20).map((d) => `- ${d.original_file_name} (${d.category})`)
    );
  }

  if (ctx.breakdownQualityChecks.length > 0) {
    lines.push("BREAKDOWN QUALITY:");
    for (const q of ctx.breakdownQualityChecks.slice(0, 5)) {
      lines.push(`- status=${q.quality_status} issues=${q.issues?.length ?? 0}`);
    }
  }

  return lines.join("\n");
}

export function getCallSheetById(
  ctx: ProductionIntelligenceContext,
  callSheetId: string
): CallSheet | undefined {
  return ctx.callSheets.find((c) => c.id === callSheetId);
}
