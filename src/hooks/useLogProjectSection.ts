"use client";

import { logActivity } from "@/lib/activity-log/logActivity";
import { resolveActivityFromPathname } from "@/lib/activity-log/sections";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function useLogProjectSection(projectId: string | undefined) {
  const pathname = usePathname();
  const loggedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const resolved = resolveActivityFromPathname(pathname, projectId);
    if (!resolved) return;

    const key = `${projectId}:${resolved.area}:${resolved.action}`;
    if (loggedKeyRef.current === key) return;
    loggedKeyRef.current = key;

    void logActivity({
      projectId,
      action: resolved.action,
      area: resolved.area,
    });
  }, [pathname, projectId]);
}
