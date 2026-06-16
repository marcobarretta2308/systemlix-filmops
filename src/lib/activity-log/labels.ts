export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  project_opened: "Project opened",
  section_opened: "Section opened",
  breakdown_generated: "Breakdown generated",
  breakdown_saved: "Breakdown saved",
  document_uploaded: "Document uploaded",
  document_opened: "Document opened",
  document_downloaded: "Document downloaded",
  call_sheet_created: "Call sheet created",
  call_sheet_opened: "Call sheet opened",
  call_sheet_pdf_generated: "Call sheet PDF generated",
  call_sheet_sent: "Call sheet sent",
  call_sheet_acknowledged: "Call sheet acknowledged",
  production_report_created: "Production report created",
  production_report_submitted: "Production report submitted",
  production_report_approved: "Production report approved",
  production_report_pdf_generated: "Production report PDF generated",
  production_check_run: "Production check run",
  call_sheet_analyzed: "Call sheet analyzed",
  project_search_used: "Project search used",
  production_pack_generated: "Production pack generated",
  project_archived: "Project archived",
  project_locked: "Project locked",
  project_unlocked: "Project unlocked",
  project_deleted: "Project deleted",
};

export const ACTIVITY_AREA_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  script_breakdown: "Script Breakdown",
  scenes: "Scenes",
  locations: "Locations",
  cast_crew: "Cast & Crew",
  documents: "Documents",
  call_sheets: "Call Sheets",
  shooting_days: "Shooting Days",
  production_reports: "Production Reports",
  production_intelligence: "Production Intelligence",
  production_pack: "Production Pack",
  department: "Department",
  set_assistant: "Set Assistant",
  archive: "Archive",
  activity_log: "Activity Log",
};

export function formatActivityAction(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

export function formatActivityArea(area: string): string {
  return ACTIVITY_AREA_LABELS[area] ?? area.replace(/_/g, " ");
}

export function formatActivityDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

export function activityLogCsvFilename(projectTitle: string): string {
  const slug =
    projectTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project";
  const date = new Date().toISOString().slice(0, 10);
  return `filmops-activity-log-${slug}-${date}.csv`;
}
