"use client";

import { useProject } from "@/lib/context/PlatformContext";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export function useSyncProjectFromUrl() {
  const params = useParams();
  const projectId = params.projectId as string | undefined;
  const { accessibleProjectsAll, setActiveProject, activeProject } = useProject();

  useEffect(() => {
    if (!projectId) return;
    const allowed = accessibleProjectsAll.some((p) => p.id === projectId);
    if (!allowed) return;
    if (activeProject?.id !== projectId) {
      setActiveProject(projectId);
    }
  }, [projectId, accessibleProjectsAll, setActiveProject, activeProject?.id]);

  const project =
    accessibleProjectsAll.find((p) => p.id === projectId) ?? activeProject;

  return {
    projectId,
    project,
    isProjectReady: Boolean(projectId && activeProject?.id === projectId),
  };
}
