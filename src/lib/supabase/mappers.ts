import type {
  CallSheet,
  CastCrew,
  Company,
  CompanyMember,
  CompanyRole,
  CompanyStatus,
  Location,
  MemberStatus,
  Project,
  ProjectArchiveLog,
  ProjectDocument,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
  Scene,
  ShootingDay,
  User,
  Workspace,
  WorkspaceStatus,
  AccessStatus,
  ArchiveAction,
  CallSheetDistribution,
  CallSheetRecipient,
  CallSheetStatus,
  IssueCategory,
  IssueSeverity,
  ProductionReport,
  ProductionReportDepartmentNote,
  ProductionReportIssue,
  ProductionReportScene,
  ProductionReportStatus,
  SceneReportStatus,
  CastCrewStatus,
  Complexity,
  DayNight,
  IntExt,
} from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapProfile(row: any): User {
  return {
    id: row.id,
    email: row.email ?? "",
    full_name: row.full_name ?? "",
    avatar_url: row.avatar_url ?? undefined,
    global_role: row.global_role ?? "user",
    auth_status: row.auth_status ?? "active",
    created_at: row.created_at,
  };
}

export function mapCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    type: row.type ?? "",
    logo_url: row.logo_url ?? undefined,
    status: (row.status ?? "active") as CompanyStatus,
    created_at: row.created_at,
  };
}

export function mapCompanyMember(row: any): CompanyMember {
  return {
    id: row.id,
    company_id: row.company_id,
    user_id: row.user_id,
    role: row.role as CompanyRole,
    status: (row.status ?? "active") as MemberStatus,
    access_start_date: row.access_start_date ?? undefined,
    access_end_date: row.access_end_date ?? undefined,
    invited_at: row.invited_at ?? undefined,
    joined_at: row.joined_at ?? undefined,
  };
}

export function mapWorkspace(row: any): Workspace {
  return {
    id: row.id,
    company_id: row.company_id,
    name: row.name,
    description: row.description ?? undefined,
    status: (row.status ?? "active") as WorkspaceStatus,
    created_at: row.created_at,
  };
}

