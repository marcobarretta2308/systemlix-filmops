export type ActivityLogAction =
  | "project_opened"
  | "section_opened"
  | "breakdown_generated"
  | "breakdown_saved"
  | "document_uploaded"
  | "document_opened"
  | "document_downloaded"
  | "call_sheet_created"
  | "call_sheet_opened"
  | "call_sheet_pdf_generated"
  | "call_sheet_sent"
  | "call_sheet_acknowledged"
  | "production_report_created"
  | "production_report_submitted"
  | "production_report_approved"
  | "production_report_pdf_generated"
  | "production_check_run"
  | "call_sheet_analyzed"
  | "project_search_used"
  | "production_pack_generated"
  | "project_archived"
  | "project_locked"
  | "project_unlocked"
  | "project_deleted";

export type ActivityLogArea =
  | "dashboard"
  | "script_breakdown"
  | "scenes"
  | "locations"
  | "cast_crew"
  | "documents"
  | "call_sheets"
  | "shooting_days"
  | "production_reports"
  | "production_intelligence"
  | "production_pack"
  | "department"
  | "set_assistant"
  | "archive"
  | "activity_log";

export interface ActivityLogEntry {
  id: string;
  company_id?: string | null;
  workspace_id?: string | null;
  project_id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  department?: string | null;
  role?: string | null;
  action: string;
  area: string;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_label?: string | null;
  metadata: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface LogActivityInput {
  projectId: string;
  action: ActivityLogAction | string;
  area: ActivityLogArea | string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityLogFilters {
  department?: string;
  userId?: string;
  action?: string;
  area?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
