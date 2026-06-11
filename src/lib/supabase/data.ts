import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { REVOKABLE_PROJECT_ROLES } from "@/lib/access-control";
import type {
  ArchiveAction,
  CallSheet,
  CallSheetDistribution,
  CallSheetRecipient,
  CastCrew,
  Company,
  CompanyMember,
  Location,
  Project,
  ProjectArchiveLog,
  ProductionReport,
  ProductionReportDepartmentNote,
  ProductionReportIssue,
  ProductionReportScene,
  ProjectDocument,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
  Scene,
  ShootingDay,
  User,
  Workspace,
} from "@/lib/types";
import {
  callSheetToDocumentData,
  mapArchiveLog,
  mapProjectDocument,
  mapCallSheet,
  mapCallSheetDistribution,
  mapCallSheetRecipient,
  mapCastCrew,
  mapCompany,
  mapCompanyMember,
  mapLocation,
  mapProfile,
  mapProject,
  mapProjectMember,
  mapProductionReport,
  mapProductionReportDepartmentNote,
  mapProductionReportIssue,
  mapProductionReportScene,
  mapScene,
  mapShootingDay,
  mapWorkspace,
  sceneToInsertRow,
  sceneToRow,
} from "./mappers";
import { formatSupabaseError, logSupabaseError } from "./errors";

const PROFILE_COLUMNS =
  "id, email, full_name, avatar_url, global_role, auth_status, created_at";

/** Join project_members with profiles — department only on project_members */
const PROJECT_MEMBER_WITH_PROFILE_SELECT =
  "*, profiles(email, full_name, global_role)";

export type FetchResult<T> = {
  data: T;
  error: string | null;
};

export async function waitForAuthSession(
  supabase: SupabaseClient,
  signInSession?: Session | null
): Promise<{ userId: string } | { error: string }> {
  if (signInSession?.access_token) {
    const { error } = await supabase.auth.setSession({
      access_token: signInSession.access_token,
      refresh_token: signInSession.refresh_token,
    });
    if (error) {
      console.warn("[FilmOps] setSession:", error.message);
    }
    return { userId: signInSession.user.id };
  }

  const { data: first, error: firstError } = await supabase.auth.getUser();
  if (first.user) return { userId: first.user.id };

  await new Promise((resolve) => setTimeout(resolve, 250));

  const { data: retry, error: retryError } = await supabase.auth.getUser();
  if (retry.user) return { userId: retry.user.id };

  const message = retryError?.message ?? firstError?.message ?? "Sessione non attiva";
  return { error: message };
}

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<FetchResult<User | null>> {
  let { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (
    error &&
    (error.code === "42703" ||
      error.message.includes("global_role") ||
      error.message.includes("auth_status"))
  ) {
    const fallback = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (fallback.error) {
      console.error("[FilmOps] fetchProfile fallback error:", fallback.error.message);
      return { data: null, error: fallback.error.message };
    }
    return { data: fallback.data ? mapProfile(fallback.data) : null, error: null };
  }

  if (error) {
    console.error("[FilmOps] fetchProfile error:", error.message, error);
    return { data: null, error: error.message };
  }
  return { data: data ? mapProfile(data) : null, error: null };
}

export async function ensureProfile(
  supabase: SupabaseClient,
  authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }
): Promise<FetchResult<User | null>> {
  const existing = await fetchProfile(supabase, authUser.id);
  if (existing.data) return existing;
  if (existing.error) return existing;

  const fullName =
    (authUser.user_metadata?.full_name as string | undefined) ??
    authUser.email?.split("@")[0] ??
    "User";

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: authUser.id,
      email: authUser.email,
      full_name: fullName,
      global_role: "user",
      auth_status: "active",
    })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    console.error("[FilmOps] ensureProfile insert:", error.message);
    return { data: null, error: error.message };
  }
  return { data: mapProfile(data), error: null };
}

export async function fetchAllWorkspaces(
  supabase: SupabaseClient
): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapWorkspace);
}

export async function fetchAllProjects(
  supabase: SupabaseClient
): Promise<{ projects: Project[]; members: ProjectMember[] }> {
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  if (pErr) throw pErr;

  const projectList = (projects ?? []).map(mapProject);
  if (projectList.length === 0) return { projects: [], members: [] };

  const members = await fetchProjectMembersForProjects(
    supabase,
    projectList.map((p) => p.id)
  );

  return {
    projects: projectList,
    members,
  };
}

export async function fetchPlatformOwnerBootstrap(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  companies: Company[];
  memberships: CompanyMember[];
  workspaces: Workspace[];
  projects: Project[];
  projectMembers: ProjectMember[];
}> {
  const companies = await fetchAllCompanies(supabase);
  const { data: memberships, error: mErr } = await supabase
    .from("company_members")
    .select("*")
    .eq("user_id", userId);
  if (mErr) throw mErr;

  const workspaces = await fetchAllWorkspaces(supabase);
  const { projects, members: projectMembers } = await fetchAllProjects(supabase);

  return {
    companies,
    memberships: (memberships ?? []).map(mapCompanyMember),
    workspaces,
    projects,
    projectMembers,
  };
}

export async function fetchAllCompanies(
  supabase: SupabaseClient
): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return (data ?? []).map(mapCompany);
}

export async function fetchUserCompanies(
  supabase: SupabaseClient,
  userId: string,
  options?: { platformOwner?: boolean }
): Promise<{ companies: Company[]; memberships: CompanyMember[] }> {
  if (options?.platformOwner) {
    const companies = await fetchAllCompanies(supabase);
    const { data: memberships, error: mErr } = await supabase
      .from("company_members")
      .select("*")
      .eq("user_id", userId);
    if (mErr) throw mErr;
    return {
      companies,
      memberships: (memberships ?? []).map(mapCompanyMember),
    };
  }
  const { data: memberships, error: mErr } = await supabase
    .from("company_members")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");
  if (mErr) throw mErr;

  const members = (memberships ?? []).map(mapCompanyMember);
  const companyIds = members.map((m) => m.company_id);
  if (companyIds.length === 0) return { companies: [], memberships: members };

  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("*")
    .in("id", companyIds)
    .eq("status", "active");
  if (cErr) throw cErr;

  return {
    companies: (companies ?? []).map(mapCompany),
    memberships: members,
  };
}