export function mapProject(row: any): Project {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    company_id: row.company_id,
    title: row.title,
    production_type: row.production_type ?? "",
    description: row.description ?? undefined,
    status: (row.status ?? "active") as ProjectStatus,
    start_date: row.start_date ?? undefined,
    end_date: row.end_date ?? undefined,
    archived_at: row.archived_at ?? undefined,
    locked_at: row.locked_at ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function mapProjectMember(row: any): ProjectMember {
  const profile = Array.isArray(row.profiles)
    ? row.profiles[0]
    : row.profiles ?? null;

  return {
    id: row.id,
    project_id: row.project_id,
    user_id: row.user_id,
    role: row.role as ProjectRole,
    department: row.department ?? undefined,
    email: profile?.email ?? undefined,
    full_name: profile?.full_name ?? undefined,
    global_role: profile?.global_role ?? undefined,
    permission_profile: row.permission_profile ?? undefined,
    can_view_breakdown: row.can_view_breakdown ?? undefined,
    can_edit_breakdown: row.can_edit_breakdown ?? undefined,
    can_view_scenes: row.can_view_scenes ?? undefined,
    can_edit_scenes: row.can_edit_scenes ?? undefined,
    can_view_cast_crew: row.can_view_cast_crew ?? undefined,
    can_edit_cast_crew: row.can_edit_cast_crew ?? undefined,
    can_view_locations: row.can_view_locations ?? undefined,
    can_edit_locations: row.can_edit_locations ?? undefined,
    can_view_shooting_days: row.can_view_shooting_days ?? undefined,
    can_edit_shooting_days: row.can_edit_shooting_days ?? undefined,
    can_view_call_sheets: row.can_view_call_sheets ?? undefined,
    can_edit_call_sheets: row.can_edit_call_sheets ?? undefined,
    can_view_production_reports: row.can_view_production_reports ?? undefined,
    can_edit_production_reports: row.can_edit_production_reports ?? undefined,
    can_view_set_assistant: row.can_view_set_assistant ?? undefined,
    can_manage_access: row.can_manage_access ?? undefined,
    access_status: (row.access_status ?? "active") as AccessStatus,
    access_start_date: row.access_start_date ?? undefined,
    access_end_date: row.access_end_date ?? undefined,
    created_at: row.created_at,
  };
}

export function mapScene(row: any): Scene {
  return {
    id: row.id,
    project_id: row.project_id,
    script_id: row.script_id ?? undefined,
    scene_number: row.scene_number ?? "",
    int_ext: (row.int_ext ?? "INT") as IntExt,
    day_night: (row.day_night ?? "DAY") as DayNight,
    location: row.location ?? "",
    short_description: row.short_description ?? "",
    characters: row.characters ?? [],
    props: row.props ?? [],
    costumes: row.costumes ?? [],
    vfx: row.vfx ?? [],
    stunts: row.stunts ?? [],
    vehicles: row.vehicles ?? [],
    animals: row.animals ?? [],
    special_requirements: row.special_requirements ?? [],
    complexity: (row.complexity ?? "medium") as Complexity,
    production_notes: row.production_notes ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function sceneToInsertRow(scene: Partial<Scene> & { project_id: string }) {
  return {
    project_id: scene.project_id,
    script_id: scene.script_id ?? null,
    scene_number: scene.scene_number ?? "",
    int_ext: scene.int_ext ?? "INT",
    day_night: scene.day_night ?? "DAY",
    location: scene.location ?? "",
    short_description: scene.short_description ?? "",
    characters: scene.characters ?? [],
    props: scene.props ?? [],
    costumes: scene.costumes ?? [],
    vfx: scene.vfx ?? [],
    stunts: scene.stunts ?? [],
    vehicles: scene.vehicles ?? [],
    animals: scene.animals ?? [],
    special_requirements: scene.special_requirements ?? [],
    complexity: scene.complexity ?? "medium",
    production_notes: scene.production_notes ?? "",
  };
}

export function sceneToRow(scene: Partial<Scene> & { project_id: string }) {
  return {
    ...sceneToInsertRow(scene),
    updated_at: new Date().toISOString(),
  };
}

export function mapCastCrew(row: any): CastCrew {
  return {
    id: row.id,
    project_id: row.project_id,
    full_name: row.full_name,
    role: row.role ?? "",
    department: row.department ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    call_time: row.call_time ?? "",
    permission_level: row.permission_level ?? "viewer",
    status: (row.status ?? "pending") as CastCrewStatus,
    created_at: row.created_at,
  };
}

export function mapLocation(row: any): Location {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    address: row.address ?? "",
    maps_link: row.maps_link ?? "",
    parking_notes: row.parking_notes ?? "",
    access_notes: row.access_notes ?? "",
    production_notes: row.production_notes ?? "",
    canonical_name: row.canonical_name ?? row.name,
    sub_location: row.sub_location ?? "",
    location_type: row.location_type ?? "unknown",
    status: row.status ?? "scouting",
    permit_status: row.permit_status ?? "",
    notes: row.notes ?? "",
    source: row.source ?? "",
    raw_name: row.raw_name ?? "",
    confidence_score:
      row.confidence_score != null ? Number(row.confidence_score) : undefined,
    scene_count: row.scene_count ?? undefined,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  };
}

export function mapShootingDay(row: any): ShootingDay {
  return {
    id: row.id,
    project_id: row.project_id,
    day_number: row.day_number ?? "",
    date: row.date ?? "",
    location_id: row.location_id ?? "",
    selected_scene_ids: (row.selected_scene_ids ?? []).map(String),
    general_crew_call: row.general_crew_call ?? "",
    cast_call: row.cast_call ?? "",
    makeup_call: row.makeup_call ?? "",
    first_shot: row.first_shot ?? "",
    lunch: row.lunch ?? "",
    estimated_wrap: row.estimated_wrap ?? "",
    parking: row.parking ?? "",
    transport_notes: row.transport_notes ?? "",
    emergency_contact: row.emergency_contact ?? "",
    production_notes: row.production_notes ?? "",
    created_at: row.created_at,
  };
}

function normalizeSheetStatus(status: string): CallSheetStatus {
  if (status === "final") return "ready_for_approval";
  if (status === "locked") return "approved";
  return (status ?? "draft") as CallSheetStatus;
}

export function mapCallSheet(row: any): CallSheet {
  const doc = row.document_data ?? {};
  return {
    id: row.id,
    project_id: row.project_id,
    shooting_day_id: row.shooting_day_id ?? "",
    version: row.version ?? 1,
    status: normalizeSheetStatus(row.status),
    pdf_url: row.pdf_url ?? undefined,
    generated_by: row.generated_by ?? "",
    created_by: row.created_by ?? row.generated_by ?? undefined,
    approved_by: row.approved_by ?? undefined,
    approved_at: row.approved_at ?? undefined,
    sent_by: row.sent_by ?? undefined,
    sent_at: row.sent_at ?? undefined,
    production_title: doc.production_title ?? "",
    project_title: doc.project_title ?? "",
    day_number: doc.day_number ?? "",
    date: doc.date ?? "",
    location: doc.location ?? "",
    maps_link: doc.maps_link ?? "",
    weather_notes: doc.weather_notes ?? "",
    schedule: doc.schedule ?? [],
    scenes_to_shoot: doc.scenes_to_shoot ?? [],
    cast_call_times: doc.cast_call_times ?? [],
    crew_call_times: doc.crew_call_times ?? [],
    department_notes: doc.department_notes ?? {},
    parking_notes: doc.parking_notes ?? "",
    transport_notes: doc.transport_notes ?? "",
    emergency_contacts: doc.emergency_contacts ?? [],
    production_notes: doc.production_notes ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function callSheetToDocumentData(cs: CallSheet) {
  return {
    production_title: cs.production_title,
    project_title: cs.project_title,
    day_number: cs.day_number,
    date: cs.date,
    location: cs.location,
    maps_link: cs.maps_link,
    weather_notes: cs.weather_notes,
    schedule: cs.schedule,
    scenes_to_shoot: cs.scenes_to_shoot,
    cast_call_times: cs.cast_call_times,
    crew_call_times: cs.crew_call_times,
    department_notes: cs.department_notes,
    parking_notes: cs.parking_notes,
    transport_notes: cs.transport_notes,
    emergency_contacts: cs.emergency_contacts,
    production_notes: cs.production_notes,
  };
}

export function mapCallSheetDistribution(row: any): CallSheetDistribution {
  return {
    id: row.id,
    company_id: row.company_id,
    workspace_id: row.workspace_id ?? undefined,
    project_id: row.project_id,
    call_sheet_id: row.call_sheet_id,
    version_number: row.version_number ?? 1,
    status: row.status ?? "sent",
    sent_by: row.sent_by ?? undefined,
    sent_at: row.sent_at ?? undefined,
    notes: row.notes ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    sender_name: row.sender_name ?? undefined,
  };
}

export function mapCallSheetRecipient(row: any): CallSheetRecipient {
  return {
    id: row.id,
    distribution_id: row.distribution_id,
    company_id: row.company_id,
    project_id: row.project_id,
    user_id: row.user_id ?? undefined,
    email: row.email ?? undefined,
    full_name: row.full_name ?? undefined,
    department: row.department ?? undefined,
    recipient_type: row.recipient_type ?? "user",
    target_key: row.target_key ?? undefined,
    acknowledged_at: row.acknowledged_at ?? undefined,
    acknowledged_by: row.acknowledged_by ?? undefined,
    acknowledged_user_agent: row.acknowledged_user_agent ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    recipient_name: row.recipient_name ?? undefined,
  };
}

export function mapProjectDocument(row: any): ProjectDocument {
  return {
    id: row.id,
    company_id: row.company_id,
    workspace_id: row.workspace_id ?? undefined,
    project_id: row.project_id,
    uploaded_by: row.uploaded_by,
    file_name: row.file_name,
    original_file_name: row.original_file_name,
    file_path: row.file_path,
    mime_type: row.mime_type ?? undefined,
    size_bytes: row.size_bytes ?? undefined,
    category: row.category,
    department: row.department ?? undefined,
    visibility: row.visibility ?? "project",
    notes: row.notes ?? undefined,
    is_deleted: row.is_deleted ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    uploader_name: row.uploader_name ?? undefined,
  };
}

export function mapProductionReport(row: any): ProductionReport {
  return {
    id: row.id,
    company_id: row.company_id,
    workspace_id: row.workspace_id ?? undefined,
    project_id: row.project_id,
    shooting_day_id: row.shooting_day_id ?? undefined,
    call_sheet_id: row.call_sheet_id ?? undefined,
    report_date: row.report_date,
    title: row.title ?? undefined,
    status: (row.status ?? "draft") as ProductionReportStatus,
    actual_crew_call_time: row.actual_crew_call_time ?? undefined,
    actual_first_shot_time: row.actual_first_shot_time ?? undefined,
    actual_wrap_time: row.actual_wrap_time ?? undefined,
    meal_break_time: row.meal_break_time ?? undefined,
    total_shooting_hours:
      row.total_shooting_hours != null
        ? Number(row.total_shooting_hours)
        : undefined,
    overtime_notes: row.overtime_notes ?? undefined,
    weather_notes: row.weather_notes ?? undefined,
    general_notes: row.general_notes ?? undefined,
    created_by: row.created_by ?? undefined,
    submitted_by: row.submitted_by ?? undefined,
    submitted_at: row.submitted_at ?? undefined,
    approved_by: row.approved_by ?? undefined,
    approved_at: row.approved_at ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    creator_name: row.creator_name ?? undefined,
    submitter_name: row.submitter_name ?? undefined,
    approver_name: row.approver_name ?? undefined,
  };
}

export function mapProductionReportScene(row: any): ProductionReportScene {
  return {
    id: row.id,
    report_id: row.report_id,
    scene_id: row.scene_id ?? undefined,
    scene_number: row.scene_number ?? undefined,
    status: (row.status ?? "completed") as SceneReportStatus,
    notes: row.notes ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function mapProductionReportIssue(row: any): ProductionReportIssue {
  return {
    id: row.id,
    report_id: row.report_id,
    category: row.category as IssueCategory,
    department: row.department ?? undefined,
    severity: (row.severity ?? "medium") as IssueSeverity,
    title: row.title,
    description: row.description ?? undefined,
    resolved: row.resolved ?? false,
    notes: row.notes ?? undefined,
    created_by: row.created_by ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function mapProductionReportDepartmentNote(
  row: any
): ProductionReportDepartmentNote {
  return {
    id: row.id,
    report_id: row.report_id,
    department: row.department,
    notes: row.notes ?? undefined,
    created_by: row.created_by ?? undefined,
    updated_by: row.updated_by ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function mapArchiveLog(row: any): ProjectArchiveLog {
  return {
    id: row.id,
    project_id: row.project_id,
    action: row.action as ArchiveAction,
    performed_by: row.performed_by ?? "",
    notes: row.notes ?? undefined,
    created_at: row.created_at,
  };
}
