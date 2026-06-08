import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { REVOKABLE_PROJECT_ROLES } from "@/lib/access-control";
import type {
  ArchiveAction,
  CallSheet,
  CastCrew,
  Company,
  CompanyMember,
  Location,
  Project,
  ProjectArchiveLog,
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
  mapCallSheet,
  mapCastCrew,
  mapCompany,
  mapCompanyMember,
  mapLocation,
  mapProfile,
  mapProject,
  mapProjectMember,
  mapScene,
  mapShootingDay,
  mapWorkspace,
  sceneToInsertRow,
  sceneToRow,
} from "./mappers";

const PROFILE_COLUMNS =
  "id, email, full_name, avatar_url, global_role, auth_status, created_at";

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
    .order("created_at", { ascending: false });
  if (pErr) throw pErr;

  const projectList = (projects ?? []).map(mapProject);
  if (projectList.length === 0) return { projects: [], members: [] };

  const { data: members, error: mErr } = await supabase
    .from("project_members")
    .select("*")
    .in(
      "project_id",
      projectList.map((p) => p.id)
    );
  if (mErr) throw mErr;

  return {
    projects: projectList,
    members: (members ?? []).map(mapProjectMember),
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
    .order("created_at", { ascending: false });
  if (pErr) throw pErr;

  const projectList = (projects ?? []).map(mapProject);
  if (projectList.length === 0) return { projects: [], members: [] };

  const { data: members, error: mErr } = await supabase
    .from("project_members")
    .select("*")
    .in(
      "project_id",
      projectList.map((p) => p.id)
    );
  if (mErr) throw mErr;

  return {
    projects: projectList,
    members: (members ?? []).map(mapProjectMember),
  };
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
}> {
  const [scenesRes, castRes, locRes, daysRes, sheetsRes, logsRes] =
    await Promise.all([
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
    ]);

  for (const res of [scenesRes, castRes, locRes, daysRes, sheetsRes, logsRes]) {
    if (res.error) throw res.error;
  }

  return {
    scenes: (scenesRes.data ?? []).map(mapScene),
    castCrew: (castRes.data ?? []).map(mapCastCrew),
    locations: (locRes.data ?? []).map(mapLocation),
    shootingDays: (daysRes.data ?? []).map(mapShootingDay),
    callSheets: (sheetsRes.data ?? []).map(mapCallSheet),
    archiveLogs: (logsRes.data ?? []).map(mapArchiveLog),
  };
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
      address: location.address,
      maps_link: location.maps_link,
      parking_notes: location.parking_notes,
      access_notes: location.access_notes,
      production_notes: location.production_notes,
    })
    .select()
    .single();
  if (error) throw error;
  return mapLocation(data);
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

export async function upsertCallSheet(
  supabase: SupabaseClient,
  sheet: CallSheet
): Promise<CallSheet> {
  const isNew = !UUID_RE.test(sheet.id);
  const payload = {
    project_id: sheet.project_id,
    shooting_day_id: sheet.shooting_day_id || null,
    version: sheet.version,
    status: sheet.status,
    pdf_url: sheet.pdf_url ?? null,
    generated_by: sheet.generated_by || null,
    document_data: callSheetToDocumentData(sheet),
    updated_at: new Date().toISOString(),
  };

  if (isNew || sheet.id.length < 30) {
    const { data, error } = await supabase
      .from("call_sheets")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return mapCallSheet(data);
  }

  const { data, error } = await supabase
    .from("call_sheets")
    .update(payload)
    .eq("id", sheet.id)
    .select()
    .single();
  if (error) throw error;
  return mapCallSheet(data);
}