export async function fetchWorkspaces(
  supabase: SupabaseClient,
  companyId: string
): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapWorkspace);
}

export async function fetchProjects(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ projects: Project[]; members: ProjectMember[] }> {
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  if (pErr) throw pErr;

  const projectList = (projects ?? []).map(mapProject);
  if (projectList.length === 0) return { projects: [], members: [] };

  const members = await fetchProjectMembersForProjects(
    supabase,
    projectList.map((p) => p.id)
  );

  return {
    projects: projectList,
    members,
  };
}

export async function softDeleteProjectRecord(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  notes?: string
): Promise<Project> {
  const ts = new Date().toISOString();
  const { data, error } = await supabase
    .from("projects")
    .update({
      is_deleted: true,
      deleted_at: ts,
      deleted_by: userId,
      updated_at: ts,
    })
    .eq("id", projectId)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Project not found or already deleted");

  await addArchiveLogRecord(
    supabase,
    projectId,
    userId,
    "project_deleted",
    notes ?? "Project moved to trash"
  );

  return mapProject(data);
}

async function enrichProjectMembersWithDisplayNames(
  supabase: SupabaseClient,
  members: ProjectMember[]
): Promise<ProjectMember[]> {
  const missing = members.filter((m) => !m.full_name?.trim());
  if (missing.length === 0) return members;

  const names = new Map<string, string>();
  await Promise.all(
    missing.map(async (m) => {
      const { data } = await supabase.rpc("profile_display_name", {
        uid: m.user_id,
      });
      if (data) names.set(m.user_id, String(data));
    })
  );

  return members.map((m) => ({
    ...m,
    full_name: m.full_name?.trim() ? m.full_name : names.get(m.user_id),
  }));
}

