"use client";

import { DocumentsVault } from "@/components/documents/DocumentsVault";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import { FolderOpen, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ProjectDocumentsPage() {
  const { projectId, project } = useSyncProjectFromUrl();
  const searchParams = useSearchParams();
  const initialUploadOpen = searchParams.get("upload") === "1";

  if (!projectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Project not selected"
        description="Select a project to open the documents vault."
      />
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <DocumentsVault
      project={project}
      projectId={projectId}
      initialUploadOpen={initialUploadOpen}
    />
  );
}
