"use client";

import { useProject } from "@/lib/context/PlatformContext";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export function useSyncProjectFromUrl() {
  const params = useParams();
  const projectId = params.projectId as string | undefined;
  const { accessibleProjects, setActiveProject, activeProject } = useProject();

  useEffect(() => {
    if (!projectId) return;
    const allowed = accessibleProjects.some((p) => p.id === projectId);
    if (allowed && activeProject?.id !== projectId) {
      setActiveProject(projectId);
    }
  }, [projectId, accessibleProjects, setActiveProject, activeProject?.id]);

  return {
    projectId,
    project: accessibleProjects.find((p) => p.id === projectId) ?? activeProject,
  };
}
