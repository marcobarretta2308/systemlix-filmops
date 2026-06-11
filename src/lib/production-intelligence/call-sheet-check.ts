import type { ProductionIntelligenceContext } from "./context";
import type {
  CallSheetChecklistItem,
  CallSheetCheckResult,
  ChecklistStatus,
} from "./types";
import type { CallSheet } from "@/lib/types";

function item(
  id: string,
  label: string,
  status: ChecklistStatus,
  detail?: string
): CallSheetChecklistItem {
  return { id, label, status, detail };
}

export function runDeterministicCallSheetCheck(
  ctx: ProductionIntelligenceContext,
  sheet: CallSheet
): CallSheetCheckResult {
  const checklist: CallSheetChecklistItem[] = [];
  const missing_fields: string[] = [];
  const risk_notes: string[] = [];
  const suggestions: string[] = [];
  const safety_warnings: string[] = [];
  const department_notes: string[] = [];

  const hasCrewCall = sheet.crew_call_times?.some((c) => c.call_time?.trim());
  checklist.push(
    item(
      "crew_call",
      "Crew call times",
      hasCrewCall ? "pass" : "fail",
      hasCrewCall ? undefined : "No crew call times set"
    )
  );
  if (!hasCrewCall) missing_fields.push("Crew call times");

  const hasCastCall = sheet.cast_call_times?.some((c) => c.call_time?.trim());
  checklist.push(
    item(
      "cast_call",
      "Cast call times",
      hasCastCall ? "pass" : "warn",
      hasCastCall ? undefined : "Cast calls missing"
    )
  );
  if (!hasCastCall) missing_fields.push("Cast call times");

  const hasFirstShot = sheet.schedule?.some((s) =>
    /first shot|prima ripresa|shoot/i.test(s.activity)
  );
  checklist.push(
    item(
      "first_shot",
      "First shot in schedule",
      hasFirstShot ? "pass" : "warn",
      hasFirstShot ? undefined : "No first shot entry in schedule"
    )
  );
  if (!hasFirstShot) missing_fields.push("First shot time");

  const hasWrap = sheet.schedule?.some((s) =>
    /wrap|fine|chiusura/i.test(s.activity)
  );
  checklist.push(
    item(
      "wrap",
      "Estimated wrap",
      hasWrap ? "pass" : "warn",
      hasWrap ? undefined : "No wrap time in schedule"
    )
  );
  if (!hasWrap) missing_fields.push("Wrap time");

  const hasScenes = sheet.scenes_to_shoot?.length > 0;
  checklist.push(
    item(
      "scenes",
      "Scenes to shoot",
      hasScenes ? "pass" : "fail",
      hasScenes ? `${sheet.scenes_to_shoot.length} scene(s)` : "No scenes listed"
    )
  );
  if (!hasScenes) {
    missing_fields.push("Scenes to shoot");
    risk_notes.push("Call sheet cannot be sent without scenes.");
  }

  const hasLocation = Boolean(sheet.location?.trim());
  checklist.push(
    item(
      "location",
      "Shoot location",
      hasLocation ? "pass" : "fail",
      sheet.location || "Missing"
    )
  );
  if (!hasLocation) missing_fields.push("Location");

  const hasEmergency = sheet.emergency_contacts?.some((c) => c.phone?.trim());
  checklist.push(
    item(
      "emergency",
      "Emergency contacts",
      hasEmergency ? "pass" : "warn"
    )
  );
  if (!hasEmergency) {
    missing_fields.push("Emergency contacts");
    safety_warnings.push("Add emergency contacts before distribution.");
  }

  const hasParking = Boolean(sheet.parking_notes?.trim());
  checklist.push(
    item("parking", "Parking notes", hasParking ? "pass" : "warn")
  );

  const deptKeys = Object.entries(sheet.department_notes ?? {}).filter(
    ([, v]) => v?.trim()
  );
  checklist.push(
    item(
      "dept_notes",
      "Department notes",
      deptKeys.length > 0 ? "pass" : "warn",
      `${deptKeys.length} department(s) with notes`
    )
  );
  deptKeys.forEach(([dept, note]) => {
    department_notes.push(`${dept}: ${note.slice(0, 120)}`);
  });

  const sceneChars = new Set<string>();
  for (const sn of sheet.scenes_to_shoot ?? []) {
    const scene = ctx.scenes.find(
      (s) => s.scene_number === sn || s.id === sn
    );
    scene?.characters.forEach((c) => sceneChars.add(c));
  }
  const callCast = new Set((sheet.cast_call_times ?? []).map((c) => c.name));
  const missingCast = [...sceneChars].filter((c) => !callCast.has(c));
  if (missingCast.length > 0) {
    risk_notes.push(
      `Cast in scenes but not on call sheet: ${missingCast.join(", ")}`
    );
    suggestions.push("Add missing cast members to cast call times.");
  }

  for (const sn of sheet.scenes_to_shoot ?? []) {
    const scene = ctx.scenes.find(
      (s) => s.scene_number === sn || s.id === sn
    );
    if (!scene) continue;
    const needsSafety =
      scene.stunts.length > 0 ||
      scene.vfx.length > 0 ||
      scene.vehicles.length > 0 ||
      scene.animals.length > 0;
    if (needsSafety && !sheet.production_notes?.trim()) {
      safety_warnings.push(
        `Scene ${scene.scene_number} has stunt/VFX/vehicles/animals — add safety notes.`
      );
    }
  }

  if (sheet.status === "draft") {
    suggestions.push("Approve the call sheet before sending to crew.");
  }
  if (sheet.status === "approved" || sheet.status === "ready_for_approval") {
    suggestions.push("Call sheet is workflow-ready — run Smart Enhancer before send.");
  }

  const failCount = checklist.filter((c) => c.status === "fail").length;
  const warnCount = checklist.filter((c) => c.status === "warn").length;
  const quality_score = Math.max(
    0,
    Math.min(100, 100 - failCount * 20 - warnCount * 8)
  );

  const ready_to_send =
    failCount === 0 &&
    sheet.status === "approved" &&
    hasScenes &&
    hasLocation &&
    hasEmergency;

  if (!ready_to_send && sheet.status !== "sent") {
    suggestions.push(
      ready_to_send
        ? "Ready for distribution."
        : "Resolve critical checklist items before sending."
    );
  }

  const label = `v${sheet.version} · Day ${sheet.day_number} · ${sheet.date}`;

  return {
    call_sheet_id: sheet.id,
    call_sheet_label: label,
    quality_score,
    ready_to_send,
    checklist,
    missing_fields,
    risk_notes,
    suggestions,
    safety_warnings,
    department_notes,
    ai_enhanced: false,
  };
}
