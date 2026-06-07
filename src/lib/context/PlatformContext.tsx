"use client";

import { createInitialStore, createDemoProjectData } from "@/lib/mock-data";
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
  PlatformStore,
  Project,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
  Scene,
  SetAssistantRole,
  ShootingDay,
  User,
  Workspace,
} from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
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
  createCompany: (data: { name: string; type: string }) => Company | null;
  createWorkspace: (data: { name: string; description?: string }) => Workspace | null;
  canManageCompany: boolean;
  canCreateWorkspace: boolean;
  canCreateProject: boolean;
  canManagePlatform: boolean;
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
  }) => Project | null;
  updateProjectStatus: (status: ProjectStatus, notes?: string) => void;
  reactivateProject: () => void;
  archiveProject: (action: ArchiveAction, notes?: string) => void;
  addScene: (scene: Omit<Scene, "id" | "created_at" | "updated_at">) => Scene | null;
  deleteScene: (sceneId: string) => void;
  addCastCrewMember: (
    member: Omit<CastCrew, "id" | "created_at" | "project_id">
  ) => CastCrew | null;
  addLocation: (
    location: Omit<Location, "id" | "created_at" | "project_id">
  ) => Location | null;
  saveBreakdownToProject: () => number;
  canEditProject: boolean;
  canReactivateProject: boolean;
  canViewProject: boolean;
  canArchiveProject: boolean;
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  updateScene: (id: string, updates: Partial<Scene>) => void;
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
  archiveLogs: PlatformStore["archiveLogs"];
  assistantRole: SetAssistantRole;
  setAssistantRole: (role: SetAssistantRole) => void;
}

