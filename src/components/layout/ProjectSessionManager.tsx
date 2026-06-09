"use client";

import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { isDepartmentUser } from "@/lib/permissions/project-permissions";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function projectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (!match || match[1] === "new") return null;
  return match[1];
}

/**
 * Keeps activeProject in sync with URL, auto-selects single-project sessions,
 * and routes department users to their dashboard.
 */
export function ProjectSessionManager() {
  const { isPlatformOwner } = useAuth();
  const { isLoading: companyLoading } = useCompany();
  const {
    activeProject,
    accessibleProjectsAll,
    setActiveProject,
    clearActiveProject,
    isDepartmentDashboard,
    activeProjectMembership,
  } = useProject();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (companyLoading) return;

    const urlProjectId = projectIdFromPath(pathname);
    if (urlProjectId) {
      const allowed = accessibleProjectsAll.some((p) => p.id === urlProjectId);
      if (allowed && activeProject?.id !== urlProjectId) {
        setActiveProject(urlProjectId);
      }
      return;
    }

    if (activeProject) return;
    if (accessibleProjectsAll.length === 1) {
      setActiveProject(accessibleProjectsAll[0].id);
    }
  }, [
    companyLoading,
    pathname,
    activeProject,
    accessibleProjectsAll,
    setActiveProject,
  ]);

  useEffect(() => {
    if (companyLoading || !activeProject || !isDepartmentDashboard) return;
    if (pathname !== "/dashboard") return;
    router.replace(`/projects/${activeProject.id}/department`);
  }, [
    companyLoading,
    activeProject,
    isDepartmentDashboard,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (companyLoading || !activeProject || !activeProjectMembership) return;
    if (!isDepartmentUser(activeProjectMembership)) return;
    if (pathname !== "/projects") return;
    router.replace(`/projects/${activeProject.id}/department`);
  }, [
    companyLoading,
    activeProject,
    activeProjectMembership,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (companyLoading || !activeProject) return;
    const stillAccessible = accessibleProjectsAll.some((p) => p.id === activeProject.id);
    if (stillAccessible) return;
    const projectPath = `/projects/${activeProject.id}`;
    clearActiveProject();
    if (pathname === projectPath || pathname.startsWith(`${projectPath}/`)) {
      router.replace("/dashboard");
    }
  }, [
    companyLoading,
    activeProject,
    accessibleProjectsAll,
    clearActiveProject,
    pathname,
    router,
  ]);

  return null;
}
