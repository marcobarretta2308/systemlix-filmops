// Supabase-ready database types for Systemlix FilmOps (multi-tenant)

export type ProjectStatus = "active" | "paused" | "archived" | "locked";
export type CompanyStatus = "active" | "suspended" | "archived";
export type WorkspaceStatus = "active" | "archived";
export type MemberStatus = "active" | "invited" | "suspended";
export type AccessStatus = "active" | "revoked" | "pending";
export type CallSheetStatus = "draft" | "final" | "locked" | "archived";
export type Complexity = "low" | "medium" | "high" | "very_high";
export type IntExt = "INT" | "EXT";
export type DayNight = "DAY" | "NIGHT";
export type CastCrewStatus = "confirmed" | "pending" | "issue";

export type CompanyRole =
  | "platform_owner"
  | "company_admin"
  | "producer"
  | "viewer";

export type ProjectRole =
  | "project_admin"
  | "producer"
  | "assistant_director"
  | "department_user"
  | "cast_crew_user"
  | "viewer";

export type SetAssistantRole =
  | "producer"
  | "assistant_director"
  | "actor"
  | "crew"
  | "driver"
  | "extra";

export type ArchiveAction =
  | "archived"
  | "locked"
  | "completed"
  | "exported"
  | "unlocked";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  type: string;
  logo_url?: string;
  status: CompanyStatus;
  created_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  status: MemberStatus;
  invited_at?: string;
  joined_at?: string;
}

export interface Workspace {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  status: WorkspaceStatus;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  company_id: string;
  title: string;
  production_type: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  archived_at?: string;
  locked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  department?: string;
  access_status: AccessStatus;
  created_at: string;
}

export interface Script {
  id: string;
  project_id: string;
  title: string;
  file_url?: string;
  raw_text?: string;
  uploaded_by: string;
  created_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  script_id?: string;
  scene_number: string;
  int_ext: IntExt;
  day_night: DayNight;
  location: string;
  short_description: string;
  characters: string[];
  props: string[];
  costumes: string[];
  vfx: string[];
  stunts: string[];
  vehicles: string[];
  animals: string[];
  special_requirements: string[];
  complexity: Complexity;
  production_notes: string;
  created_at: string;
  updated_at: string;
}

export interface CastCrew {
  id: string;
  project_id: string;
  full_name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  call_time: string;
  permission_level: string;
  status: CastCrewStatus;
  created_at: string;
}

export interface Location {
  id: string;
  project_id: string;
  name: string;
  address: string;
  maps_link: string;
  parking_notes: string;
  access_notes: string;
  production_notes: string;
  created_at: string;
}

export interface ShootingDay {
  id: string;
  project_id: string;
  day_number: string;
  date: string;
  location_id: string;
  selected_scene_ids: string[];
  general_crew_call: string;
  cast_call: string;
  makeup_call: string;
  first_shot: string;
  lunch: string;
  estimated_wrap: string;
  parking: string;
  transport_notes: string;
  emergency_contact: string;
  production_notes: string;
  created_at: string;
}

export interface CallSheetScheduleItem {
  time: string;
  activity: string;
}

export interface CallSheetCallTime {
  name: string;
  role: string;
  department: string;
  call_time: string;
}

export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
}

export interface CallSheet {
  id: string;
  project_id: string;
  shooting_day_id: string;
  version: number;
  status: CallSheetStatus;
  pdf_url?: string;
  generated_by: string;
  production_title: string;
  project_title: string;
  day_number: string;
  date: string;
  location: string;
  maps_link: string;
  weather_notes: string;
  schedule: CallSheetScheduleItem[];
  scenes_to_shoot: string[];
  cast_call_times: CallSheetCallTime[];
  crew_call_times: CallSheetCallTime[];
  department_notes: Record<string, string>;
  parking_notes: string;
  transport_notes: string;
  emergency_contacts: EmergencyContact[];
  production_notes: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantThread {
  id: string;
  project_id: string;
  user_id: string;
  role_context: SetAssistantRole;
  created_at: string;
}

export interface AssistantMessage {
  id: string;
  thread_id: string;
  sender: "user" | "assistant";
  message: string;
  created_at: string;
}

export interface ProjectArchiveLog {
  id: string;
  project_id: string;
  action: ArchiveAction;
  performed_by: string;
  notes?: string;
  created_at: string;
}

export interface PlatformStore {
  users: User[];
  companies: Company[];
  companyMembers: CompanyMember[];
  workspaces: Workspace[];
  projects: Project[];
  projectMembers: ProjectMember[];
  scripts: Script[];
  scenes: Scene[];
  castCrew: CastCrew[];
  locations: Location[];
  shootingDays: ShootingDay[];
  callSheets: CallSheet[];
  archiveLogs: ProjectArchiveLog[];
}