// --- Auth ---
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => boolean;
  logout: () => void;
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

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<PlatformStore>(createInitialStore);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [breakdownByProject, setBreakdownByProject] = useState<
    Record<string, Scene[]>
  >({});
  const [assistantRole, setAssistantRole] =
    useState<SetAssistantRole>("producer");
  const [activeCallSheetId, setActiveCallSheetId] = useState<string | null>(null);

  const user = useMemo(
    () => store.users.find((u) => u.id === currentUserId) ?? null,
    [store.users, currentUserId]
  );

  const userCompanyMemberships = useMemo(() => {
    if (!currentUserId) return [];
    return store.companyMembers.filter(
      (m) => m.user_id === currentUserId && m.status === "active"
    );
  }, [store.companyMembers, currentUserId]);

  const userCompanies = useMemo(() => {
    const ids = new Set(userCompanyMemberships.map((m) => m.company_id));
    return store.companies.filter((c) => ids.has(c.id) && c.status === "active");
  }, [userCompanyMemberships, store.companies]);

  const activeCompany = useMemo(
    () => store.companies.find((c) => c.id === activeCompanyId) ?? null,
    [store.companies, activeCompanyId]
  );

  const companyRole = useMemo((): CompanyRole | null => {
    if (!currentUserId || !activeCompanyId) return null;
    const m = store.companyMembers.find(
      (cm) => cm.user_id === currentUserId && cm.company_id === activeCompanyId
    );
    return m?.role ?? null;
  }, [store.companyMembers, currentUserId, activeCompanyId]);

  const companyWorkspaces = useMemo(() => {
    if (!activeCompanyId) return [];
    return store.workspaces.filter(
      (w) => w.company_id === activeCompanyId && w.status === "active"
    );
  }, [store.workspaces, activeCompanyId]);

  const activeWorkspace = useMemo(
    () => store.workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [store.workspaces, activeWorkspaceId]
  );

  const userProjectMemberships = useMemo(() => {
    if (!currentUserId) return [];
    return store.projectMembers.filter(
      (m) => m.user_id === currentUserId && m.access_status === "active"
    );
  }, [store.projectMembers, currentUserId]);

  const accessibleProjectsAll = useMemo(() => {
    if (!activeCompanyId) return [];
    const isAdmin =
      companyRole === "platform_owner" || companyRole === "company_admin";
    const projects = store.projects.filter(
      (p) => p.company_id === activeCompanyId
    );
    if (isAdmin) return projects;
    const ids = new Set(userProjectMemberships.map((m) => m.project_id));
    return projects.filter((p) => ids.has(p.id));
  }, [store.projects, activeCompanyId, companyRole, userProjectMemberships]);

  const accessibleProjects = useMemo(() => {
    if (!activeWorkspaceId) return accessibleProjectsAll;
    return accessibleProjectsAll.filter(
      (p) => p.workspace_id === activeWorkspaceId
    );
  }, [accessibleProjectsAll, activeWorkspaceId]);

  const activeProject = useMemo(
    () => store.projects.find((p) => p.id === activeProjectId) ?? null,
    [store.projects, activeProjectId]
  );

  const projectRole = useMemo((): ProjectRole | null => {
    if (!currentUserId || !activeProjectId) return null;
    if (companyRole === "platform_owner" || companyRole === "company_admin") {
      return "project_admin";
    }
    const m = store.projectMembers.find(
      (pm) => pm.user_id === currentUserId && pm.project_id === activeProjectId
    );
    return m?.role ?? null;
  }, [store.projectMembers, currentUserId, activeProjectId, companyRole]);

  const projectScenes = useMemo(
    () => filterByProject(store.scenes, activeProjectId),
    [store.scenes, activeProjectId]
  );

  const projectCastCrew = useMemo(
    () => filterByProject(store.castCrew, activeProjectId),
    [store.castCrew, activeProjectId]
  );

  const projectLocations = useMemo(
    () => filterByProject(store.locations, activeProjectId),
    [store.locations, activeProjectId]
  );

  const projectShootingDays = useMemo(
    () => filterByProject(store.shootingDays, activeProjectId),
    [store.shootingDays, activeProjectId]
  );

  const projectCallSheets = useMemo(
    () => filterByProject(store.callSheets, activeProjectId),
    [store.callSheets, activeProjectId]
  );

  const projectArchiveLogs = useMemo(
    () => filterByProject(store.archiveLogs, activeProjectId),
    [store.archiveLogs, activeProjectId]
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
    (email: string) => {
      const found = store.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (!found) return false;
      setCurrentUserId(found.id);
      setActiveCompanyId(null);
      setActiveWorkspaceId(null);
      setActiveProjectId(null);
      return true;
    },
    [store.users]
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
    setActiveCompanyId(null);
    setActiveWorkspaceId(null);
    setActiveProjectId(null);
  }, []);

  const setActiveCompany = useCallback(
    (companyId: string) => {
      const allowed = userCompanies.some((c) => c.id === companyId);
      if (!allowed) return;
      setActiveCompanyId(companyId);
      const firstWs = store.workspaces.find(
        (w) => w.company_id === companyId && w.status === "active"
      );
      setActiveWorkspaceId(firstWs?.id ?? null);
      setActiveProjectId(null);
    },
    [userCompanies, store.workspaces]
  );

  const setActiveWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setActiveProjectId(null);
  }, []);

  const setActiveProject = useCallback(
    (projectId: string) => {
      const allowed = accessibleProjectsAll.some((p) => p.id === projectId);
      if (!allowed) return;
      setActiveProjectId(projectId);
      const proj = store.projects.find((p) => p.id === projectId);
      if (proj) setActiveWorkspaceId(proj.workspace_id);
      const cs = store.callSheets.find((c) => c.project_id === projectId);
      setActiveCallSheetId(cs?.id ?? null);
    },
    [accessibleProjectsAll, store.callSheets, store.projects]
  );

  const createCompany = useCallback(
    (data: { name: string; type: string }) => {
      if (!currentUserId) return null;
      const isOwner = userCompanyMemberships.some(
        (m) => m.role === "platform_owner"
      );
      if (!isOwner) return null;

      const id = `comp-${Date.now()}`;
      const company: Company = {
        id,
        name: data.name,
        type: data.type,
        status: "active",
        created_at: new Date().toISOString(),
      };
      const member: CompanyMember = {
        id: `cm-${Date.now()}`,
        company_id: id,
        user_id: currentUserId,
        role: "company_admin",
        status: "active",
        joined_at: new Date().toISOString(),
      };
      setStore((prev) => ({
        ...prev,
        companies: [...prev.companies, company],
        companyMembers: [...prev.companyMembers, member],
      }));
      return company;
    },
    [currentUserId, userCompanyMemberships, companyRole]
  );

  const createWorkspace = useCallback(
    (data: { name: string; description?: string }) => {
      if (!activeCompanyId || !canCreateWorkspace(companyRole ?? "viewer"))
        return null;
      const ws: Workspace = {
        id: `ws-${Date.now()}`,
        company_id: activeCompanyId,
        name: data.name,
        description: data.description,
        status: "active",
        created_at: new Date().toISOString(),
      };
      setStore((prev) => ({
        ...prev,
        workspaces: [...prev.workspaces, ws],
      }));
      setActiveWorkspaceId(ws.id);
      return ws;
    },
    [activeCompanyId, companyRole]
  );

  const createProject = useCallback(
    (data: {
      title: string;
      production_type: string;
      description?: string;
      status: ProjectStatus;
      start_date?: string;
      end_date?: string;
      workspace_id: string;
    }) => {
      if (!activeCompanyId || !currentUserId) return null;
      if (!canCreateProject(companyRole ?? "viewer")) return null;

      const id = `proj-${Date.now()}`;
      const ts = new Date().toISOString();
      const project: Project = {
        id,
        workspace_id: data.workspace_id,
        company_id: activeCompanyId,
        title: data.title,
        production_type: data.production_type,
        description: data.description,
        status: data.status,
        start_date: data.start_date,
        end_date: data.end_date,
        created_at: ts,
        updated_at: ts,
      };
      const member: ProjectMember = {
        id: `pm-${Date.now()}`,
        project_id: id,
        user_id: currentUserId,
        role: "project_admin",
        access_status: "active",
        created_at: ts,
      };
      setStore((prev) => ({
        ...prev,
        projects: [...prev.projects, project],
        projectMembers: [...prev.projectMembers, member],
      }));
      setActiveProjectId(id);
      return project;
    },
    [activeCompanyId, currentUserId, companyRole]
  );

  const updateProjectInStore = useCallback(
    (projectId: string, updates: Partial<Project>) => {
      setStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? { ...p, ...updates, updated_at: new Date().toISOString() }
            : p
        ),
      }));
    },
    []
  );

  const addArchiveLog = useCallback(
    (projectId: string, action: ArchiveAction, notes?: string) => {
      if (!currentUserId) return;
      setStore((prev) => ({
        ...prev,
        archiveLogs: [
          ...prev.archiveLogs,
          {
            id: `log-${Date.now()}`,
            project_id: projectId,
            action,
            performed_by: currentUserId,
            notes,
            created_at: new Date().toISOString(),
          },
        ],
      }));
    },
    [currentUserId]
  );

  const updateProjectStatus = useCallback(
    (status: ProjectStatus, notes?: string) => {
      if (!activeProjectId || !activeProject) return;
      const ts = new Date().toISOString();
      updateProjectInStore(activeProjectId, {
        status,
        ...(status === "archived" && { archived_at: ts }),
        ...(status === "locked" && { locked_at: ts }),
      });
      addArchiveLog(activeProjectId, status as ArchiveAction, notes);
    },
    [activeProjectId, activeProject, updateProjectInStore, addArchiveLog]
  );

  const archiveProject = useCallback(
    (action: ArchiveAction, notes?: string) => {
      if (!activeProjectId) return;
      const statusMap: Partial<Record<ArchiveAction, ProjectStatus>> = {
        archived: "archived",
        locked: "locked",
        completed: "archived",
        unlocked: "active",
      };
      const status = statusMap[action];
      if (status) updateProjectStatus(status, notes);
      else addArchiveLog(activeProjectId, action, notes);
    },
    [activeProjectId, updateProjectStatus, addArchiveLog]
  );

  const reactivateProject = useCallback(() => {
    if (!activeProjectId) return;
    updateProjectInStore(activeProjectId, {
      status: "active",
      archived_at: undefined,
      locked_at: undefined,
    });
    addArchiveLog(activeProjectId, "unlocked", "Progetto riattivato");
  }, [activeProjectId, updateProjectInStore, addArchiveLog]);

  const addScene = useCallback(
    (data: Omit<Scene, "id" | "created_at" | "updated_at">) => {
      if (!activeProjectId) return null;
      const ts = new Date().toISOString();
      const scene: Scene = {
        ...data,
        id: `scene-${activeProjectId}-${Date.now()}`,
        project_id: activeProjectId,
        created_at: ts,
        updated_at: ts,
      };
      setStore((prev) => ({
        ...prev,
        scenes: [...prev.scenes, scene],
      }));
      return scene;
    },
    [activeProjectId]
  );

  const deleteScene = useCallback(
    (sceneId: string) => {
      if (!activeProjectId) return;
      setStore((prev) => ({
        ...prev,
        scenes: prev.scenes.filter(
          (s) => !(s.id === sceneId && s.project_id === activeProjectId)
        ),
      }));
    },
    [activeProjectId]
  );

  const addCastCrewMember = useCallback(
    (data: Omit<CastCrew, "id" | "created_at" | "project_id">) => {
      if (!activeProjectId) return null;
      const member: CastCrew = {
        ...data,
        id: `cc-${activeProjectId}-${Date.now()}`,
        project_id: activeProjectId,
        created_at: new Date().toISOString(),
      };
      setStore((prev) => ({
        ...prev,
        castCrew: [...prev.castCrew, member],
      }));
      return member;
    },
    [activeProjectId]
  );

  const addLocation = useCallback(
    (data: Omit<Location, "id" | "created_at" | "project_id">) => {
      if (!activeProjectId) return null;
      const location: Location = {
        ...data,
        id: `loc-${activeProjectId}-${Date.now()}`,
        project_id: activeProjectId,
        created_at: new Date().toISOString(),
      };
      setStore((prev) => ({
        ...prev,
        locations: [...prev.locations, location],
      }));
      return location;
    },
    [activeProjectId]
  );

  const saveBreakdownToProject = useCallback(() => {
    if (!activeProjectId) return 0;
    const current = breakdownByProject[activeProjectId] ?? [];
    if (current.length === 0) return 0;
    const ts = Date.now();
    const toAdd = current.map((s, i) => ({
      ...s,
      id: `scene-${activeProjectId}-saved-${ts}-${i}`,
      project_id: activeProjectId,
      updated_at: new Date().toISOString(),
    }));
    setStore((prev) => {
      const other = prev.scenes.filter((s) => s.project_id !== activeProjectId);
      const existing = prev.scenes.filter((s) => s.project_id === activeProjectId);
      return { ...prev, scenes: [...other, ...existing, ...toAdd] };
    });
    return toAdd.length;
  }, [activeProjectId, breakdownByProject]);

  const updateScenesInStore = useCallback(
    (updater: (scenes: Scene[]) => Scene[]) => {
      if (!activeProjectId) return;
      setStore((prev) => {
        const other = prev.scenes.filter((s) => s.project_id !== activeProjectId);
        const current = prev.scenes.filter((s) => s.project_id === activeProjectId);
        return { ...prev, scenes: [...other, ...updater(current)] };
      });
    },
    [activeProjectId]
  );

  const updateScene = useCallback(
    (id: string, updates: Partial<Scene>) => {
      updateScenesInStore((scenes) =>
        scenes.map((s) =>
          s.id === id
            ? { ...s, ...updates, updated_at: new Date().toISOString() }
            : s
        )
      );
    },
    [updateScenesInStore]
  );

  const setScenes = useCallback(
    (action: React.SetStateAction<Scene[]>) => {
      updateScenesInStore((current) =>
        typeof action === "function" ? action(current) : action
      );
    },
    [updateScenesInStore]
  );

  const updateCastCrewInStore = useCallback(
    (updater: (items: CastCrew[]) => CastCrew[]) => {
      if (!activeProjectId) return;
      setStore((prev) => {
        const other = prev.castCrew.filter((c) => c.project_id !== activeProjectId);
        const current = prev.castCrew.filter((c) => c.project_id === activeProjectId);
        return { ...prev, castCrew: [...other, ...updater(current)] };
      });
    },
    [activeProjectId]
  );

  const setCastCrew = useCallback(
    (action: React.SetStateAction<CastCrew[]>) => {
      updateCastCrewInStore((current) =>
        typeof action === "function" ? action(current) : action
      );
    },
    [updateCastCrewInStore]
  );

  const updateShootingDaysInStore = useCallback(
    (updater: (items: ShootingDay[]) => ShootingDay[]) => {
      if (!activeProjectId) return;
      setStore((prev) => {
        const other = prev.shootingDays.filter((d) => d.project_id !== activeProjectId);
        const current = prev.shootingDays.filter((d) => d.project_id === activeProjectId);
        return { ...prev, shootingDays: [...other, ...updater(current)] };
      });
    },
    [activeProjectId]
  );

  const setShootingDays = useCallback(
    (action: React.SetStateAction<ShootingDay[]>) => {
      updateShootingDaysInStore((current) =>
        typeof action === "function" ? action(current) : action
      );
    },
    [updateShootingDaysInStore]
  );

  const updateCallSheetsInStore = useCallback(
    (updater: (items: CallSheet[]) => CallSheet[]) => {
      if (!activeProjectId) return;
      setStore((prev) => {
        const other = prev.callSheets.filter((c) => c.project_id !== activeProjectId);
        const current = prev.callSheets.filter((c) => c.project_id === activeProjectId);
        return { ...prev, callSheets: [...other, ...updater(current)] };
      });
    },
    [activeProjectId]
  );

  const setCallSheets = useCallback(
    (action: React.SetStateAction<CallSheet[]>) => {
      updateCallSheetsInStore((current) =>
        typeof action === "function" ? action(current) : action
      );
    },
    [updateCallSheetsInStore]
  );

  const setActiveCallSheet = useCallback(
    (action: React.SetStateAction<CallSheet | null>) => {
      const resolved =
        typeof action === "function" ? action(activeCallSheet) : action;
      setActiveCallSheetId(resolved?.id ?? null);
      if (resolved && activeProjectId) {
        updateCallSheetsInStore((sheets) => {
          const exists = sheets.some((s) => s.id === resolved.id);
          return exists
            ? sheets.map((s) => (s.id === resolved.id ? resolved : s))
            : [...sheets, resolved];
        });
      }
    },
    [activeCallSheet, activeProjectId, updateCallSheetsInStore]
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
      canManageCompany: companyRole ? canManageCompany(companyRole) : false,
      canCreateWorkspace: companyRole ? canCreateWorkspace(companyRole) : false,
      canCreateProject: companyRole ? canCreateProject(companyRole) : false,
      canManagePlatform: companyRole ? canManagePlatform(companyRole) : false,
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
      saveBreakdownToProject,
      canReactivateProject: companyRole
        ? canReactivateProject(companyRole)
        : false,
      canEditProject: activeProject
        ? canEditProject(activeProject, companyRole ?? "viewer", projectRole ?? undefined)
        : false,
      canViewProject: activeProject
        ? canViewProject(activeProject, companyRole ?? "viewer", projectRole ?? undefined)
        : false,
      canArchiveProject: canArchiveProject(
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
      saveBreakdownToProject,
      companyRole,
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
    ]
  );

  const value: PlatformContextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!currentUserId,
      login,
      logout,
      company: companyCtx,
      project: projectCtx,
    }),
    [user, currentUserId, login, logout, companyCtx, projectCtx]
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
  const { user, isAuthenticated, login, logout } = usePlatform();
  return { user, isAuthenticated, login, logout };
}

// Re-export demo AI scenes generator for script breakdown
export function getMockAIExtractedScenes(projectId: string): Scene[] {
  const demo = createDemoProjectData(projectId, "Demo", "Demo");
  return demo.scenes.map((s, i) => ({
    ...s,
    id: `ai-${projectId}-${i}-${Date.now()}`,
    scene_number: `${s.scene_number}A`,
    production_notes: "Estratto automaticamente — verificare numerazione.",
  }));
}
