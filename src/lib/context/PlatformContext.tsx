"use client";

import {
  getAuthDenialReason,
  isCompanyMembershipActive,
  isPlatformOwnerUser,
  isProjectMembershipActive,
} from "@/lib/access-control";
import { createDemoProjectData } from "@/lib/mock-data";
import {
  canArchiveProject,
  canCreateProject,
  canCreateWorkspace,
  canEditProject,
  canManageCompany,
  canManagePlatform,
  canReactivateProject,
  canViewProject,
} from "@/lib/permissions";
import type {
  ArchiveAction,
  CallSheet,
  CastCrew,
  Company,
  CompanyMember,
  CompanyRole,
  Location,
  Project,
  ProjectArchiveLog,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
  Scene,
  SetAssistantRole,
  ShootingDay,
  User,
  Workspace,
} from "@/lib/types";
import { getClientOrNull } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as db from "@/lib/supabase/data";
import {
  clearStoredSession,
  getStoredCompanyId,
  getStoredProjectId,
  getStoredWorkspaceId,
  setStoredCompanyId,
  setStoredProjectId,
  setStoredWorkspaceId,
} from "@/lib/supabase/storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// --- Company Context ---
interface CompanyContextValue {
  activeCompany: Company | null;
  activeWorkspace: Workspace | null;
  companyRole: CompanyRole | null;
  userCompanies: Company[];
  companyWorkspaces: Workspace[];
  setActiveCompany: (companyId: string) => void;
  setActiveWorkspace: (workspaceId: string) => void;
  createCompany: (data: {
    name: string;
    type: string;
    status?: Company["status"];
  }) => Promise<Company | null>;
  createWorkspace: (data: { name: string; description?: string }) => Promise<Workspace | null>;
  runPlatformSetup: (data: {
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
  }) => Promise<{ project: Project | null; error?: string }>;
  needsPlatformSetup: boolean;
  canManageCompany: boolean;
  canCreateWorkspace: boolean;
  canCreateProject: boolean;
  canManagePlatform: boolean;
  isLoading: boolean;
  activeCompanyMembership: CompanyMember | null;
}

// --- Project Context ---
interface ProjectContextValue {
  activeProject: Project | null;
  projectRole: ProjectRole | null;
  accessibleProjects: Project[];
  accessibleProjectsAll: Project[];
  setActiveProject: (projectId: string) => void;
  createProject: (data: {
    title: string;
    production_type: string;
    description?: string;
    status: ProjectStatus;
    start_date?: string;
    end_date?: string;
    workspace_id: string;
  }) => Promise<Project | null>;
  updateProjectStatus: (status: ProjectStatus, notes?: string) => Promise<void>;
  reactivateProject: () => Promise<void>;
  archiveProject: (action: ArchiveAction, notes?: string) => Promise<void>;
  addScene: (scene: Omit<Scene, "id" | "created_at" | "updated_at">) => Promise<Scene | null>;
  deleteScene: (sceneId: string) => Promise<void>;
  addCastCrewMember: (
    member: Omit<CastCrew, "id" | "created_at" | "project_id">
  ) => Promise<CastCrew | null>;
  addLocation: (
    location: Omit<Location, "id" | "created_at" | "project_id">
  ) => Promise<Location | null>;
  addShootingDay: (
    day: Omit<ShootingDay, "id" | "created_at" | "project_id">
  ) => Promise<ShootingDay | null>;
  saveCallSheet: (sheet: CallSheet) => Promise<CallSheet | null>;
  saveBreakdownToProject: () => Promise<number>;
  canEditProject: boolean;
  canReactivateProject: boolean;
  canViewProject: boolean;
  canArchiveProject: boolean;
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  updateScene: (id: string, updates: Partial<Scene>) => Promise<void>;
  castCrew: CastCrew[];
  setCastCrew: React.Dispatch<React.SetStateAction<CastCrew[]>>;
  locations: Location[];
  shootingDays: ShootingDay[];
  setShootingDays: React.Dispatch<React.SetStateAction<ShootingDay[]>>;
  callSheets: CallSheet[];
  setCallSheets: React.Dispatch<React.SetStateAction<CallSheet[]>>;
  activeCallSheet: CallSheet | null;
  setActiveCallSheet: React.Dispatch<React.SetStateAction<CallSheet | null>>;
  breakdownScenes: Scene[];
  setBreakdownScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  updateBreakdownScene: (id: string, updates: Partial<Scene>) => void;
  archiveLogs: ProjectArchiveLog[];
  assistantRole: SetAssistantRole;
  setAssistantRole: (role: SetAssistantRole) => void;
  isLoadingProjectData: boolean;
  refreshProjectData: () => Promise<void>;
  activeProjectMembership: ProjectMember | null;
}

export interface AccessDebugInfo {
  authUserId: string | null;
  email: string | null;
  profileFound: boolean;
  global_role: string | null;
  auth_status: string | null;
  companiesCount: number;
  companyMembersCount: number;
  lastError: string | null;
  isPlatformOwner: boolean;
}

// --- Auth ---
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  authReady: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{
    error?: string;
    needsAccessAssignment?: boolean;
    isPlatformOwner?: boolean;
    needsPlatformSetup?: boolean;
  }>;
  logout: () => Promise<void>;
  isPlatformOwner: boolean;
  accessDebug: AccessDebugInfo;
}

