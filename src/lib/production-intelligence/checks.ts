import type { ProductionIntelligenceContext } from "./context";
import type { ProductionCheckResult, ProductionIssue } from "./types";

const CONFIRMED_LOCATION_STATUSES = new Set([
  "confirmed",
  "ready",
  "permit_pending",
]);

let issueCounter = 0;
function issue(
  partial: Omit<ProductionIssue, "id"> & { id?: string }
): ProductionIssue {
  issueCounter += 1;
  return { id: partial.id ?? `issue-${issueCounter}`, ...partial };
}

function hasSafetyElements(scene: {
  vfx: string[];
  stunts: string[];
  vehicles: string[];
  animals: string[];
  special_requirements: string[];
  props: string[];
}): boolean {
  return (
    scene.vfx.length > 0 ||
    scene.stunts.length > 0 ||
    scene.vehicles.length > 0 ||
    scene.animals.length > 0 ||
    scene.special_requirements.length > 0 ||
    scene.props.some((p) =>
      /weapon|gun|knife|arma|fucile|pistola/i.test(p)
    )
  );
}

export function runDeterministicProductionCheck(
  ctx: ProductionIntelligenceContext
): ProductionCheckResult {
  const issues: ProductionIssue[] = [];

  for (const scene of ctx.scenes) {
    const loc = scene.location?.trim();
    if (!loc || loc === "—" || /^tbd|unknown|n\/a/i.test(loc)) {
      issues.push(
        issue({
          title: `Scene ${scene.scene_number} without location`,
          description: `Scene ${scene.scene_number} has no assigned location.`,
          affected_area: "scenes",
          suggested_action: "Assign a location in Scenes or run location normalization.",
          severity: "critical",
        })
      );
    }

    if (!scene.int_ext || !scene.day_night) {
      issues.push(
        issue({
          title: `Scene ${scene.scene_number} missing INT/EXT or DAY/NIGHT`,
          description: `Scene ${scene.scene_number} is missing slugline metadata.`,
          affected_area: "scenes",
          suggested_action: "Complete INT/EXT and DAY/NIGHT in the breakdown.",
          severity: "warning",
        })
      );
    }

    if (hasSafetyElements(scene) && !scene.production_notes?.trim()) {
      issues.push(
        issue({
          title: `Scene ${scene.scene_number} needs safety notes`,
          description: `Scene ${scene.scene_number} has VFX, stunts, vehicles, animals or critical props without production notes.`,
          affected_area: "scenes",
          suggested_action: "Add safety/production notes before shooting.",
          severity: "warning",
        })
      );
    }
  }

  for (const loc of ctx.locations) {
    const status = String(loc.status ?? "").toLowerCase();
    if (!status || status === "scouting" || status === "suggestion") {
      issues.push(
        issue({
          title: `Location not confirmed: ${loc.name}`,
          description: `${loc.name} is still in scouting/suggestion status.`,
          affected_area: "locations",
          suggested_action: "Confirm location status and permits in Locations.",
          severity: "warning",
        })
      );
    } else if (!CONFIRMED_LOCATION_STATUSES.has(status)) {
      issues.push(
        issue({
          title: `Location status unclear: ${loc.name}`,
          description: `${loc.name} has status "${loc.status}".`,
          affected_area: "locations",
          suggested_action: "Review and update location status.",
          severity: "info",
        })
      );
    }
  }

  for (const sheet of ctx.callSheets) {
    if (!sheet.scenes_to_shoot?.length) {
      issues.push(
        issue({
          title: `Call sheet v${sheet.version} has no scenes`,
          description: `Call sheet for day ${sheet.day_number} (${sheet.date}) lists zero scenes.`,
          affected_area: "call_sheets",
          suggested_action: "Add scenes to shoot in the call sheet editor.",
          severity: "critical",
        })
      );
    }

    const hasCrewCall = sheet.crew_call_times?.some((c) => c.call_time?.trim());
    const hasSchedule = sheet.schedule?.some((s) => s.time?.trim());
    if (!hasCrewCall && !hasSchedule) {
      issues.push(
        issue({
          title: `Call sheet v${sheet.version} missing crew call / schedule`,
          description: "No crew call times or schedule entries found.",
          affected_area: "call_sheets",
          suggested_action: "Add crew call and key schedule times.",
          severity: "warning",
        })
      );
    }

    if (!sheet.location?.trim()) {
      issues.push(
        issue({
          title: `Call sheet v${sheet.version} missing location`,
          description: `Call sheet day ${sheet.day_number} has no location field.`,
          affected_area: "call_sheets",
          suggested_action: "Set shoot location on the call sheet.",
          severity: "warning",
        })
      );
    }

    const sceneChars = new Set<string>();
    for (const sn of sheet.scenes_to_shoot ?? []) {
      const scene = ctx.scenes.find(
        (s) => s.scene_number === sn || s.id === sn
      );
      scene?.characters.forEach((c) => sceneChars.add(c.toLowerCase()));
    }
    const callCast = new Set(
      (sheet.cast_call_times ?? []).map((c) => c.name.toLowerCase())
    );
    const missingCast = [...sceneChars].filter((c) => !callCast.has(c));
    if (missingCast.length > 0 && sceneChars.size > 0) {
      issues.push(
        issue({
          title: `Call sheet v${sheet.version} cast mismatch`,
          description: `Characters in scenes but not in cast calls: ${missingCast.slice(0, 5).join(", ")}${missingCast.length > 5 ? "…" : ""}`,
          affected_area: "call_sheets",
          suggested_action: "Align cast call times with scene characters.",
          severity: "warning",
        })
      );
    }
  }

  const allCostumes = new Set(ctx.scenes.flatMap((s) => s.costumes));
  if (allCostumes.size > 0) {
    const costumeNotes = Object.keys(
      ctx.callSheets[0]?.department_notes ?? {}
    ).some((k) => /costum/i.test(k));
    if (ctx.callSheets.length > 0 && !costumeNotes) {
      issues.push(
        issue({
          title: "Costumes in breakdown without department notes",
          description: "Scenes list costumes but call sheets lack costume department notes.",
          affected_area: "call_sheets",
          suggested_action: "Add costume department notes to the latest call sheet.",
          severity: "info",
        })
      );
    }
  }

  if (ctx.documents.length === 0) {
    issues.push(
      issue({
        title: "No project documents uploaded",
        description: "Documents vault is empty.",
        affected_area: "documents",
        suggested_action: "Upload permits, location releases and key production docs.",
        severity: "warning",
      })
    );
  }

  const unapprovedReports = ctx.productionReports.filter(
    (r) => r.status !== "approved" && r.status !== "archived"
  );
  for (const report of unapprovedReports) {
    issues.push(
      issue({
        title: `Production report not approved: ${report.title ?? report.report_date}`,
        description: `Report status is "${report.status}".`,
        affected_area: "production_reports",
        suggested_action: "Submit and approve wrap reports after each shoot day.",
        severity: report.status === "draft" ? "warning" : "info",
      })
    );
  }

  for (const qc of ctx.breakdownQualityChecks) {
    if (qc.quality_status !== "pass" && qc.quality_status !== "ok") {
      const openIssues = Array.isArray(qc.issues) ? qc.issues.length : 0;
      issues.push(
        issue({
          title: "Open script breakdown quality warnings",
          description: `Breakdown quality status: ${qc.quality_status} (${openIssues} issue(s)).`,
          affected_area: "script_breakdown",
          suggested_action: "Review breakdown quality checks in Script Breakdown Pro.",
          severity: "warning",
        })
      );
    }
  }

  if (ctx.scenes.length === 0) {
    issues.push(
      issue({
        title: "No scenes in project",
        description: "The project has no scenes saved yet.",
        affected_area: "scenes",
        suggested_action: "Run Script Breakdown or add scenes manually.",
        severity: "critical",
      })
    );
  }

  const critical_count = issues.filter((i) => i.severity === "critical").length;
  const warning_count = issues.filter((i) => i.severity === "warning").length;
  const info_count = issues.filter((i) => i.severity === "info").length;

  const penalty = critical_count * 15 + warning_count * 5 + info_count * 1;
  const health_score = Math.max(0, Math.min(100, 100 - penalty));

  const suggested_next_actions = [
    ...new Set(
      issues
        .filter((i) => i.severity !== "info")
        .slice(0, 8)
        .map((i) => i.suggested_action)
    ),
  ];

  if (suggested_next_actions.length === 0 && health_score >= 80) {
    suggested_next_actions.push(
      "Production data looks solid — review the latest call sheet before send."
    );
  }

  return {
    health_score,
    issues,
    critical_count,
    warning_count,
    info_count,
    suggested_next_actions,
    summary: {
      scenes: ctx.scenes.length,
      locations: ctx.locations.length,
      call_sheets: ctx.callSheets.length,
      production_reports: ctx.productionReports.length,
      documents: ctx.documents.length,
      shooting_days: ctx.shootingDays.length,
    },
    ai_enhanced: false,
  };
}
