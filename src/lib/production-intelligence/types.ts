export type IssueSeverity = "critical" | "warning" | "info";

export interface ProductionIssue {
  id: string;
  title: string;
  description: string;
  affected_area: string;
  suggested_action: string;
  severity: IssueSeverity;
}

export interface ProductionCheckResult {
  health_score: number;
  issues: ProductionIssue[];
  critical_count: number;
  warning_count: number;
  info_count: number;
  suggested_next_actions: string[];
  summary: {
    scenes: number;
    locations: number;
    call_sheets: number;
    production_reports: number;
    documents: number;
    shooting_days: number;
  };
  ai_enhanced: boolean;
  fallback_message?: string;
}

export type ChecklistStatus = "pass" | "warn" | "fail";

export interface CallSheetChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
  detail?: string;
}

export interface CallSheetCheckResult {
  call_sheet_id: string;
  call_sheet_label: string;
  quality_score: number;
  ready_to_send: boolean;
  checklist: CallSheetChecklistItem[];
  missing_fields: string[];
  risk_notes: string[];
  suggestions: string[];
  safety_warnings: string[];
  department_notes: string[];
  ai_enhanced: boolean;
  fallback_message?: string;
}

export interface ProjectSearchResult {
  answer: string;
  sources: string[];
  actions: string[];
  ai_enhanced: boolean;
  fallback_message?: string;
}

export type ProductionIntelligenceAction =
  | "production_check"
  | "call_sheet_check"
  | "project_search";
