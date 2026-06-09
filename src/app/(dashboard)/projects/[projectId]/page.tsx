"use client";

import { ProductionControlCenter } from "@/components/project/ProductionControlCenter";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { useProject } from "@/lib/context/PlatformContext";
import { Clapperboard, Loader2 } from "lucide-react";

export default function ProjectDetailPage() {
  const { projectId, project } = useSyncProjectFromUrl();
  const { isLoadingProjectData, canViewProject } = useProject();

  if (!projectId) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="Project not selected"
        description="Select a project from the top bar to open the Production Control Center."
      />
    );
  }

  if (!project) {
    if (isLoadingProjectData) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      );
    }
    return (
      <EmptyState
        icon={Clapperboard}
        title="Project unavailable"
        description="This project was not found or your account does not have access."
      />
    );
  }

  if (!canViewProject) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="Access restricted"
        description="You are not authorized to view this production control center."
      />
    );
  }

  return <ProductionControlCenter project={project} projectId={projectId} />;
}