type PlatformContextValue = AuthContextValue & {
  company: CompanyContextValue;
  project: ProjectContextValue;
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

function filterByProject<T extends { project_id: string }>(
  items: T[],
  projectId: string | null
): T[] {
  if (!projectId) return [];
  return items.filter((i) => i.project_id === projectId);
}

async function resolveSessionProfile(
  supabase: SupabaseClient,
  authUser: {
    id: string;
    email?: string;
    created_at?: string;
    user_metadata?: Record<string, unknown>;
  },
  signInSession?: import("@supabase/supabase-js").Session | null
): Promise<
  | { ok: true; profile: User; profileFound: boolean }
  | { ok: false; error: string; profileFound: boolean }
> {
  const sessionResult = await db.waitForAuthSession(supabase, signInSession);
  if ("error" in sessionResult) {
    return {
      ok: false,
      error: `Sessione non pronta: ${sessionResult.error}`,
      profileFound: false,
    };
  }

  const userId = sessionResult.userId;
  let { data: profile, error } = await db.fetchProfile(supabase, userId);
  if (error) {
    return { ok: false, error, profileFound: false };
  }

  if (!profile) {
    try {
      const headers: Record<string, string> = {};
      if (signInSession?.access_token) {
        headers.Authorization = `Bearer ${signInSession.access_token}`;
      }
      const res = await fetch("/api/auth/sync-profile", {
        method: "POST",
        credentials: "include",
        headers,
      });
      const body = (await res.json().catch(() => ({}))) as {
        profile?: User;
        error?: string;
        authId?: string;
      };
      if (res.ok && body.profile) {
        profile = body.profile;
      } else {
        return {
          ok: false,
          error:
            body.error ??
            `Profilo non trovato in public.profiles (auth id: ${body.authId ?? userId})`,
          profileFound: false,
        };
      }
    } catch {
      return {
        ok: false,
        error: `Profilo non trovato in public.profiles (auth id: ${userId})`,
        profileFound: false,
      };
    }
  }

  if (!profile) {
    return {
      ok: false,
      error: `Profilo non trovato in public.profiles (auth id: ${userId})`,
      profileFound: false,
    };
  }

  return { ok: true, profile, profileFound: true };
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    setSupabase(getClientOrNull());
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [projectDataLoading, setProjectDataLoading] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const [scenes, setScenesState] = useState<Scene[]>([]);
  const [castCrew, setCastCrewState] = useState<CastCrew[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [shootingDays, setShootingDaysState] = useState<ShootingDay[]>([]);
  const [callSheets, setCallSheetsState] = useState<CallSheet[]>([]);
  const [archiveLogs, setArchiveLogs] = useState<ProjectArchiveLog[]>([]);

  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [breakdownByProject, setBreakdownByProject] = useState<
    Record<string, Scene[]>
  >({});
  const [assistantRole, setAssistantRole] =
    useState<SetAssistantRole>("producer");
  const [activeCallSheetId, setActiveCallSheetId] = useState<string | null>(null);
  const [accessDebug, setAccessDebug] = useState<AccessDebugInfo>({
    authUserId: null,
    email: null,
    profileFound: false,
    global_role: null,
    auth_status: null,
    companiesCount: 0,
    companyMembersCount: 0,
    lastError: null,
    isPlatformOwner: false,
  });

  const currentUserId = user?.id ?? null;

  const updateAccessDebug = useCallback(
    (patch: Partial<AccessDebugInfo>) => {
      setAccessDebug((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const loadCompanyData = useCallback(
    async (
      userId: string,
      profile: User
    ): Promise<{ companies: Company[]; needsPlatformSetup: boolean }> => {
      if (!supabase) return { companies: [], needsPlatformSetup: false };
      setCompanyLoading(true);
      let result: Company[] = [];
      let needsSetup = false;
      const owner = isPlatformOwnerUser(profile);

      updateAccessDebug({
        authUserId: userId,
        email: profile.email,
        profileFound: true,
        global_role: profile.global_role,
        auth_status: profile.auth_status,
        isPlatformOwner: owner,
        lastError: null,
      });

      try {
        if (owner) {
          const boot = await db.fetchPlatformOwnerBootstrap(supabase, userId);
          result = boot.companies;
          setCompanies(boot.companies);
          setCompanyMembers(boot.memberships);
          setWorkspaces(boot.workspaces);
          setProjects(boot.projects);
          setProjectMembers(boot.projectMembers);

          updateAccessDebug({
            companiesCount: boot.companies.length,
            companyMembersCount: boot.memberships.length,
          });

          const storedCompany = getStoredCompanyId();
          const validCompany =
            storedCompany &&
            boot.companies.some((c) => c.id === storedCompany)
              ? storedCompany
              : boot.companies[0]?.id ?? null;

          setActiveCompanyId(validCompany);
          setStoredCompanyId(validCompany);

          if (validCompany) {
            const companyWs = boot.workspaces.filter(
              (w) => w.company_id === validCompany
            );
            const storedWs = getStoredWorkspaceId();
            const validWs =
              storedWs && companyWs.some((w) => w.id === storedWs)
                ? storedWs
                : companyWs[0]?.id ?? null;
            setActiveWorkspaceId(validWs);
            setStoredWorkspaceId(validWs);

            const companyProjs = boot.projects.filter(
              (p) => p.company_id === validCompany
            );
            const storedProj = getStoredProjectId();
            const validProj =
              storedProj && companyProjs.some((p) => p.id === storedProj)
                ? storedProj
                : null;
            setActiveProjectId(validProj);
            setStoredProjectId(validProj);

            if (owner) {
              needsSetup =
                boot.companies.length === 0 ||
                companyWs.length === 0 ||
                companyProjs.length === 0;
            }
          } else {
            setActiveWorkspaceId(null);
            setActiveProjectId(null);
            setStoredWorkspaceId(null);
            setStoredProjectId(null);
            if (owner) needsSetup = boot.companies.length === 0;
          }
        } else {
          const { companies: comps, memberships } = await db.fetchUserCompanies(
            supabase,
            userId
          );
          result = comps;
          setCompanies(comps);
          setCompanyMembers(memberships);

          updateAccessDebug({
            companiesCount: comps.length,
            companyMembersCount: memberships.length,
          });

          const storedCompany = getStoredCompanyId();
          const validCompany =
            storedCompany && comps.some((c) => c.id === storedCompany)
              ? storedCompany
              : comps[0]?.id ?? null;

          setActiveCompanyId(validCompany);
          setStoredCompanyId(validCompany);

          if (validCompany) {
            const ws = await db.fetchWorkspaces(supabase, validCompany);
            setWorkspaces(ws);
            const storedWs = getStoredWorkspaceId();
            const validWs =
              storedWs && ws.some((w) => w.id === storedWs)
                ? storedWs
                : ws[0]?.id ?? null;
            setActiveWorkspaceId(validWs);
            setStoredWorkspaceId(validWs);

            const { projects: projs, members } = await db.fetchProjects(
              supabase,
              validCompany
            );
            setProjects(projs);
            setProjectMembers(members);

            const storedProj = getStoredProjectId();
            const membership = memberships.find(
              (m) => m.company_id === validCompany
            );
            const isAdmin = membership?.role === "company_admin";
            const allowedIds = isAdmin
              ? new Set(projs.map((p) => p.id))
              : new Set(
                  members
                    .filter(
                      (m) =>
                        m.user_id === userId && m.access_status === "active"
                    )
                    .map((m) => m.project_id)
                );
            const validProj =
              storedProj && allowedIds.has(storedProj) ? storedProj : null;
            setActiveProjectId(validProj);
            setStoredProjectId(validProj);
          } else {
            setWorkspaces([]);
            setProjects([]);
            setProjectMembers([]);
            setActiveWorkspaceId(null);
            setActiveProjectId(null);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Errore caricamento accessi";
        console.error("[FilmOps] loadCompanyData error:", err);
        updateAccessDebug({ lastError: message });
        if (owner) {
          result = [];
          needsSetup = true;
        }
      } finally {
        setCompanyLoading(false);
      }
      return { companies: result, needsPlatformSetup: needsSetup };
    },
    [supabase, updateAccessDebug]
  );

  const loadProjectData = useCallback(
    async (projectId: string) => {
      if (!supabase) return;
      setProjectDataLoading(true);
      try {
        const data = await db.fetchProjectData(supabase, projectId);
        setScenesState((prev) => [
          ...prev.filter((s) => s.project_id !== projectId),
          ...data.scenes,
        ]);
        setCastCrewState((prev) => [
          ...prev.filter((c) => c.project_id !== projectId),
          ...data.castCrew,
        ]);
        setLocations((prev) => [
          ...prev.filter((l) => l.project_id !== projectId),
          ...data.locations,
        ]);
        setShootingDaysState((prev) => [
          ...prev.filter((d) => d.project_id !== projectId),
          ...data.shootingDays,
        ]);
        setCallSheetsState((prev) => [
          ...prev.filter((c) => c.project_id !== projectId),
          ...data.callSheets,
        ]);
        setArchiveLogs((prev) => [
          ...prev.filter((l) => l.project_id !== projectId),
          ...data.archiveLogs,
        ]);
        if (data.callSheets[0]) {
          setActiveCallSheetId(data.callSheets[0].id);
        }
      } finally {
        setProjectDataLoading(false);
      }
    },
    [supabase]
  );

  const initAuth = useCallback(async () => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const resolved = await resolveSessionProfile(supabase, session.user);
        if (resolved.ok && !getAuthDenialReason(resolved.profile)) {
          setUser(resolved.profile);
          await loadCompanyData(session.user.id, resolved.profile);
        } else if (!resolved.ok) {
          updateAccessDebug({
            authUserId: session.user.id,
            email: session.user.email ?? null,
            profileFound: resolved.profileFound,
            lastError: resolved.error,
          });
        }
      }
    } finally {
      setAuthReady(true);
    }
  }, [supabase, loadCompanyData, updateAccessDebug]);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setCompanies([]);
        setCompanyMembers([]);
        setWorkspaces([]);
        setProjects([]);
        setProjectMembers([]);
        setScenesState([]);
        setCastCrewState([]);
        setLocations([]);
        setShootingDaysState([]);
        setCallSheetsState([]);
        setArchiveLogs([]);
        setActiveCompanyId(null);
        setActiveWorkspaceId(null);
        setActiveProjectId(null);
        clearStoredSession();
        return;
      }
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        const resolved = await resolveSessionProfile(supabase, session.user);
        if (resolved.ok && !getAuthDenialReason(resolved.profile)) {
          setUser(resolved.profile);
          if (event === "SIGNED_IN") {
            await loadCompanyData(session.user.id, resolved.profile);
          }
        } else if (!resolved.ok) {
          updateAccessDebug({
            authUserId: session.user.id,
            email: session.user.email ?? null,
            profileFound: resolved.profileFound,
            lastError: resolved.error,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, initAuth, loadCompanyData, updateAccessDebug]);

  useEffect(() => {
    if (activeProjectId) {
      loadProjectData(activeProjectId);
    }
  }, [activeProjectId, loadProjectData]);

  const isPlatformOwner = useMemo(() => isPlatformOwnerUser(user), [user]);

  const userCompanyMemberships = useMemo(() => {
    if (!currentUserId) return [];
    return companyMembers.filter(
      (m) => m.user_id === currentUserId && isCompanyMembershipActive(m)
    );
  }, [companyMembers, currentUserId]);

  const userCompanies = useMemo(() => {
    if (isPlatformOwner) {
      return companies.filter((c) => c.status === "active");
    }
    const ids = new Set(userCompanyMemberships.map((m) => m.company_id));
    return companies.filter((c) => ids.has(c.id) && c.status === "active");
  }, [userCompanyMemberships, companies, isPlatformOwner]);

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) ?? null,
    [companies, activeCompanyId]
  );

  const activeCompanyMembership = useMemo(() => {
    if (!currentUserId || !activeCompanyId) return null;
    return (
      companyMembers.find(
        (cm) => cm.user_id === currentUserId && cm.company_id === activeCompanyId
      ) ?? null
    );
  }, [companyMembers, currentUserId, activeCompanyId]);

  const companyRole = useMemo((): CompanyRole | null => {
    if (!activeCompanyId) return null;
    if (isPlatformOwner) return "platform_owner";
    if (!currentUserId) return null;
    return activeCompanyMembership?.role ?? null;
  }, [activeCompanyMembership, currentUserId, activeCompanyId, isPlatformOwner]);

  const companyWorkspaces = useMemo(() => {
    if (!activeCompanyId) return [];
    return workspaces.filter(
      (w) => w.company_id === activeCompanyId && w.status === "active"
    );
  }, [workspaces, activeCompanyId]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const userProjectMemberships = useMemo(() => {
    if (!currentUserId) return [];
    return projectMembers.filter(
      (m) => m.user_id === currentUserId && isProjectMembershipActive(m)
    );
  }, [projectMembers, currentUserId]);

  const activeProjectMembership = useMemo(() => {
    if (!currentUserId || !activeProjectId) return null;
    return (
      projectMembers.find(
        (pm) => pm.user_id === currentUserId && pm.project_id === activeProjectId
      ) ?? null
    );
  }, [projectMembers, currentUserId, activeProjectId]);

  const accessibleProjectsAll = useMemo(() => {
    if (!activeCompanyId) return [];
    const isAdmin =
      isPlatformOwner ||
      companyRole === "platform_owner" ||
      companyRole === "company_admin";
    const companyProjects = projects.filter(
      (p) => p.company_id === activeCompanyId
    );
    if (isAdmin) return companyProjects;
    const ids = new Set(userProjectMemberships.map((m) => m.project_id));
    return companyProjects.filter((p) => ids.has(p.id));
  }, [
    projects,
    activeCompanyId,
    companyRole,
    userProjectMemberships,
    isPlatformOwner,
  ]);

  const accessibleProjects = useMemo(() => {
    if (!activeWorkspaceId) return accessibleProjectsAll;
    return accessibleProjectsAll.filter(
      (p) => p.workspace_id === activeWorkspaceId
    );
  }, [accessibleProjectsAll, activeWorkspaceId]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const needsPlatformSetup = useMemo(() => {
    if (!isPlatformOwner || companyLoading) return false;
    if (companies.length === 0) return true;
    if (!activeCompanyId) return true;
    if (companyWorkspaces.length === 0) return true;
    const companyProjects = projects.filter((p) => p.company_id === activeCompanyId);
    return companyProjects.length === 0;
  }, [
    isPlatformOwner,
    companyLoading,
    companies.length,
    activeCompanyId,
    companyWorkspaces.length,
    projects,
  ]);

  const projectRole = useMemo((): ProjectRole | null => {
    if (!activeProjectId) return null;
    if (isPlatformOwner || companyRole === "platform_owner" || companyRole === "company_admin") {
      return "project_admin";
    }
    if (!currentUserId) return null;
    return activeProjectMembership?.role ?? null;
  }, [
    activeProjectMembership,
    currentUserId,
    activeProjectId,
    companyRole,
    isPlatformOwner,
  ]);

  const projectScenes = useMemo(
    () => filterByProject(scenes, activeProjectId),
    [scenes, activeProjectId]
  );

  const projectCastCrew = useMemo(
    () => filterByProject(castCrew, activeProjectId),
    [castCrew, activeProjectId]
  );

  const projectLocations = useMemo(
    () => filterByProject(locations, activeProjectId),
    [locations, activeProjectId]
  );

  const projectShootingDays = useMemo(
    () => filterByProject(shootingDays, activeProjectId),
    [shootingDays, activeProjectId]
  );

  const projectCallSheets = useMemo(
    () => filterByProject(callSheets, activeProjectId),
    [callSheets, activeProjectId]
  );

  const projectArchiveLogs = useMemo(
    () => filterByProject(archiveLogs, activeProjectId),
    [archiveLogs, activeProjectId]
  );

  const breakdownScenes = useMemo(
    () => (activeProjectId ? breakdownByProject[activeProjectId] ?? [] : []),
    [breakdownByProject, activeProjectId]
  );

  const activeCallSheet = useMemo(() => {
    if (!activeProjectId) return null;
    if (activeCallSheetId) {
      return (
        projectCallSheets.find((cs) => cs.id === activeCallSheetId) ?? null
      );
    }
    return projectCallSheets[0] ?? null;
  }, [projectCallSheets, activeCallSheetId, activeProjectId]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: "Supabase non configurato" };
      setAuthLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error: error.message };
        if (data.user) {
          const resolved = await resolveSessionProfile(
            supabase,
            data.user,
            data.session
          );
          if (!resolved.ok) {
            await supabase.auth.signOut();
            return {
              error: `Accesso non configurato: ${resolved.error}`,
            };
          }
          const profile = resolved.profile;
          const denial = getAuthDenialReason(profile);
          if (denial) {
            await supabase.auth.signOut();
            return { error: "Account non abilitato. Contatta Systemlix." };
          }
          setUser(profile);
          const boot = await loadCompanyData(data.user.id, profile);
          const owner = isPlatformOwnerUser(profile);
          return {
            needsAccessAssignment: !owner && boot.companies.length === 0,
            isPlatformOwner: owner,
            needsPlatformSetup: boot.needsPlatformSetup,
          };
        }
        return {};
      } finally {
        setAuthLoading(false);
      }
    },
    [supabase, loadCompanyData]
  );

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    clearStoredSession();
    setActiveCompanyId(null);
    setActiveWorkspaceId(null);
    setActiveProjectId(null);
  }, [supabase]);

  const setActiveCompany = useCallback(
    async (companyId: string) => {
      if (!supabase) return;
      const allowed = userCompanies.some((c) => c.id === companyId);
      if (!allowed || !currentUserId) return;
      setActiveCompanyId(companyId);
      setStoredCompanyId(companyId);
      setActiveProjectId(null);
      setStoredProjectId(null);

      const ws = await db.fetchWorkspaces(supabase, companyId);
      const { projects: projs, members } = await db.fetchProjects(
        supabase,
        companyId
      );

      if (isPlatformOwner) {
        setWorkspaces((prev) => {
          const other = prev.filter((w) => w.company_id !== companyId);
          return [...other, ...ws];
        });
        setProjects((prev) => {
          const other = prev.filter((p) => p.company_id !== companyId);
          return [...other, ...projs];
        });
        setProjectMembers((prev) => {
          const projIds = new Set(projs.map((p) => p.id));
          const other = prev.filter((m) => !projIds.has(m.project_id));
          return [...other, ...members];
        });
      } else {
        setWorkspaces(ws);
        setProjects(projs);
        setProjectMembers(members);
      }

      const firstWs = ws[0]?.id ?? null;
      setActiveWorkspaceId(firstWs);
      setStoredWorkspaceId(firstWs);
    },
    [userCompanies, currentUserId, supabase, isPlatformOwner]
  );

  const setActiveWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setStoredWorkspaceId(workspaceId);
    setActiveProjectId(null);
    setStoredProjectId(null);
  }, []);

  const setActiveProject = useCallback(
    (projectId: string) => {
      const allowed = accessibleProjectsAll.some((p) => p.id === projectId);
      if (!allowed) return;
      setActiveProjectId(projectId);
      setStoredProjectId(projectId);
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        setActiveWorkspaceId(proj.workspace_id);
        setStoredWorkspaceId(proj.workspace_id);
      }
    },
    [accessibleProjectsAll, projects]
  );

  const createCompany = useCallback(
    async (data: { name: string; type: string; status?: Company["status"] }) => {
      if (!supabase || !currentUserId || !isPlatformOwnerUser(user)) return null;
      try {
        const { company, membership } = await db.createCompanyRecord(
          supabase,
          currentUserId,
          data
        );
        setCompanies((prev) => [...prev, company]);
        setCompanyMembers((prev) => [...prev, membership]);
        setActiveCompanyId(company.id);
        setStoredCompanyId(company.id);
        return company;
      } catch {
        return null;
      }
    },
    [currentUserId, user, supabase]
  );

  const runPlatformSetup = useCallback(
    async (data: {
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
    }) => {
      if (!supabase || !currentUserId || !isPlatformOwnerUser(user)) {
        return { project: null, error: "Permessi insufficienti" };
      }
      try {
        const result = await db.createPlatformSetup(supabase, currentUserId, data);
        setCompanies((prev) => {
          if (prev.some((c) => c.id === result.company.id)) return prev;
          return [...prev, result.company];
        });
        setCompanyMembers((prev) => {
          if (prev.some((m) => m.id === result.companyMember.id)) return prev;
          return [...prev, result.companyMember];
        });
        setWorkspaces((prev) => {
          if (prev.some((w) => w.id === result.workspace.id)) return prev;
          return [...prev, result.workspace];
        });
        setProjects((prev) => [...prev, result.project]);
        setProjectMembers((prev) => [...prev, result.projectMember]);
        setActiveCompanyId(result.company.id);
        setStoredCompanyId(result.company.id);
        setActiveWorkspaceId(result.workspace.id);
        setStoredWorkspaceId(result.workspace.id);
        setActiveProjectId(result.project.id);
        setStoredProjectId(result.project.id);
        return { project: result.project };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Errore durante la configurazione";
        return { project: null, error: message };
      }
    },
    [currentUserId, user, supabase]
  );

  const createWorkspace = useCallback(
    async (data: { name: string; description?: string }) => {
      if (
        !supabase ||
        !activeCompanyId ||
        !canCreateWorkspace(user, companyRole ?? "viewer")
      )
        return null;
      try {
        const ws = await db.createWorkspaceRecord(supabase, activeCompanyId, data);
        setWorkspaces((prev) => [...prev, ws]);
        setActiveWorkspaceId(ws.id);
        setStoredWorkspaceId(ws.id);
        return ws;
      } catch {
        return null;
      }
    },
    [activeCompanyId, companyRole, supabase]
  );

  const createProject = useCallback(
    async (data: {
      title: string;
      production_type: string;
      description?: string;
      status: ProjectStatus;
      start_date?: string;
      end_date?: string;
      workspace_id: string;
    }) => {
      if (!supabase || !activeCompanyId || !currentUserId) return null;
      if (!canCreateProject(user, companyRole ?? "viewer")) return null;
      try {
        const project = await db.createProjectRecord(supabase, currentUserId, {
          company_id: activeCompanyId,
          workspace_id: data.workspace_id,
          title: data.title,
          production_type: data.production_type,
          description: data.description,
          status: data.status,
          start_date: data.start_date,
          end_date: data.end_date,
        });
        setProjects((prev) => [...prev, project]);
        setProjectMembers((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            project_id: project.id,
            user_id: currentUserId,
            role: "project_admin",
            access_status: "active",
            created_at: new Date().toISOString(),
          },
        ]);
        setActiveProjectId(project.id);
        setStoredProjectId(project.id);
        return project;
      } catch {
        return null;
      }
    },
    [activeCompanyId, currentUserId, companyRole, supabase]
  );

  const updateProjectInState = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, ...updates, updated_at: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const updateProjectStatus = useCallback(
    async (status: ProjectStatus, notes?: string) => {
      if (!supabase || !activeProjectId || !activeProject || !currentUserId) return;
      try {
        const updated = await db.updateProjectStatusRecord(
          supabase,
          activeProjectId,
          currentUserId,
          status,
          notes
        );
        updateProjectInState(activeProjectId, updated);
        const refreshed = await db.fetchProjectData(supabase, activeProjectId);
        setArchiveLogs((prev) => [
          ...prev.filter((l) => l.project_id !== activeProjectId),
          ...refreshed.archiveLogs,
        ]);
        const { members: projMembers } = await db.fetchProjects(
          supabase,
          activeProject.company_id
        );
        setProjectMembers((prev) => {
          const other = prev.filter((m) => m.project_id !== activeProjectId);
          const current = projMembers.filter((m) => m.project_id === activeProjectId);
          return [...other, ...current];
        });
      } catch {
        /* UI toast handled by page */
      }
    },
    [activeProjectId, activeProject, currentUserId, supabase, updateProjectInState]
  );

  const archiveProject = useCallback(
    async (action: ArchiveAction, notes?: string) => {
      if (!supabase || !activeProjectId || !currentUserId) return;
      const statusMap: Partial<Record<ArchiveAction, ProjectStatus>> = {
        project_archived: "archived",
        project_locked: "locked",
        project_reactivated: "active",
      };
      const status = statusMap[action];
      if (status) {
        await updateProjectStatus(status, notes);
        return;
      }
      try {
        const log = await db.addArchiveLogRecord(
          supabase,
          activeProjectId,
          currentUserId,
          action,
          notes
        );
        setArchiveLogs((prev) => [...prev, log]);
      } catch {
        /* ignore */
      }
    },
    [activeProjectId, currentUserId, updateProjectStatus, supabase]
  );

  const reactivateProject = useCallback(async () => {
    if (!activeProjectId) return;
    await updateProjectStatus("active", "Progetto riattivato");
  }, [activeProjectId, updateProjectStatus]);

  const addScene = useCallback(
    async (data: Omit<Scene, "id" | "created_at" | "updated_at">) => {
      if (!supabase || !activeProjectId) return null;
      try {
        const scene = await db.insertScene(supabase, {
          ...data,
          project_id: activeProjectId,
        });
        setScenesState((prev) => [...prev, scene]);
        return scene;
      } catch {
        return null;
      }
    },
    [activeProjectId, supabase]
  );

  const deleteScene = useCallback(
    async (sceneId: string) => {
      if (!supabase || !activeProjectId) return;
      try {
        await db.deleteSceneRecord(supabase, sceneId);
        setScenesState((prev) => prev.filter((s) => s.id !== sceneId));
      } catch {
        /* ignore */
      }
    },
    [activeProjectId, supabase]
  );

  const addCastCrewMember = useCallback(
    async (data: Omit<CastCrew, "id" | "created_at" | "project_id">) => {
      if (!supabase || !activeProjectId) return null;
      try {
        const member = await db.insertCastCrew(supabase, {
          ...data,
          project_id: activeProjectId,
        });
        setCastCrewState((prev) => [...prev, member]);
        return member;
      } catch {
        return null;
      }
    },
    [activeProjectId, supabase]
  );

  const addLocation = useCallback(
    async (data: Omit<Location, "id" | "created_at" | "project_id">) => {
      if (!supabase || !activeProjectId) return null;
      try {
        const location = await db.insertLocation(supabase, {
          ...data,
          project_id: activeProjectId,
        });
        setLocations((prev) => [...prev, location]);
        return location;
      } catch {
        return null;
      }
    },
    [activeProjectId, supabase]
  );

  const addShootingDay = useCallback(
    async (data: Omit<ShootingDay, "id" | "created_at" | "project_id">) => {
      if (!supabase || !activeProjectId) return null;
      try {
        const day = await db.insertShootingDay(supabase, {
          ...data,
          project_id: activeProjectId,
        });
        setShootingDaysState((prev) => [...prev, day]);
        return day;
      } catch {
        return null;
      }
    },
    [activeProjectId, supabase]
  );

  const saveCallSheet = useCallback(
    async (sheet: CallSheet) => {
      if (!supabase) return null;
      try {
        const saved = await db.upsertCallSheet(supabase, sheet);
        setCallSheetsState((prev) => {
          const exists = prev.some((c) => c.id === saved.id);
          return exists
            ? prev.map((c) => (c.id === saved.id ? saved : c))
            : [...prev, saved];
        });
        setActiveCallSheetId(saved.id);
        return saved;
      } catch {
        return null;
      }
    },
    [supabase]
  );

  const saveBreakdownToProject = useCallback(async () => {
    if (!supabase || !activeProjectId) return 0;
    const current = breakdownByProject[activeProjectId] ?? [];
    if (current.length === 0) return 0;
    try {
      const toInsert = current.map((s) => ({
        project_id: activeProjectId,
        scene_number: s.scene_number,
        int_ext: s.int_ext,
        day_night: s.day_night,
        location: s.location,
        short_description: s.short_description,
        characters: s.characters,
        props: s.props,
        costumes: s.costumes,
        vfx: s.vfx,
        stunts: s.stunts,
        vehicles: s.vehicles,
        animals: s.animals,
        special_requirements: s.special_requirements,
        complexity: s.complexity,
        production_notes: s.production_notes,
      }));
      const created = await db.insertScenes(supabase, toInsert);
      setScenesState((prev) => {
        const other = prev.filter((s) => s.project_id !== activeProjectId);
        const existing = prev.filter((s) => s.project_id === activeProjectId);
        return [...other, ...existing, ...created];
      });
      return created.length;
    } catch {
      return 0;
    }
  }, [activeProjectId, breakdownByProject, supabase]);

  const updateScene = useCallback(
    async (id: string, updates: Partial<Scene>) => {
      if (!supabase) return;
      try {
        const updated = await db.updateSceneRecord(supabase, id, updates);
        setScenesState((prev) =>
          prev.map((s) => (s.id === id ? updated : s))
        );
      } catch {
        /* ignore */
      }
    },
    [supabase]
  );

  const setScenes = useCallback(
    (action: React.SetStateAction<Scene[]>) => {
      if (!activeProjectId) return;
      setScenesState((prev) => {
        const other = prev.filter((s) => s.project_id !== activeProjectId);
        const current = prev.filter((s) => s.project_id === activeProjectId);
        const next = typeof action === "function" ? action(current) : action;
        return [...other, ...next];
      });
    },
    [activeProjectId]
  );

  const setCastCrew = useCallback(
    (action: React.SetStateAction<CastCrew[]>) => {
      if (!activeProjectId) return;
      setCastCrewState((prev) => {
        const other = prev.filter((c) => c.project_id !== activeProjectId);
        const current = prev.filter((c) => c.project_id === activeProjectId);
        const next = typeof action === "function" ? action(current) : action;
        return [...other, ...next];
      });
    },
    [activeProjectId]
  );

  const setShootingDays = useCallback(
    (action: React.SetStateAction<ShootingDay[]>) => {
      if (!activeProjectId) return;
      setShootingDaysState((prev) => {
        const other = prev.filter((d) => d.project_id !== activeProjectId);
        const current = prev.filter((d) => d.project_id === activeProjectId);
        const next = typeof action === "function" ? action(current) : action;
        return [...other, ...next];
      });
    },
    [activeProjectId]
  );

  const setCallSheets = useCallback(
    (action: React.SetStateAction<CallSheet[]>) => {
      if (!activeProjectId) return;
      setCallSheetsState((prev) => {
        const other = prev.filter((c) => c.project_id !== activeProjectId);
        const current = prev.filter((c) => c.project_id === activeProjectId);
        const next = typeof action === "function" ? action(current) : action;
        return [...other, ...next];
      });
    },
    [activeProjectId]
  );

  const setActiveCallSheet = useCallback(
    (action: React.SetStateAction<CallSheet | null>) => {
      const resolved =
        typeof action === "function" ? action(activeCallSheet) : action;
      setActiveCallSheetId(resolved?.id ?? null);
      if (resolved && activeProjectId) {
        setCallSheetsState((prev) => {
          const other = prev.filter((c) => c.project_id !== activeProjectId);
          const current = prev.filter((c) => c.project_id === activeProjectId);
          const exists = current.some((s) => s.id === resolved.id);
          const next = exists
            ? current.map((s) => (s.id === resolved.id ? resolved : s))
            : [...current, resolved];
          return [...other, ...next];
        });
      }
    },
    [activeCallSheet, activeProjectId]
  );

  const setBreakdownScenes = useCallback(
    (action: React.SetStateAction<Scene[]>) => {
      if (!activeProjectId) return;
      setBreakdownByProject((prev) => {
        const current = prev[activeProjectId] ?? [];
        const next = typeof action === "function" ? action(current) : action;
        return { ...prev, [activeProjectId]: next };
      });
    },
    [activeProjectId]
  );

  const updateBreakdownScene = useCallback(
    (id: string, updates: Partial<Scene>) => {
      setBreakdownScenes((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, ...updates, updated_at: new Date().toISOString() }
            : s
        )
      );
    },
    [setBreakdownScenes]
  );

  const refreshProjectData = useCallback(async () => {
    if (activeProjectId) await loadProjectData(activeProjectId);
  }, [activeProjectId, loadProjectData]);

  const companyCtx: CompanyContextValue = useMemo(
    () => ({
      activeCompany,
      activeWorkspace,
      companyRole,
      userCompanies,
      companyWorkspaces,
      setActiveCompany,
      setActiveWorkspace,
      createCompany,
      createWorkspace,
      runPlatformSetup,
      needsPlatformSetup,
      canManageCompany: companyRole
        ? canManageCompany(companyRole)
        : isPlatformOwner,
      canCreateWorkspace: isPlatformOwner
        ? true
        : companyRole
          ? canCreateWorkspace(user, companyRole)
          : false,
      canCreateProject: isPlatformOwner
        ? true
        : companyRole
          ? canCreateProject(user, companyRole)
          : false,
      canManagePlatform: canManagePlatform(user, companyRole),
      isLoading: companyLoading,
      activeCompanyMembership,
    }),
    [
      activeCompany,
      activeWorkspace,
      companyRole,
      userCompanies,
      companyWorkspaces,
      setActiveCompany,
      setActiveWorkspace,
      createCompany,
      createWorkspace,
      runPlatformSetup,
      needsPlatformSetup,
      isPlatformOwner,
      user,
      companyLoading,
      activeCompanyMembership,
    ]
  );

  const projectCtx: ProjectContextValue = useMemo(
    () => ({
      activeProject,
      projectRole,
      accessibleProjects,
      accessibleProjectsAll,
      setActiveProject,
      createProject,
      updateProjectStatus,
      reactivateProject,
      archiveProject,
      addScene,
      deleteScene,
      addCastCrewMember,
      addLocation,
      addShootingDay,
      saveCallSheet,
      saveBreakdownToProject,
      canReactivateProject: companyRole
        ? canReactivateProject(user, companyRole)
        : false,
      canEditProject: activeProject
        ? canEditProject(
            activeProject,
            user,
            companyRole ?? "viewer",
            projectRole ?? undefined,
            activeProjectMembership
          )
        : false,
      canViewProject: activeProject
        ? canViewProject(
            activeProject,
            user,
            companyRole ?? "viewer",
            projectRole ?? undefined,
            activeProjectMembership,
            activeCompanyMembership
          )
        : false,
      canArchiveProject: canArchiveProject(
        user,
        companyRole ?? "viewer",
        projectRole ?? undefined
      ),
      scenes: projectScenes,
      setScenes,
      updateScene,
      castCrew: projectCastCrew,
      setCastCrew,
      locations: projectLocations,
      shootingDays: projectShootingDays,
      setShootingDays,
      callSheets: projectCallSheets,
      setCallSheets,
      activeCallSheet,
      setActiveCallSheet,
      breakdownScenes,
      setBreakdownScenes,
      updateBreakdownScene,
      archiveLogs: projectArchiveLogs,
      assistantRole,
      setAssistantRole,
      isLoadingProjectData: projectDataLoading,
      refreshProjectData,
      activeProjectMembership,
    }),
    [
      activeProject,
      projectRole,
      accessibleProjects,
      accessibleProjectsAll,
      setActiveProject,
      createProject,
      updateProjectStatus,
      reactivateProject,
      archiveProject,
      addScene,
      deleteScene,
      addCastCrewMember,
      addLocation,
      addShootingDay,
      saveCallSheet,
      saveBreakdownToProject,
      companyRole,
      user,
      activeProjectMembership,
      activeCompanyMembership,
      projectScenes,
      setScenes,
      updateScene,
      projectCastCrew,
      setCastCrew,
      projectLocations,
      projectShootingDays,
      setShootingDays,
      projectCallSheets,
      setCallSheets,
      activeCallSheet,
      setActiveCallSheet,
      breakdownScenes,
      setBreakdownScenes,
      updateBreakdownScene,
      projectArchiveLogs,
      assistantRole,
      projectDataLoading,
      refreshProjectData,
      activeProjectMembership,
    ]
  );

  const value: PlatformContextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      authReady,
      isLoading: authLoading,
      isPlatformOwner,
      accessDebug,
      login,
      logout,
      company: companyCtx,
      project: projectCtx,
    }),
    [user, authReady, authLoading, isPlatformOwner, accessDebug, login, logout, companyCtx, projectCtx]
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}

export function useCompany() {
  return usePlatform().company;
}

export function useProject() {
  return usePlatform().project;
}

export function useAuth() {
  const {
    user,
    isAuthenticated,
    authReady,
    isLoading,
    isPlatformOwner,
    accessDebug,
    login,
    logout,
  } = usePlatform();
  return {
    user,
    isAuthenticated,
    authReady,
    isLoading,
    isPlatformOwner,
    accessDebug,
    login,
    logout,
  };
}

export function getMockAIExtractedScenes(projectId: string): Scene[] {
  const demo = createDemoProjectData(projectId, "Demo", "Demo");
  return demo.scenes.map((s, i) => ({
    ...s,
    id: `ai-${projectId}-${i}-${Date.now()}`,
    scene_number: `${s.scene_number}A`,
    production_notes: "Estratto automaticamente — verificare numerazione.",
  }));
}
