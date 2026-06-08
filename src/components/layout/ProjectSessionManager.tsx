"use client";

import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { isDepartmentUser } from "@/lib/permissions/project-permissions";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Auto-selects a single assigned project and routes department users to their dashboard.
 */
export function ProjectSessionManager() {
  const { isPlatformOwner } = useAuth();
  const { isLoading: companyLoading } = useCompany();
  const {
    activeProject,
    accessibleProjectsAll,
    setActiveProject,
    isDepartmentDashboard,
    activeProjectMembership,
  } = useProject();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (companyLoading || isPlatformOwner) return;
    if (activeProject) return;
    if (accessibleProjectsAll.length === 1) {
      setActiveProject(accessibleProjectsAll[0].id);
    }
  }, [
    companyLoading,
    isPlatformOwner,
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

  return null;
}
