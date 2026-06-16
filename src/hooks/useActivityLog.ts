"use client";

import { logActivity } from "@/lib/activity-log/logActivity";
import type { LogActivityInput } from "@/lib/activity-log/types";
import { useCallback } from "react";

export function useActivityLog(projectId: string | undefined) {
  const track = useCallback(
    (input: Omit<LogActivityInput, "projectId">) => {
      if (!projectId) return;
      void logActivity({ projectId, ...input });
    },
    [projectId]
  );

  return { trackActivity: track };
}
