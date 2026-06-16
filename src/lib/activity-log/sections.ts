import type { ActivityLogArea } from "@/lib/activity-log/types";

export function resolveActivityFromPathname(
  pathname: string,
  projectId: string
): { area: ActivityLogArea; action: "project_opened" | "section_opened" } | null {
  const base = `/projects/${projectId}`;
  if (!pathname.startsWith(base)) return null;

  const suffix = pathname.slice(base.length) || "/";
  if (suffix === "/" || suffix === "") {
    return { area: "dashboard", action: "project_opened" };
  }

  const routes: Array<{ prefix: string; area: ActivityLogArea }> = [
    { prefix: "/script-breakdown", area: "script_breakdown" },
    { prefix: "/scenes", area: "scenes" },
    { prefix: "/locations", area: "locations" },
    { prefix: "/cast-crew", area: "cast_crew" },
    { prefix: "/documents", area: "documents" },
    { prefix: "/call-sheets", area: "call_sheets" },
    { prefix: "/shooting-days", area: "shooting_days" },
    { prefix: "/production-reports", area: "production_reports" },
    { prefix: "/production-intelligence", area: "production_intelligence" },
    { prefix: "/production-pack", area: "production_pack" },
    { prefix: "/department", area: "department" },
    { prefix: "/set-assistant", area: "set_assistant" },
    { prefix: "/archive", area: "archive" },
    { prefix: "/activity-log", area: "activity_log" },
  ];

  for (const route of routes) {
    if (suffix === route.prefix || suffix.startsWith(`${route.prefix}/`)) {
      return { area: route.area, action: "section_opened" };
    }
  }

  return null;
}
