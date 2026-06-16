"use client";

import { useLogProjectSection } from "@/hooks/useLogProjectSection";
import { useParams } from "next/navigation";

export function ProjectActivityTracker() {
  const params = useParams();
  const projectId = params.projectId as string | undefined;

  useLogProjectSection(projectId);

  return null;
}
