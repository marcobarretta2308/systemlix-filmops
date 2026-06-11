import { runDeterministicProductionCheck } from "@/lib/production-intelligence/checks";
import { loadProductionIntelligenceContext } from "@/lib/production-intelligence/context";
import {
  formatProductionPackGeneratedAt,
  safeCount,
  safeDate,
  safeScore,
  safeText,
} from "@/lib/pdf/pdf-safe";
import type { ProductionPackPdfData } from "@/lib/pdf/production-pack-types";
import { dash, joinList } from "@/lib/pdf/production-pack-types";
import type { CallSheet, Location, Scene, ShootingDay } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PRODUCTION_PACK_SECTIONS,
  PRODUCTION_PACK_SECTION_LABELS,
  type ProductionPackSectionId,
} from "./types";

const CONFIRMED_LOCATION = new Set(["confirmed", "ready", "permit_pending"]);

function scheduleFind(sheet: CallSheet, pattern: RegExp): string {
  const hit = sheet.schedule?.find((s) => pattern.test(s.activity));
  return hit ? `${hit.time} — ${hit.activity}` : "—";
}

function callSheetWarnings(sheet: CallSheet): string {
  const warnings: string[] = [];
  if (!sheet.scenes_to_shoot?.length) warnings.push("No scenes listed");
  if (!sheet.location?.trim()) warnings.push("Missing location");
  if (!sheet.crew_call_times?.some((c) => c.call_time?.trim()))
    warnings.push("Missing crew call");
  if (!sheet.emergency_contacts?.some((c) => c.phone?.trim()))
    warnings.push("Missing emergency contacts");
  return warnings.length ? warnings.join("; ") : "—";
}

function scenesForLocation(loc: Location, scenes: Scene[]): string {
  const linked = new Set(loc.metadata?.linked_scene_numbers ?? []);
  const matched = scenes
    .filter(
      (s) =>
        linked.has(s.scene_number) ||
        s.location?.toLowerCase() === loc.name.toLowerCase()
    )
    .map((s) => s.scene_number);
  return joinList([...new Set(matched)]);
}

