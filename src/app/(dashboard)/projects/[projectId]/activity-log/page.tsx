"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "@/components/ui/Table";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_AREA_LABELS,
  activityLogCsvFilename,
  formatActivityAction,
  formatActivityArea,
  formatActivityDateTime,
} from "@/lib/activity-log/labels";
import {
  computeActivityInsights,
  computeActivityMetrics,
} from "@/lib/activity-log/insights";
import { canViewActivityLog } from "@/lib/activity-log/permissions";
import type { ActivityLogEntry } from "@/lib/activity-log/types";
import { DEPARTMENT_OPTIONS } from "@/lib/permissions/project-permissions";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { Download, History, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 50;

function formatMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

function exportLogsToCsv(
  logs: ActivityLogEntry[],
  filename: string
) {
  const headers = [
    "created_at",
    "user_name",
    "user_email",
    "department",
    "role",
    "action",
    "area",
    "entity_type",
    "entity_label",
    "metadata",
  ];

  const rows = logs.map((log) =>
    [
      log.created_at,
      log.user_name ?? "",
      log.user_email ?? "",
      log.department ?? "",
      log.role ?? "",
      log.action,
      log.area,
      log.entity_type ?? "",
      log.entity_label ?? "",
      JSON.stringify(log.metadata ?? {}),
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ActivityLogPage() {
  const { projectId, project } = useSyncProjectFromUrl();
  const { user } = useAuth();
  const { companyRole } = useCompany();
  const { projectRole } = useProject();

  const canView = canViewActivityLog(user, companyRole ?? "viewer", projectRole ?? undefined);

  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [department, setDepartment] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [action, setAction] = useState("all");
  const [area, setArea] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(
    async (offset = 0, append = false) => {
      if (!projectId || !canView) return;

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (department !== "all") params.set("department", department);
      if (userFilter !== "all") params.set("userId", userFilter);
      if (action !== "all") params.set("action", action);
      if (area !== "all") params.set("area", area);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (search.trim()) params.set("search", search.trim());

      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const response = await fetch(
          `/api/projects/${projectId}/activity-log?${params.toString()}`
        );
        const payload = (await response.json().catch(() => ({}))) as {
          logs?: ActivityLogEntry[];
          total?: number;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load activity log");
        }

        setTotal(payload.total ?? 0);
        setLogs((prev) =>
          append ? [...prev, ...(payload.logs ?? [])] : (payload.logs ?? [])
        );
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity log");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      projectId,
      canView,
      department,
      userFilter,
      action,
      area,
      dateFrom,
      dateTo,
      search,
    ]
  );

  useEffect(() => {
    void fetchLogs(0, false);
  }, [fetchLogs]);

  const userOptions = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((log) => {
      if (log.user_id) {
        map.set(log.user_id, log.user_name ?? log.user_email ?? log.user_id);
      }
    });
    return [...map.entries()].map(([id, label]) => ({ value: id, label }));
  }, [logs]);

  const metrics = useMemo(
    () => ({
      ...computeActivityMetrics(logs),
      totalEvents: total,
    }),
    [logs, total]
  );
  const insights = useMemo(
    () => computeActivityInsights(logs, [...DEPARTMENT_OPTIONS]),
    [logs]
  );

  const hasMore = logs.length < total;

  if (!canView) {
    return (
      <EmptyState
        icon={History}
        title="Access restricted"
        description="You do not have permission to view the activity log."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Track project activity, section access and key production actions."
      />

      <PremiumCard padding="md" variant="ghost" className="border-[var(--border-subtle)]">
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
          Activity Log registra le principali azioni operative del progetto per
          tracciabilità organizzativa. Non traccia messaggi privati, schermo,
          posizione GPS o tasti digitati.
        </p>
      </PremiumCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total events" value={String(metrics.totalEvents)} />
        <StatCard label="Active users" value={String(metrics.activeUsers)} />
        <StatCard label="Events today" value={String(metrics.eventsToday)} />
        <StatCard
          label="Last activity"
          value={
            metrics.lastActivity
              ? formatActivityDateTime(metrics.lastActivity)
              : "—"
          }
        />
      </div>

      <PremiumCard padding="lg">
        <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">
          Operational Insights
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="text-[13px] text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Last user activity: </span>
            {insights.lastUserActivity ?? "—"}
          </p>
          <p className="text-[13px] text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Most viewed area: </span>
            {insights.mostViewedArea ?? "—"}
          </p>
          <p className="text-[13px] text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Departments with activity today: </span>
            {insights.departmentsWithActivityToday.length > 0
              ? insights.departmentsWithActivityToday.join(", ")
              : "None"}
          </p>
          <p className="text-[13px] text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Departments with no activity today: </span>
            {insights.departmentsWithNoActivityToday.length > 0
              ? insights.departmentsWithNoActivityToday.join(", ")
              : "All active"}
          </p>
        </div>
      </PremiumCard>

      <PremiumCard padding="lg">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-[15px] font-medium text-[var(--text-primary)]">
            Project activity
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              exportLogsToCsv(
                logs,
                activityLogCsvFilename(project?.title ?? "project")
              )
            }
            disabled={logs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            options={[
              { value: "all", label: "All departments" },
              ...DEPARTMENT_OPTIONS.map((dept) => ({ value: dept, label: dept })),
            ]}
          />
          <Select
            label="User"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            options={[
              { value: "all", label: "All users" },
              ...userOptions.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ]}
          />
          <Select
            label="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={[
              { value: "all", label: "All actions" },
              ...Object.entries(ACTIVITY_ACTION_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <Select
            label="Area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            options={[
              { value: "all", label: "All areas" },
              ...Object.entries(ACTIVITY_AREA_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <Input
            label="Date from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            label="Date to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="User, entity, action…"
          />
        </div>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity recorded yet."
            description="Project actions will appear here as team members use FilmOps."
          />
        ) : (
          <>
            {error && (
              <p className="mb-3 text-[13px] text-red-400/90" role="alert">
                {error}
              </p>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableTh>Date / Time</TableTh>
                    <TableTh>User</TableTh>
                    <TableTh>Department</TableTh>
                    <TableTh>Role</TableTh>
                    <TableTh>Action</TableTh>
                    <TableTh>Area</TableTh>
                    <TableTh>Entity</TableTh>
                    <TableTh>Details</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableTd>{formatActivityDateTime(log.created_at)}</TableTd>
                      <TableTd>{log.user_name ?? log.user_email ?? "—"}</TableTd>
                      <TableTd>{log.department ?? "—"}</TableTd>
                      <TableTd>{log.role ?? "—"}</TableTd>
                      <TableTd>{formatActivityAction(log.action)}</TableTd>
                      <TableTd>{formatActivityArea(log.area)}</TableTd>
                      <TableTd>{log.entity_label ?? log.entity_type ?? "—"}</TableTd>
                      <TableTd>{formatMetadata(log.metadata)}</TableTd>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => void fetchLogs(logs.length, true)}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </PremiumCard>
    </div>
  );
}