export async function fetchProjectMembersForProjects(
  supabase: SupabaseClient,
  projectIds: string[]
): Promise<ProjectMember[]> {
  if (projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from("project_members")
    .select(PROJECT_MEMBER_WITH_PROFILE_SELECT)
    .in("project_id", projectIds);

  if (error) {
    logSupabaseError("fetchProjectMembersForProjects", error, { projectIds });
    throw error;
  }

  const mapped = (data ?? []).map(mapProjectMember);
  return enrichProjectMembersWithDisplayNames(supabase, mapped);
}

export async function fetchProjectMembersForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectMember[]> {
  return fetchProjectMembersForProjects(supabase, [projectId]);
}

export async function fetchProjectData(
  supabase: SupabaseClient,
  projectId: string
): Promise<{
  scenes: Scene[];
  castCrew: CastCrew[];
  locations: Location[];
  shootingDays: ShootingDay[];
  callSheets: CallSheet[];
  archiveLogs: ProjectArchiveLog[];
  documents: ProjectDocument[];
  distributions: CallSheetDistribution[];
  recipients: CallSheetRecipient[];
  productionReports: ProductionReport[];
  productionReportScenes: ProductionReportScene[];
  productionReportIssues: ProductionReportIssue[];
  productionReportDeptNotes: ProductionReportDepartmentNote[];
}> {
  const [
    scenesRes,
    castRes,
    locRes,
    daysRes,
    sheetsRes,
    logsRes,
    docsRes,
    distRes,
    recipRes,
    reportsRes,
  ] = await Promise.all([
      supabase
        .from("scenes")
        .select("*")
        .eq("project_id", projectId)
        .order("scene_number"),
      supabase
        .from("cast_crew")
        .select("*")
        .eq("project_id", projectId)
        .order("full_name"),
      supabase
        .from("locations")
        .select("*")
        .eq("project_id", projectId)
        .order("name"),
      supabase
        .from("shooting_days")
        .select("*")
        .eq("project_id", projectId)
        .order("date"),
      supabase
        .from("call_sheets")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_archive_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("call_sheet_distributions")
        .select("*")
        .eq("project_id", projectId)
        .order("sent_at", { ascending: false }),
      supabase
        .from("call_sheet_recipients")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("production_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("report_date", { ascending: false }),
    ]);

  for (const res of [
    scenesRes,
    castRes,
    locRes,
    daysRes,
    sheetsRes,
    logsRes,
    docsRes,
    distRes,
    recipRes,
    reportsRes,
  ]) {
    if (res.error) throw res.error;
  }

  const reportIds = (reportsRes.data ?? []).map((r) => r.id as string);
  let reportScenesData: unknown[] = [];
  let reportIssuesData: unknown[] = [];
  let reportDeptNotesData: unknown[] = [];

  if (reportIds.length > 0) {
    const [scenesR, issuesR, notesR] = await Promise.all([
      supabase
        .from("production_report_scenes")
        .select("*")
        .in("report_id", reportIds)
        .order("scene_number"),
      supabase
        .from("production_report_issues")
        .select("*")
        .in("report_id", reportIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("production_report_department_notes")
        .select("*")
        .in("report_id", reportIds)
        .order("department"),
    ]);
    for (const res of [scenesR, issuesR, notesR]) {
      if (res.error) throw res.error;
    }
    reportScenesData = scenesR.data ?? [];
    reportIssuesData = issuesR.data ?? [];
    reportDeptNotesData = notesR.data ?? [];
  }

  const documents = await enrichProjectDocumentsWithUploaderNames(
    supabase,
    (docsRes.data ?? []).map(mapProjectDocument)
  );

  const distributions = await enrichDistributionsWithNames(
    supabase,
    (distRes.data ?? []).map(mapCallSheetDistribution)
  );
  const recipients = await enrichRecipientsWithNames(
    supabase,
    (recipRes.data ?? []).map(mapCallSheetRecipient)
  );

  const productionReports = await enrichProductionReportsWithNames(
    supabase,
    (reportsRes.data ?? []).map(mapProductionReport)
  );

  return {
    scenes: (scenesRes.data ?? []).map(mapScene),
    castCrew: (castRes.data ?? []).map(mapCastCrew),
    locations: (locRes.data ?? []).map(mapLocation),
    shootingDays: (daysRes.data ?? []).map(mapShootingDay),
    callSheets: (sheetsRes.data ?? []).map(mapCallSheet),
    archiveLogs: (logsRes.data ?? []).map(mapArchiveLog),
    documents,
    distributions,
    recipients,
    productionReports,
    productionReportScenes: reportScenesData.map(mapProductionReportScene),
    productionReportIssues: reportIssuesData.map(mapProductionReportIssue),
    productionReportDeptNotes: reportDeptNotesData.map(
      mapProductionReportDepartmentNote
    ),
  };
}

async function enrichProductionReportsWithNames(
  supabase: SupabaseClient,
  rows: ProductionReport[]
): Promise<ProductionReport[]> {
  const ids = [
    ...new Set(
      rows.flatMap((r) => [
        r.created_by,
        r.submitted_by,
        r.approved_by,
      ]).filter(Boolean)
    ),
  ] as string[];
  const names = new Map<string, string>();
  await Promise.all(
    ids.map(async (uid) => {
      const { data } = await supabase.rpc("profile_display_name", { uid });
      if (data) names.set(uid, String(data));
    })
  );
  return rows.map((r) => ({
    ...r,
    creator_name: r.created_by ? names.get(r.created_by) : undefined,
    submitter_name: r.submitted_by ? names.get(r.submitted_by) : undefined,
    approver_name: r.approved_by ? names.get(r.approved_by) : undefined,
  }));
}

async function enrichDistributionsWithNames(
  supabase: SupabaseClient,
  rows: CallSheetDistribution[]
): Promise<CallSheetDistribution[]> {
  const ids = [...new Set(rows.map((r) => r.sent_by).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  await Promise.all(
    ids.map(async (uid) => {
      const { data } = await supabase.rpc("profile_display_name", { uid });
      if (data) names.set(uid, String(data));
    })
  );
  return rows.map((r) => ({
    ...r,
    sender_name: r.sent_by ? names.get(r.sent_by) : undefined,
  }));
}

async function enrichRecipientsWithNames(
  supabase: SupabaseClient,
  rows: CallSheetRecipient[]
): Promise<CallSheetRecipient[]> {
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  await Promise.all(
    ids.map(async (uid) => {
      const { data } = await supabase.rpc("profile_display_name", { uid });
      if (data) names.set(uid, String(data));
    })
  );
  return rows.map((r) => ({
    ...r,
    recipient_name: r.user_id ? names.get(r.user_id) ?? r.full_name : r.full_name,
  }));
}

async function enrichProjectDocumentsWithUploaderNames(
  supabase: SupabaseClient,
  documents: ProjectDocument[]
): Promise<ProjectDocument[]> {
  if (documents.length === 0) return documents;

  const uniqueIds = [...new Set(documents.map((d) => d.uploaded_by))];
  const names = new Map<string, string>();

  await Promise.all(
    uniqueIds.map(async (uid) => {
      const { data, error } = await supabase.rpc("profile_display_name", { uid });
      if (!error && data) {
        names.set(uid, String(data));
      }
    })
  );

  return documents.map((doc) => ({
    ...doc,
    uploader_name: names.get(doc.uploaded_by) ?? doc.uploaded_by.slice(0, 8),
  }));
}

export async function insertProjectDocumentRecord(
  supabase: SupabaseClient,
  row: {
    id: string;
    company_id: string;
    workspace_id?: string;
    project_id: string;
    uploaded_by: string;
    file_name: string;
    original_file_name: string;
    file_path: string;
    mime_type?: string;
    size_bytes?: number;
    category: string;
    department?: string | null;
    visibility: string;
    notes?: string | null;
  }
): Promise<ProjectDocument> {
  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      ...row,
      department: row.department ?? null,
      notes: row.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  const mapped = mapProjectDocument(data);
  const [enriched] = await enrichProjectDocumentsWithUploaderNames(supabase, [mapped]);
  return enriched;
}

export async function softDeleteProjectDocumentRecord(
  supabase: SupabaseClient,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("project_documents")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", documentId);
  if (error) throw error;
}

export async function createOnboardingProduction(
  supabase: SupabaseClient,
  userId: string,
  data: {
    companyName: string;
    companyType: string;
    workspaceName: string;
    projectTitle?: string;
  }
): Promise<{
  company: Company;
  workspace: Workspace;
  project?: Project;
}> {
  const { data: companyRow, error: cErr } = await supabase
    .from("companies")
    .insert({ name: data.companyName, type: data.companyType, status: "active" })
    .select()
    .single();
  if (cErr) throw cErr;
  const company = mapCompany(companyRow);

  const { error: mErr } = await supabase.from("company_members").insert({
    company_id: company.id,
    user_id: userId,
    role: "company_admin",
    status: "active",
    joined_at: new Date().toISOString(),
  });
  if (mErr) throw mErr;

  const { data: wsRow, error: wErr } = await supabase
    .from("workspaces")
    .insert({
      company_id: company.id,
      name: data.workspaceName,
      status: "active",
    })
    .select()
    .single();
  if (wErr) throw wErr;
  const workspace = mapWorkspace(wsRow);

  let project: Project | undefined;
  if (data.projectTitle?.trim()) {
    const { data: pRow, error: pErr } = await supabase
      .from("projects")
      .insert({
        workspace_id: workspace.id,
        company_id: company.id,
        title: data.projectTitle.trim(),
        production_type: data.companyType,
        status: "active",
      })
      .select()
      .single();
    if (pErr) throw pErr;
    project = mapProject(pRow);

    await supabase.from("project_members").insert({
      project_id: project.id,
      user_id: userId,
      role: "project_admin",
      access_status: "active",
    });
  }

  return { company, workspace, project };
}

export async function createCompanyRecord(
  supabase: SupabaseClient,
  userId: string,
  data: { name: string; type: string; status?: Company["status"] }
): Promise<{ company: Company; membership: CompanyMember }> {
  const { data: row, error } = await supabase
    .from("companies")
    .insert({
      name: data.name,
      type: data.type,
      status: data.status ?? "active",
    })
    .select()
    .single();
  if (error) throw error;

  const { data: memberRow, error: mErr } = await supabase
    .from("company_members")
    .insert({
      company_id: row.id,
      user_id: userId,
      role: "company_admin",
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (mErr) throw mErr;

  return {
    company: mapCompany(row),
    membership: mapCompanyMember(memberRow),
  };
}

export async function createPlatformSetup(
  supabase: SupabaseClient,
  userId: string,
  input: {
    company?: { name: string; type: string; status?: Company["status"] };
    companyId?: string;
    workspace?: { name: string; description?: string };
    workspaceId?: string;
    project: {
      title: string;
      production_type: string;
      description?: string;
      status: ProjectStatus;
      start_date?: string;
      end_date?: string;
    };
  }
): Promise<{
  company: Company;
  companyMember: CompanyMember;
  workspace: Workspace;
  project: Project;
  projectMember: ProjectMember;
}> {
  let company: Company;
  let companyMember: CompanyMember;

  if (input.companyId) {
    const { data: companyRow, error: cErr } = await supabase
      .from("companies")
      .select("*")
      .eq("id", input.companyId)
      .single();
    if (cErr) throw cErr;
    company = mapCompany(companyRow);

    const { data: memberRow, error: mErr } = await supabase
      .from("company_members")
      .select("*")
      .eq("company_id", input.companyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (mErr) throw mErr;

    if (memberRow) {
      companyMember = mapCompanyMember(memberRow);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("company_members")
        .insert({
          company_id: input.companyId,
          user_id: userId,
          role: "company_admin",
          status: "active",
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (insErr) throw insErr;
      companyMember = mapCompanyMember(inserted);
    }
  } else if (input.company) {
    const created = await createCompanyRecord(supabase, userId, input.company);
    company = created.company;
    companyMember = created.membership;
  } else {
    throw new Error("Produzione mancante per il setup iniziale");
  }

  let workspace: Workspace;
  if (input.workspaceId) {
    const { data: wsRow, error: wErr } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", input.workspaceId)
      .single();
    if (wErr) throw wErr;
    workspace = mapWorkspace(wsRow);
  } else if (input.workspace) {
    workspace = await createWorkspaceRecord(supabase, company.id, input.workspace);
  } else {
    throw new Error("Workspace mancante per il setup iniziale");
  }

  const project = await createProjectRecord(supabase, userId, {
    company_id: company.id,
    workspace_id: workspace.id,
    title: input.project.title,
    production_type: input.project.production_type,
    description: input.project.description,
    status: input.project.status,
    start_date: input.project.start_date,
    end_date: input.project.end_date,
  });

  const { data: projectMemberRow, error: pmErr } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", project.id)
    .eq("user_id", userId)
    .single();
  if (pmErr) throw pmErr;

  return {
    company,
    companyMember,
    workspace,
    project,
    projectMember: mapProjectMember(projectMemberRow),
  };
}

export async function createWorkspaceRecord(
  supabase: SupabaseClient,
  companyId: string,
  data: { name: string; description?: string }
): Promise<Workspace> {
  const { data: row, error } = await supabase
    .from("workspaces")
    .insert({
      company_id: companyId,
      name: data.name,
      description: data.description ?? null,
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;
  return mapWorkspace(row);
}

export async function createProjectRecord(
  supabase: SupabaseClient,
  userId: string,
  data: {
    company_id: string;
    workspace_id: string;
    title: string;
    production_type: string;
    description?: string;
    status: ProjectStatus;
    start_date?: string;
    end_date?: string;
  }
): Promise<Project> {
  const { data: row, error } = await supabase
    .from("projects")
    .insert({
      company_id: data.company_id,
      workspace_id: data.workspace_id,
      title: data.title,
      production_type: data.production_type,
      description: data.description ?? null,
      status: data.status,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: pmErr } = await supabase.from("project_members").insert({
    project_id: row.id,
    user_id: userId,
    role: "project_admin",
    access_status: "active",
  });
  if (pmErr) throw pmErr;

  return mapProject(row);
}

function statusToArchiveAction(status: ProjectStatus): ArchiveAction {
  if (status === "archived") return "project_archived";
  if (status === "locked") return "project_locked";
  return "project_reactivated";
}

export async function revokeOperationalProjectAccess(
  supabase: SupabaseClient,
  projectId: string,
  performedBy: string,
  notes?: string
): Promise<number> {
  const { data: members, error: fetchErr } = await supabase
    .from("project_members")
    .select("id, role")
    .eq("project_id", projectId)
    .eq("access_status", "active");
  if (fetchErr) throw fetchErr;

  const revocable = (members ?? []).filter((m) =>
    REVOKABLE_PROJECT_ROLES.includes(m.role as ProjectRole)
  );
  if (revocable.length === 0) return 0;

  const { error: updateErr } = await supabase
    .from("project_members")
    .update({ access_status: "revoked" })
    .in(
      "id",
      revocable.map((m) => m.id)
    );
  if (updateErr) throw updateErr;

  await addArchiveLogRecord(
    supabase,
    projectId,
    performedBy,
    "access_revoked",
    notes ?? `Revocati ${revocable.length} accessi operativi`
  );

  return revocable.length;
}

export async function updateProjectStatusRecord(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  status: ProjectStatus,
  notes?: string
): Promise<Project> {
  const ts = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status,
    updated_at: ts,
  };
  if (status === "archived") updates.archived_at = ts;
  if (status === "locked") updates.locked_at = ts;
  if (status === "active") {
    updates.archived_at = null;
    updates.locked_at = null;
  }

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("project_archive_logs").insert({
    project_id: projectId,
    action: statusToArchiveAction(status),
    performed_by: userId,
    notes: notes ?? null,
  });

  if (status === "archived" || status === "locked") {
    await revokeOperationalProjectAccess(
      supabase,
      projectId,
      userId,
      "Accessi operativi revocati per chiusura progetto"
    );
  }

  return mapProject(data);
}

export async function addArchiveLogRecord(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  action: ArchiveAction,
  notes?: string
): Promise<ProjectArchiveLog> {
  const { data, error } = await supabase
    .from("project_archive_logs")
    .insert({
      project_id: projectId,
      action,
      performed_by: userId,
      notes: notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapArchiveLog(data);
}

export async function ensureProjectEditorAccess(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<void> {
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", projectId)
    .single();
  if (pErr) throw pErr;

  const { data: companyMember } = await supabase
    .from("company_members")
    .select("id")
    .eq("company_id", project.company_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!companyMember) {
    const { error: cmErr } = await supabase.from("company_members").insert({
      company_id: project.company_id,
      user_id: userId,
      role: "company_admin",
      status: "active",
      joined_at: new Date().toISOString(),
    });
    if (cmErr) throw cmErr;
  }

  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!projectMember) {
    const { error: pmErr } = await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: userId,
      role: "project_admin",
      access_status: "active",
    });
    if (pmErr) throw pmErr;
  }
}

export async function insertScenes(
  supabase: SupabaseClient,
  scenes: Omit<Scene, "id" | "created_at" | "updated_at">[]
): Promise<Scene[]> {
  if (scenes.length === 0) return [];
  const rows = scenes.map((s) => sceneToInsertRow(s));
  const { data, error } = await supabase.from("scenes").insert(rows).select();
  if (error) {
    console.error("[FilmOps] insertScenes error:", error);
    throw error;
  }
  return (data ?? []).map(mapScene);
}

export async function insertScene(
  supabase: SupabaseClient,
  scene: Omit<Scene, "id" | "created_at" | "updated_at">
): Promise<Scene> {
  const [created] = await insertScenes(supabase, [scene]);
  return created;
}

export async function updateSceneRecord(
  supabase: SupabaseClient,
  sceneId: string,
  updates: Partial<Scene>
): Promise<Scene> {
  const row = sceneToRow({
    project_id: updates.project_id ?? "",
    ...updates,
  });
  const { project_id: _p, ...patch } = row;
  const { data, error } = await supabase
    .from("scenes")
    .update(patch)
    .eq("id", sceneId)
    .select()
    .single();
  if (error) throw error;
  return mapScene(data);
}

export async function deleteSceneRecord(
  supabase: SupabaseClient,
  sceneId: string
): Promise<void> {
  const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
  if (error) throw error;
}

export async function insertCastCrew(
  supabase: SupabaseClient,
  member: Omit<CastCrew, "id" | "created_at">
): Promise<CastCrew> {
  const { data, error } = await supabase
    .from("cast_crew")
    .insert({
      project_id: member.project_id,
      full_name: member.full_name,
      role: member.role,
      department: member.department,
      phone: member.phone,
      email: member.email,
      call_time: member.call_time,
      permission_level: member.permission_level,
      status: member.status,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCastCrew(data);
}

export async function updateCastCrewRecord(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<CastCrew>
): Promise<CastCrew> {
  const { data, error } = await supabase
    .from("cast_crew")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapCastCrew(data);
}

export async function deleteCastCrewRecord(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("cast_crew").delete().eq("id", id);
  if (error) throw error;
}

export async function insertLocation(
  supabase: SupabaseClient,
  location: Omit<Location, "id" | "created_at">
): Promise<Location> {
  const { data, error } = await supabase
    .from("locations")
    .insert({
      project_id: location.project_id,
      name: location.name,
      address: location.address ?? "",
      maps_link: location.maps_link ?? "",
      parking_notes: location.parking_notes ?? "",
      access_notes: location.access_notes ?? "",
      production_notes: location.production_notes ?? "",
      canonical_name: location.canonical_name ?? location.name,
      sub_location: location.sub_location ?? "",
      location_type: location.location_type ?? "unknown",
      status: location.status ?? "scouting",
      permit_status: location.permit_status ?? null,
      notes: location.notes ?? "",
      source: location.source ?? "manual",
      raw_name: location.raw_name ?? null,
      confidence_score: location.confidence_score ?? null,
      scene_count: location.scene_count ?? null,
      metadata: location.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw error;
  return mapLocation(data);
}

export async function insertSceneLocationLink(
  supabase: SupabaseClient,
  input: {
    project_id: string;
    scene_id: string;
    location_id: string;
    sub_location?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("scene_locations").insert({
    project_id: input.project_id,
    scene_id: input.scene_id,
    location_id: input.location_id,
    sub_location: input.sub_location ?? null,
  });
  if (error && !String(error.message).includes("duplicate")) throw error;
}

export async function updateLocationRecord(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Location>
): Promise<Location> {
  const { data, error } = await supabase
    .from("locations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapLocation(data);
}

export async function deleteLocationRecord(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) throw error;
}

export async function insertShootingDay(
  supabase: SupabaseClient,
  day: Omit<ShootingDay, "id" | "created_at">
): Promise<ShootingDay> {
  const { data, error } = await supabase
    .from("shooting_days")
    .insert({
      project_id: day.project_id,
      day_number: day.day_number,
      date: day.date || null,
      location_id: day.location_id || null,
      selected_scene_ids: day.selected_scene_ids ?? [],
      general_crew_call: day.general_crew_call,
      cast_call: day.cast_call,
      makeup_call: day.makeup_call,
      first_shot: day.first_shot,
      lunch: day.lunch,
      estimated_wrap: day.estimated_wrap,
      parking: day.parking,
      transport_notes: day.transport_notes,
      emergency_contact: day.emergency_contact,
      production_notes: day.production_notes,
    })
    .select()
    .single();
  if (error) throw error;
  return mapShootingDay(data);
}

export async function updateShootingDayRecord(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<ShootingDay>
): Promise<ShootingDay> {
  const { data, error } = await supabase
    .from("shooting_days")
    .update({
      ...updates,
      location_id: updates.location_id || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapShootingDay(data);
}

export async function deleteShootingDayRecord(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("shooting_days").delete().eq("id", id);
  if (error) throw error;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function coerceUuid(value: string | undefined | null): string | null {
  if (!value || !UUID_RE.test(value)) return null;
  return value;
}

export type UpsertCallSheetContext = {
  company_id?: string | null;
  workspace_id?: string | null;
  user_id?: string | null;
};

/** Columns that exist on call_sheets (base schema + document_data jsonb). */
function buildCallSheetRow(sheet: CallSheet) {
  const projectId = coerceUuid(sheet.project_id);
  if (!projectId) {
    throw new Error("Invalid project_id: must be a valid UUID.");
  }

  const shootingDayId = coerceUuid(sheet.shooting_day_id);
  const generatedBy = coerceUuid(sheet.generated_by ?? sheet.created_by);

  if (sheet.shooting_day_id?.trim() && !shootingDayId) {
    throw new Error(
      `Invalid shooting_day_id "${sheet.shooting_day_id}": save the shooting day to the database first (UUID required).`
    );
  }

  if ((sheet.generated_by || sheet.created_by) && !generatedBy) {
    throw new Error("Invalid generated_by: user id must be a valid UUID.");
  }

  return {
    project_id: projectId,
    shooting_day_id: shootingDayId,
    version: sheet.version ?? 1,
    status: sheet.status ?? "draft",
    pdf_url: sheet.pdf_url ?? null,
    generated_by: generatedBy,
    document_data: callSheetToDocumentData(sheet),
    updated_at: new Date().toISOString(),
  };
}

export async function upsertCallSheet(
  supabase: SupabaseClient,
  sheet: CallSheet,
  context?: UpsertCallSheetContext
): Promise<CallSheet> {
  const isNew = !UUID_RE.test(sheet.id);
  const payload = buildCallSheetRow(sheet);

  const debugContext = {
    payload,
    current_project_id: payload.project_id,
    company_id: context?.company_id ?? null,
    workspace_id: context?.workspace_id ?? null,
    shooting_day_id: payload.shooting_day_id,
    scenes_to_shoot: sheet.scenes_to_shoot ?? [],
    user_id: context?.user_id ?? payload.generated_by,
    call_sheet_local_id: sheet.id,
    is_new: isNew,
  };

  if (isNew) {
    const { data, error } = await supabase
      .from("call_sheets")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logSupabaseError("upsertCallSheet — insert", error, debugContext);
      throw error;
    }
    if (!data?.id) {
      const err = new Error("Insert succeeded but no call sheet id returned.");
      logSupabaseError("upsertCallSheet — missing id", err, debugContext);
      throw err;
    }
    return mapCallSheet(data);
  }

  const sheetId = coerceUuid(sheet.id);
  if (!sheetId) {
    const err = new Error("Invalid call sheet id for update: must be a valid UUID.");
    logSupabaseError("upsertCallSheet — invalid update id", err, debugContext);
    throw err;
  }

  const { data, error } = await supabase
    .from("call_sheets")
    .update(payload)
    .eq("id", sheetId)
    .select()
    .single();

  if (error) {
    logSupabaseError("upsertCallSheet — update", error, {
      ...debugContext,
      call_sheet_id: sheetId,
    });
    throw error;
  }
  if (!data?.id) {
    const err = new Error("Update succeeded but no call sheet row returned.");
    logSupabaseError("upsertCallSheet — missing row after update", err, debugContext);
    throw err;
  }
  return mapCallSheet(data);
}

export function formatCallSheetSaveError(err: unknown): string {
  return formatSupabaseError(err);
}

export async function updateCallSheetWorkflow(
  supabase: SupabaseClient,
  sheetId: string,
  updates: {
    status?: CallSheet["status"];
    approved_by?: string | null;
    approved_at?: string | null;
    sent_by?: string | null;
    sent_at?: string | null;
  }
): Promise<CallSheet> {
  const { data, error } = await supabase
    .from("call_sheets")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sheetId)
    .select()
    .single();
  if (error) throw error;
  return mapCallSheet(data);
}

export async function markCallSheetSent(
  supabase: SupabaseClient,
  sheetId: string,
  sentBy: string
): Promise<CallSheet> {
  const ts = new Date().toISOString();
  return updateCallSheetWorkflow(supabase, sheetId, {
    status: "sent",
    sent_by: sentBy,
    sent_at: ts,
  });
}

export async function createCallSheetDistribution(
  supabase: SupabaseClient,
  input: {
    company_id: string;
    workspace_id?: string;
    project_id: string;
    call_sheet_id: string;
    version_number: number;
    sent_by: string;
    notes?: string | null;
    recipients: Array<{
      company_id: string;
      project_id: string;
      user_id: string;
      email?: string | null;
      full_name?: string | null;
      department?: string | null;
      recipient_type: string;
      target_key?: string;
    }>;
  }
): Promise<{ distribution: CallSheetDistribution; recipients: CallSheetRecipient[] }> {
  const ts = new Date().toISOString();

  const distributionPayload = {
    company_id: input.company_id,
    workspace_id: input.workspace_id ?? null,
    project_id: input.project_id,
    call_sheet_id: input.call_sheet_id,
    version_number: input.version_number,
    status: "sent",
    sent_by: input.sent_by,
    sent_at: ts,
    notes: input.notes ?? null,
  };

  const { data: distRow, error: distErr } = await supabase
    .from("call_sheet_distributions")
    .insert(distributionPayload)
    .select()
    .single();

  if (distErr) {
    logSupabaseError("createCallSheetDistribution — distribution insert", distErr, {
      payload: distributionPayload,
    });
    throw distErr;
  }

  const recipPayload = input.recipients.map((r) => ({
    distribution_id: distRow.id,
    company_id: r.company_id,
    project_id: r.project_id,
    user_id: r.user_id,
    email: r.email ?? null,
    full_name: r.full_name ?? null,
    department: r.department ?? null,
    recipient_type: r.recipient_type,
    target_key: r.target_key ?? null,
  }));

  const { data: recipRows, error: recipErr } = await supabase
    .from("call_sheet_recipients")
    .insert(recipPayload)
    .select();

  if (recipErr) {
    logSupabaseError("createCallSheetDistribution — recipients insert", recipErr, {
      distribution_id: distRow.id,
      payload: recipPayload,
    });
    throw recipErr;
  }

  const distribution = mapCallSheetDistribution(distRow);
  const recipients = await enrichRecipientsWithNames(
    supabase,
    (recipRows ?? []).map(mapCallSheetRecipient)
  );

  const [enrichedDist] = await enrichDistributionsWithNames(supabase, [distribution]);

  return { distribution: enrichedDist, recipients };
}

export async function acknowledgeCallSheetRecipient(
  supabase: SupabaseClient,
  recipientId: string,
  userId: string,
  userAgent?: string
): Promise<CallSheetRecipient> {
  const ts = new Date().toISOString();
  const { data, error } = await supabase
    .from("call_sheet_recipients")
    .update({
      acknowledged_at: ts,
      acknowledged_by: userId,
      acknowledged_user_agent: userAgent ?? null,
      updated_at: ts,
    })
    .eq("id", recipientId)
    .eq("user_id", userId)
    .is("acknowledged_at", null)
    .select()
    .single();
  if (error) throw error;
  const [enriched] = await enrichRecipientsWithNames(supabase, [mapCallSheetRecipient(data)]);
  return enriched;
}

export type UpsertProductionReportContext = {
  company_id?: string | null;
  workspace_id?: string | null;
  user_id?: string | null;
};

function buildProductionReportRow(
  report: ProductionReport,
  context?: UpsertProductionReportContext
) {
  const projectId = coerceUuid(report.project_id);
  if (!projectId) throw new Error("Invalid project_id for production report.");

  return {
    company_id: context?.company_id ?? report.company_id,
    workspace_id: context?.workspace_id ?? report.workspace_id ?? null,
    project_id: projectId,
    shooting_day_id: coerceUuid(report.shooting_day_id),
    call_sheet_id: coerceUuid(report.call_sheet_id),
    report_date: report.report_date,
    title: report.title ?? null,
    status: report.status,
    actual_crew_call_time: report.actual_crew_call_time ?? null,
    actual_first_shot_time: report.actual_first_shot_time ?? null,
    actual_wrap_time: report.actual_wrap_time ?? null,
    meal_break_time: report.meal_break_time ?? null,
    total_shooting_hours: report.total_shooting_hours ?? null,
    overtime_notes: report.overtime_notes ?? null,
    weather_notes: report.weather_notes ?? null,
    general_notes: report.general_notes ?? null,
    created_by: context?.user_id ?? report.created_by ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertProductionReport(
  supabase: SupabaseClient,
  report: ProductionReport,
  context?: UpsertProductionReportContext
): Promise<ProductionReport> {
  const isNew = !UUID_RE.test(report.id);
  const payload = buildProductionReportRow(report, context);

  const debugContext = {
    payload,
    report_local_id: report.id,
    is_new: isNew,
    user_id: context?.user_id,
  };

  if (isNew) {
    const { data, error } = await supabase
      .from("production_reports")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logSupabaseError("upsertProductionReport — insert", error, debugContext);
      throw error;
    }
    if (!data?.id) throw new Error("Insert succeeded but no report id returned.");
    const [enriched] = await enrichProductionReportsWithNames(supabase, [
      mapProductionReport(data),
    ]);
    return enriched;
  }

  const reportId = coerceUuid(report.id);
  if (!reportId) throw new Error("Invalid production report id for update.");

  const { data, error } = await supabase
    .from("production_reports")
    .update(payload)
    .eq("id", reportId)
    .select()
    .single();

  if (error) {
    logSupabaseError("upsertProductionReport — update", error, {
      ...debugContext,
      report_id: reportId,
    });
    throw error;
  }
  if (!data?.id) throw new Error("Update succeeded but no report row returned.");
  const [enriched] = await enrichProductionReportsWithNames(supabase, [
    mapProductionReport(data),
  ]);
  return enriched;
}

export async function saveProductionReportScenes(
  supabase: SupabaseClient,
  reportId: string,
  scenes: ProductionReportScene[]
): Promise<ProductionReportScene[]> {
  const { error: delErr } = await supabase
    .from("production_report_scenes")
    .delete()
    .eq("report_id", reportId);
  if (delErr) throw delErr;

  if (scenes.length === 0) return [];

  const payload = scenes.map((s) => ({
    report_id: reportId,
    scene_id: coerceUuid(s.scene_id),
    scene_number: s.scene_number ?? null,
    status: s.status,
    notes: s.notes ?? null,
  }));

  const { data, error } = await supabase
    .from("production_report_scenes")
    .insert(payload)
    .select();

  if (error) throw error;
  return (data ?? []).map(mapProductionReportScene);
}

export async function saveProductionReportIssues(
  supabase: SupabaseClient,
  reportId: string,
  issues: ProductionReportIssue[],
  createdBy?: string | null
): Promise<ProductionReportIssue[]> {
  const { error: delErr } = await supabase
    .from("production_report_issues")
    .delete()
    .eq("report_id", reportId);
  if (delErr) throw delErr;

  if (issues.length === 0) return [];

  const payload = issues.map((i) => ({
    report_id: reportId,
    category: i.category,
    department: i.department ?? null,
    severity: i.severity,
    title: i.title,
    description: i.description ?? null,
    resolved: i.resolved ?? false,
    notes: i.notes ?? null,
    created_by: createdBy ?? i.created_by ?? null,
  }));

  const { data, error } = await supabase
    .from("production_report_issues")
    .insert(payload)
    .select();

  if (error) throw error;
  return (data ?? []).map(mapProductionReportIssue);
}

export async function upsertProductionReportDepartmentNote(
  supabase: SupabaseClient,
  note: Omit<ProductionReportDepartmentNote, "id" | "created_at" | "updated_at"> & {
    id?: string;
  },
  userId: string
): Promise<ProductionReportDepartmentNote> {
  const payload = {
    report_id: note.report_id,
    department: note.department,
    notes: note.notes ?? null,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from("production_report_department_notes")
    .upsert(
      {
        ...payload,
        created_by: userId,
      },
      { onConflict: "report_id,department" }
    )
    .select()
    .single();

  if (error) throw error;
  return mapProductionReportDepartmentNote(data);
}

export async function updateProductionReportWorkflow(
  supabase: SupabaseClient,
  reportId: string,
  action: "submit" | "approve" | "archive",
  userId: string
): Promise<ProductionReport> {
  const ts = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: ts };

  if (action === "submit") {
    updates.status = "submitted";
    updates.submitted_by = userId;
    updates.submitted_at = ts;
  } else if (action === "approve") {
    updates.status = "approved";
    updates.approved_by = userId;
    updates.approved_at = ts;
  } else {
    updates.status = "archived";
  }

  const { data, error } = await supabase
    .from("production_reports")
    .update(updates)
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;
  const [enriched] = await enrichProductionReportsWithNames(supabase, [
    mapProductionReport(data),
  ]);
  return enriched;
}

export function formatProductionReportSaveError(err: unknown): string {
  return formatSupabaseError(err);
}

export async function insertScriptRevision(
  supabase: SupabaseClient,
  input: {
    company_id: string;
    workspace_id?: string | null;
    project_id: string;
    document_id?: string | null;
    revision_name?: string | null;
    revision_date?: string | null;
    script_text?: string | null;
    ai_summary?: Record<string, unknown> | null;
    created_by: string;
  }
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("script_revisions")
    .insert({
      company_id: input.company_id,
      workspace_id: input.workspace_id ?? null,
      project_id: input.project_id,
      document_id: input.document_id ?? null,
      revision_name: input.revision_name ?? null,
      revision_date: input.revision_date ?? null,
      script_text: input.script_text ?? null,
      ai_summary: input.ai_summary ?? null,
      created_by: input.created_by,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function insertScriptBreakdownRun(
  supabase: SupabaseClient,
  input: {
    company_id: string;
    workspace_id?: string | null;
    project_id: string;
    script_revision_id?: string | null;
    status?: string;
    input_type?: string | null;
    ai_result?: Record<string, unknown> | null;
    created_by: string;
  }
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("script_breakdown_runs")
    .insert({
      company_id: input.company_id,
      workspace_id: input.workspace_id ?? null,
      project_id: input.project_id,
      script_revision_id: input.script_revision_id ?? null,
      status: input.status ?? "completed",
      input_type: input.input_type ?? null,
      ai_result: input.ai_result ?? null,
      created_by: input.created_by,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function insertScriptBreakdownChunks(
  supabase: SupabaseClient,
  rows: Array<{
    run_id: string;
    project_id: string;
    chunk_index: number;
    scene_range?: string | null;
    input_text?: string | null;
    status?: string;
  }>
): Promise<Array<{ id: string; chunk_index: number }>> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase
    .from("script_breakdown_chunks")
    .insert(
      rows.map((row) => ({
        run_id: row.run_id,
        project_id: row.project_id,
        chunk_index: row.chunk_index,
        scene_range: row.scene_range ?? null,
        input_text: row.input_text ?? null,
        status: row.status ?? "pending",
      }))
    )
    .select("id, chunk_index");
  if (error) throw error;
  return data ?? [];
}

export async function updateScriptBreakdownChunk(
  supabase: SupabaseClient,
  chunkId: string,
  updates: {
    status?: string;
    ai_result?: Record<string, unknown> | null;
    error_message?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("script_breakdown_chunks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chunkId);
  if (error) throw error;
}

export async function fetchScriptBreakdownChunks(
  supabase: SupabaseClient,
  runId: string
): Promise<
  Array<{
    id: string;
    chunk_index: number;
    scene_range: string | null;
    status: string;
    error_message: string | null;
    ai_result: Record<string, unknown> | null;
    input_text: string | null;
  }>
> {
  const { data, error } = await supabase
    .from("script_breakdown_chunks")
    .select(
      "id, chunk_index, scene_range, status, error_message, ai_result, input_text"
    )
    .eq("run_id", runId)
    .order("chunk_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateScriptBreakdownRun(
  supabase: SupabaseClient,
  runId: string,
  updates: {
    status?: string;
    ai_result?: Record<string, unknown> | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("script_breakdown_runs")
    .update(updates)
    .eq("id", runId);
  if (error) throw error;
}

export async function insertScriptBreakdownQualityCheck(
  supabase: SupabaseClient,
  input: {
    run_id: string;
    project_id: string;
    quality_status: string;
    issues: Record<string, unknown>[];
  }
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("script_breakdown_quality_checks")
    .insert({
      run_id: input.run_id,
      project_id: input.project_id,
      quality_status: input.quality_status,
      issues: input.issues,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function fetchProjectDocumentById(
  supabase: SupabaseClient,
  documentId: string
): Promise<{
  id: string;
  project_id: string;
  file_path: string;
  original_file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
} | null> {
  const { data, error } = await supabase
    .from("project_documents")
    .select(
      "id, project_id, file_path, original_file_name, mime_type, size_bytes"
    )
    .eq("id", documentId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProjectBreakdownEntities(
  supabase: SupabaseClient,
  projectId: string
): Promise<{
  scenes: Scene[];
  castCrew: CastCrew[];
  locations: Location[];
}> {
  const [scenesRes, castRes, locRes] = await Promise.all([
    supabase.from("scenes").select("*").eq("project_id", projectId),
    supabase.from("cast_crew").select("*").eq("project_id", projectId),
    supabase.from("locations").select("*").eq("project_id", projectId),
  ]);
  if (scenesRes.error) throw scenesRes.error;
  if (castRes.error) throw castRes.error;
  if (locRes.error) throw locRes.error;
  return {
    scenes: (scenesRes.data ?? []).map(mapScene),
    castCrew: (castRes.data ?? []).map(mapCastCrew),
    locations: (locRes.data ?? []).map(mapLocation),
  };
}