export async function buildProductionPackData(
  supabase: SupabaseClient,
  projectId: string,
  sections: ProductionPackSectionId[] = DEFAULT_PRODUCTION_PACK_SECTIONS
): Promise<ProductionPackPdfData | null> {
  const loaded = await loadProductionIntelligenceContext(supabase, projectId);
  if (!loaded) return null;
  const ctx = loaded;

  const included = new Set(sections);
  const [{ data: company }, { data: workspace }] = await Promise.all([
    supabase
      .from("companies")
      .select("name")
      .eq("id", ctx.project.company_id)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("name")
      .eq("id", ctx.project.workspace_id)
      .maybeSingle(),
  ]);

  const generatedAt = formatProductionPackGeneratedAt(new Date());

  const toc = sections
    .filter((id) => included.has(id))
    .map((id, i) => ({
      id,
      title: `${i + 1}. ${PRODUCTION_PACK_SECTION_LABELS[id]}`,
    }));

  const data: ProductionPackPdfData = {
    brand: "Systemlix FilmOps",
    projectTitle: safeText(ctx.project.title, "Untitled Project"),
    companyName: dash(company?.name),
    workspaceName: dash(workspace?.name),
    generatedAt,
    snapshot: {
      sceneCount: safeCount(ctx.scenes.length),
      locationCount: safeCount(ctx.locations.length),
      callSheetCount: safeCount(ctx.callSheets.length),
      documentCount: safeCount(ctx.documents.length),
      reportCount: safeCount(ctx.productionReports.length),
      shootingDayCount: safeCount(ctx.shootingDays.length),
    },
    includedSections: sections,
    toc,
  };

  if (included.has("overview")) {
    try {
      const check = runDeterministicProductionCheck(ctx);
      data.overview = {
        status: safeText(ctx.project.status),
        createdAt: safeDate(ctx.project.created_at),
        sceneCount: safeCount(ctx.scenes.length),
        locationCount: safeCount(ctx.locations.length),
        callSheetCount: safeCount(ctx.callSheets.length),
        documentCount: safeCount(ctx.documents.length),
        reportCount: safeCount(ctx.productionReports.length),
        operationalSummary: safeText(
          `Production health score ${safeScore(check.health_score)}/100. ${safeCount(check.critical_count)} critical, ${safeCount(check.warning_count)} warnings. ${safeCount(ctx.shootingDays.length)} shooting day(s) planned.`,
          "—",
          1500
        ),
      };
    } catch (error) {
      console.error("[FilmOps] Production pack overview section failed:", error);
      data.overview = {
        status: safeText(ctx.project.status),
        createdAt: safeDate(ctx.project.created_at),
        sceneCount: safeCount(ctx.scenes.length),
        locationCount: safeCount(ctx.locations.length),
        callSheetCount: safeCount(ctx.callSheets.length),
        documentCount: safeCount(ctx.documents.length),
        reportCount: safeCount(ctx.productionReports.length),
        operationalSummary: "Section unavailable: Project Overview",
      };
    }
  }

  if (included.has("scenes")) {
    try {
    data.scenes = ctx.scenes.map((s) => {
      const elements = [
        s.props.length ? `Props: ${joinList(s.props, 4)}` : "",
        s.costumes.length ? `Costumes: ${joinList(s.costumes, 4)}` : "",
        s.vfx.length ? `VFX: ${joinList(s.vfx, 4)}` : "",
        s.stunts.length ? `Stunts: ${joinList(s.stunts, 4)}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        sceneNumber: s.scene_number,
        intExt: dash(s.int_ext),
        dayNight: dash(s.day_night),
        location: dash(s.location),
        summary: dash(s.short_description),
        characters: joinList(s.characters),
        elements: elements || "—",
        notes: dash(s.production_notes),
      };
    });
    } catch (error) {
      console.error("[FilmOps] Production pack scenes section failed:", error);
      data.scenes = [];
    }
  }

  if (included.has("cast")) {
    try {
    function actorForCharacter(character: string): string {
      const lower = character.toLowerCase();
      const match = ctx.castCrew.find(
        (m) =>
          m.role.toLowerCase() === lower ||
          m.role.toLowerCase().includes(lower) ||
          (m.department?.toLowerCase() === "cast" &&
            m.full_name.toLowerCase().includes(lower))
      );
      return match?.full_name ?? "—";
    }

    const charMap = new Map<string, { scenes: number; actor: string }>();
    for (const scene of ctx.scenes) {
      for (const ch of scene.characters) {
        const key = ch.trim();
        if (!key) continue;
        const prev = charMap.get(key) ?? {
          scenes: 0,
          actor: actorForCharacter(key),
        };
        prev.scenes += 1;
        charMap.set(key, prev);
      }
    }
    data.cast = [...charMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([character, info]) => ({
        character,
        actor: info.actor,
        sceneCount: safeCount(info.scenes),
        notes: "—",
      }));
    } catch (error) {
      console.error("[FilmOps] Production pack cast section failed:", error);
      data.cast = [];
    }
  }

  if (included.has("locations")) {
    try {
    data.locations = ctx.locations.map((loc) => {
      const status = String(loc.status ?? "unknown");
      const warning = CONFIRMED_LOCATION.has(status.toLowerCase())
        ? "—"
        : "Location not confirmed";
      return {
        name: loc.name,
        status: dash(loc.status),
        permitStatus: dash(loc.permit_status),
        linkedScenes: scenesForLocation(loc, ctx.scenes),
        address: dash(loc.address),
        warning,
      };
    });
    } catch (error) {
      console.error("[FilmOps] Production pack locations section failed:", error);
      data.locations = [];
    }
  }

  if (included.has("shooting_days")) {
    try {
    data.shootingDays = ctx.shootingDays.map((day: ShootingDay) => {
      const loc = ctx.locations.find((l) => l.id === day.location_id);
      const sheet = ctx.callSheets.find((c) => c.shooting_day_id === day.id);
      const sceneNums = day.selected_scene_ids
        .map((id) => ctx.scenes.find((s) => s.id === id)?.scene_number)
        .filter(Boolean) as string[];
      return {
        label: `Day ${safeText(day.day_number)}`,
        date: safeDate(day.date),
        plannedScenes: joinList(sceneNums),
        location: dash(loc?.name),
        notes: dash(day.production_notes),
        linkedCallSheet: sheet
          ? `v${sheet.version} · ${sheet.status}`
          : "—",
      };
    });
    } catch (error) {
      console.error("[FilmOps] Production pack shooting days section failed:", error);
      data.shootingDays = [];
    }
  }

  if (included.has("call_sheets")) {
    try {
    data.callSheets = ctx.callSheets.map((sheet) => ({
      label: `Day ${safeText(sheet.day_number)} · v${safeCount(sheet.version)}`,
      date: safeDate(sheet.date),
      status: sheet.status,
      crewCall:
        sheet.crew_call_times?.find((c) => c.call_time)?.call_time ?? "—",
      firstShot: scheduleFind(sheet, /first shot|prima ripresa/i),
      wrap: scheduleFind(sheet, /wrap|chiusura/i),
      sceneCount: safeCount(sheet.scenes_to_shoot?.length ?? 0),
      linkedPdf: dash(sheet.pdf_url),
      warnings: callSheetWarnings(sheet),
    }));
    } catch (error) {
      console.error("[FilmOps] Production pack call sheets section failed:", error);
      data.callSheets = [];
    }
  }

  if (included.has("documents")) {
    try {
    data.documents = ctx.documents.map((d) => ({
      fileName: d.original_file_name || d.file_name,
      category: dash(d.category),
      department: dash(d.department),
      uploadedAt: safeDate(d.created_at),
      notes: dash(d.notes),
    }));
    } catch (error) {
      console.error("[FilmOps] Production pack documents section failed:", error);
      data.documents = [];
    }
  }

  if (included.has("reports")) {
    try {
    data.reports = ctx.productionReports.map((report) => {
      const scenes = ctx.productionReportScenes.filter(
        (s) => s.report_id === report.id
      );
      const completed = scenes.filter((s) => s.status === "completed");
      const issues = ctx.productionReportIssues.filter(
        (i) => i.report_id === report.id
      );
      const deptNotes = ctx.productionReportDeptNotes.filter(
        (n) => n.report_id === report.id
      );
      return {
        label: report.title ?? report.report_date,
        status: report.status,
        scenesCompleted: `${completed.length}/${scenes.length}`,
        issues: issues.length
          ? joinList(issues.map((i) => i.title), 3)
          : "—",
        departmentNotes: deptNotes.length
          ? joinList(deptNotes.map((n) => n.department), 4)
          : "—",
        approval:
          report.status === "approved" ? "Approved" : "Not approved",
      };
    });
    } catch (error) {
      console.error("[FilmOps] Production pack reports section failed:", error);
      data.reports = [];
    }
  }

  if (included.has("department_notes")) {
    try {
    data.departmentNotes = ctx.productionReportDeptNotes.map((note) => {
      const report = ctx.productionReports.find((r) => r.id === note.report_id);
      return {
        department: note.department,
        reportLabel: report?.title ?? report?.report_date ?? "Report",
        notes: dash(note.notes),
      };
    });
    } catch (error) {
      console.error("[FilmOps] Production pack department notes section failed:", error);
      data.departmentNotes = [];
    }
  }

  if (included.has("intelligence")) {
    try {
    const check = runDeterministicProductionCheck(ctx);
    data.intelligence = {
      healthScore: safeScore(check.health_score),
      critical: check.issues
        .filter((i) => i.severity === "critical")
        .map((i) => `${i.title}: ${i.suggested_action}`),
      warnings: check.issues
        .filter((i) => i.severity === "warning")
        .map((i) => `${i.title}: ${i.suggested_action}`),
      info: check.issues
        .filter((i) => i.severity === "info")
        .map((i) => `${i.title}: ${i.suggested_action}`),
      suggestedActions: check.suggested_next_actions.map((a) => safeText(a, "—", 500)),
    };
    } catch (error) {
      console.error("[FilmOps] Production pack intelligence section failed:", error);
      data.intelligence = {
        healthScore: 0,
        critical: ["Section unavailable: Production Intelligence Check"],
        warnings: [],
        info: [],
        suggestedActions: [],
      };
    }
  }

  return data;
}
