import type { ActivityLogEntry } from "@/lib/activity-log/types";
import { formatActivityArea, formatActivityDateTime } from "@/lib/activity-log/labels";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface ActivityInsights {
  lastUserActivity: string | null;
  departmentsWithActivityToday: string[];
  departmentsWithNoActivityToday: string[];
  mostViewedArea: string | null;
}

export function computeActivityInsights(
  logs: ActivityLogEntry[],
  knownDepartments: string[] = []
): ActivityInsights {
  const todayStart = startOfToday().getTime();
  const todayLogs = logs.filter(
    (log) => new Date(log.created_at).getTime() >= todayStart
  );

  const lastUserActivity = logs[0]
    ? `${logs[0].user_name ?? logs[0].user_email ?? "Unknown"} · ${formatActivityDateTime(logs[0].created_at)}`
    : null;

  const activeDepartments = new Set<string>();
  for (const log of todayLogs) {
    if (log.department?.trim()) {
      activeDepartments.add(log.department.trim());
    }
  }

  const departmentsWithActivityToday = [...activeDepartments].sort();
  const departmentsWithNoActivityToday = knownDepartments.filter(
    (dept) => !activeDepartments.has(dept)
  );

  const areaCounts = new Map<string, number>();
  for (const log of logs) {
    if (
      log.action === "section_opened" ||
      log.action === "project_opened"
    ) {
      areaCounts.set(log.area, (areaCounts.get(log.area) ?? 0) + 1);
    }
  }

  let mostViewedArea: string | null = null;
  let maxCount = 0;
  for (const [area, count] of areaCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostViewedArea = formatActivityArea(area);
    }
  }

  return {
    lastUserActivity,
    departmentsWithActivityToday,
    departmentsWithNoActivityToday,
    mostViewedArea,
  };
}

export function computeActivityMetrics(logs: ActivityLogEntry[]) {
  const todayStart = startOfToday().getTime();
  const todayCount = logs.filter(
    (log) => new Date(log.created_at).getTime() >= todayStart
  ).length;
  const activeUsers = new Set(
    logs.map((log) => log.user_id).filter(Boolean)
  ).size;

  return {
    totalEvents: logs.length,
    activeUsers,
    eventsToday: todayCount,
    lastActivity: logs[0]?.created_at ?? null,
  };
}
