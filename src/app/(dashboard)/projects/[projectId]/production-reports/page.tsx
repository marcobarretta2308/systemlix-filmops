"use client";

import { ProductionReportStatusBadge } from "@/components/production-reports/ProductionReportStatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
  memberDepartmentToReportKey,
  REPORT_DEPARTMENTS,
  SCENE_REPORT_STATUSES,
  SCENE_REPORT_STATUS_LABELS,
} from "@/lib/production-reports/constants";
import {
  canCreateProductionReport,
  canEditDepartmentNote,
  canEditProductionReport,
  canSubmitOrApproveReport,
  canViewProductionReports,
} from "@/lib/production-reports/permissions";
import { operationFailed } from "@/lib/utils/user-facing-error";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import type {
  IssueCategory,
  IssueSeverity,
  ProductionReport,
  ProductionReportIssue,
  ProductionReportScene,
  SceneReportStatus,
} from "@/lib/types";
import {
  CheckCircle,
  ClipboardList,
  Download,
  Loader2,
  Plus,
  Save,
  Send,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSceneRows(
  reportId: string,
  shootingDayId: string | undefined,
  existing: ProductionReportScene[],
  scenes: ReturnType<typeof useProject>["scenes"],
  shootingDays: ReturnType<typeof useProject>["shootingDays"]
): ProductionReportScene[] {
  const day = shootingDays.find((d) => d.id === shootingDayId);
  const sceneIds = day?.selected_scene_ids ?? [];
  const now = new Date().toISOString();

  return sceneIds.map((sceneId) => {
    const scene = scenes.find((s) => s.id === sceneId);
    const prev = existing.find((e) => e.scene_id === sceneId);
    return (
      prev ?? {
        id: `prs-${sceneId}-${Date.now()}`,
        report_id: reportId,
        scene_id: sceneId,
        scene_number: scene?.scene_number ?? sceneId,
        status: "completed" as SceneReportStatus,
        notes: "",
        created_at: now,
        updated_at: now,
      }
    );
  });
}

export default function ProductionReportsPage() {
  const { projectId, project, isProjectReady } = useSyncProjectFromUrl();
  const searchParams = useSearchParams();
  const { activeCompany, companyRole } = useCompany();
  const { user } = useAuth();
  const {
    shootingDays,
    callSheets,
    scenes,
    productionReports,
    productionReportScenes,
    productionReportIssues,
    productionReportDeptNotes,
    saveProductionReport,
    saveProductionReportDepartmentNote,
    submitProductionReport,
    approveProductionReport,
    projectRole,
    activeProjectMembership,
    projectPermissions,
    isLoadingProjectData,
    canEditProject,
  } = useProject();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductionReport | null>(null);
  const [sceneRows, setSceneRows] = useState<ProductionReportScene[]>([]);
  const [issueRows, setIssueRows] = useState<ProductionReportIssue[]>([]);
  const [deptNotes, setDeptNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error" | "warning">(
    "success"
  );

  const canView = projectPermissions.can_view_production_reports;
  const canCreate = project
    ? canCreateProductionReport(project, user, companyRole, projectRole)
    : false;
  const canManage = project
    ? canSubmitOrApproveReport(project, user, companyRole, projectRole)
    : false;

  const memberReportDept = memberDepartmentToReportKey(
    activeProjectMembership?.department
  );

  const sortedReports = useMemo(
    () =>
      [...productionReports].sort(
        (a, b) =>
          new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
      ),
    [productionReports]
  );

  const notify = (
    message: string,
    variant: "success" | "error" | "warning" = "success"
  ) => {
    setToastVariant(variant);
    setToast(message);
  };

  const loadReportIntoEditor = (report: ProductionReport) => {
    setSelectedId(report.id);
    setDraft({ ...report });
    setSceneRows(
      productionReportScenes.filter((s) => s.report_id === report.id)
    );
    setIssueRows(
      productionReportIssues.filter((i) => i.report_id === report.id)
    );
    const notes: Record<string, string> = {};
    for (const n of productionReportDeptNotes.filter(
      (d) => d.report_id === report.id
    )) {
      notes[n.department] = n.notes ?? "";
    }
    setDeptNotes(notes);
  };

  useEffect(() => {
    const reportParam = searchParams.get("report");
    if (!reportParam || !projectId) return;
    const report = productionReports.find((r) => r.id === reportParam);
    if (report) loadReportIntoEditor(report);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, productionReports, projectId]);

  const createNewReport = () => {
    if (!project || !user || !projectId || !activeCompany) return;
    const day = shootingDays[0];
    const linkedSheet = day
      ? callSheets.find((s) => s.shooting_day_id === day.id)
      : null;
    const localId = `pr-${projectId}-${Date.now()}`;
    const now = new Date().toISOString();
    const report: ProductionReport = {
      id: localId,
      company_id: project.company_id,
      workspace_id: project.workspace_id,
      project_id: projectId,
      shooting_day_id: day?.id,
      call_sheet_id: linkedSheet?.id,
      report_date: day?.date ?? now.slice(0, 10),
      title: day
        ? `Wrap Report — Day ${day.day_number}`
        : "Production Report",
      status: "draft",
      created_by: user.id,
      created_at: now,
      updated_at: now,
    };
    setSelectedId(localId);
    setDraft(report);
    setSceneRows(buildSceneRows(localId, day?.id, [], scenes, shootingDays));
    setIssueRows([]);
    setDeptNotes({});
  };

  const onShootingDayChange = (dayId: string) => {
    if (!draft) return;
    const day = shootingDays.find((d) => d.id === dayId);
    const sheet = callSheets.find((s) => s.shooting_day_id === dayId);
    setDraft({
      ...draft,
      shooting_day_id: dayId || undefined,
      call_sheet_id: sheet?.id,
      report_date: day?.date ?? draft.report_date,
      title: day
        ? `Wrap Report — Day ${day.day_number}`
        : draft.title,
    });
    setSceneRows(
      buildSceneRows(
        draft.id,
        dayId,
        sceneRows,
        scenes,
        shootingDays
      )
    );
  };

  const canEditMain =
    draft && project
      ? canEditProductionReport(draft, project, user, companyRole, projectRole)
      : false;

  const canEditDept = (department: string) =>
    draft && project
      ? canEditDepartmentNote(
          draft,
          activeProjectMembership,
          projectRole,
          department,
          canManage
        )
      : false;

  const handleSave = async () => {
    if (!draft || !projectId) return;
    setSaving(true);
    const { report, error } = await saveProductionReport(draft, {
      scenes: canEditMain ? sceneRows : undefined,
      issues: canEditMain ? issueRows : undefined,
    });
    setSaving(false);
    if (error) {
      notify(operationFailed(error), "error");
      return;
    }
    if (report) {
      setDraft(report);
      setSelectedId(report.id);
      notify("Production report saved.");
    }
  };

  const handleSaveDeptNote = async (department: string) => {
    if (!draft || !UUID_RE.test(draft.id)) {
      notify("Save the report before adding department notes.", "warning");
      return;
    }
    const { error } = await saveProductionReportDepartmentNote(
      draft.id,
      department,
      deptNotes[department] ?? ""
    );
    if (error) {
      notify(operationFailed(error), "error");
      return;
    }
    notify(`${department} notes saved.`);
  };

  const handleSubmit = async () => {
    if (!draft || !UUID_RE.test(draft.id)) {
      notify("Save the report before submitting.", "warning");
      return;
    }
    setSaving(true);
    const { report, error } = await submitProductionReport(draft.id);
    setSaving(false);
    if (error) {
      notify(operationFailed(error), "error");
      return;
    }
    if (report) {
      setDraft(report);
      notify("Report submitted for approval.");
    }
  };

  const handleApprove = async () => {
    if (!draft || !UUID_RE.test(draft.id)) return;
    setSaving(true);
    const { report, error } = await approveProductionReport(draft.id);
    setSaving(false);
    if (error) {
      notify(operationFailed(error), "error");
      return;
    }
    if (report) {
      setDraft(report);
      notify("Report approved.");
    }
  };

  const handleExportPdf = async () => {
    if (!draft || !UUID_RE.test(draft.id) || !projectId) {
      notify("Save the report before exporting PDF.", "warning");
      return;
    }
    setExporting(true);
    try {
      const response = await fetch("/api/production-reports/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, reportId: draft.id }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "PDF export failed");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = match?.[1] ?? `filmops-production-report-${draft.report_date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      notify("PDF exported.");
    } catch (err) {
      notify(
        operationFailed(
          err instanceof Error ? err.message : "PDF export failed"
        ),
        "error"
      );
    } finally {
      setExporting(false);
    }
  };

  const addIssue = () => {
    if (!draft) return;
    const now = new Date().toISOString();
    setIssueRows((prev) => [
      ...prev,
      {
        id: `pri-${Date.now()}`,
        report_id: draft.id,
        category: "delay" as IssueCategory,
        severity: "medium" as IssueSeverity,
        title: "New issue",
        resolved: false,
        created_at: now,
        updated_at: now,
      },
    ]);
  };

  if (!isProjectReady || isLoadingProjectData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (
    !canView ||
    !canViewProductionReports(user, companyRole, projectRole, canView)
  ) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Access restricted"
        description="You do not have permission to view production reports for this project."
      />
    );
  }

  const shootingDayOptions = [
    { value: "", label: "— Select shooting day —" },
    ...shootingDays.map((d) => ({
      value: d.id,
      label: `Day ${d.day_number} · ${formatDate(d.date)}`,
    })),
  ];

  const callSheetOptions = [
    { value: "", label: "— No call sheet —" },
    ...callSheets
      .filter(
        (s) =>
          !draft?.shooting_day_id ||
          s.shooting_day_id === draft.shooting_day_id
      )
      .map((s) => ({
        value: s.id,
        label: `Day ${s.day_number} · v${s.version}`,
      })),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Production Reports"
        description="End-of-day wrap reports linked to shooting days and call sheets."
        actions={
          canCreate && canEditProject ? (
            <Button onClick={createNewReport}>
              <Plus className="h-3.5 w-3.5" />
              New Production Report
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <PremiumCard padding="md">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mb-4">
            Reports
          </p>
          {sortedReports.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No production reports yet"
              description="Create a wrap report at the end of each shooting day to document actual timings, scene status and issues."
              action={
                canCreate && canEditProject ? (
                  <Button onClick={createNewReport}>
                    <Plus className="h-3.5 w-3.5" />
                    New Production Report
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-2">
              {sortedReports.map((report) => {
                const day = shootingDays.find(
                  (d) => d.id === report.shooting_day_id
                );
                const sheet = callSheets.find(
                  (s) => s.id === report.call_sheet_id
                );
                const active = selectedId === report.id;
                return (
                  <li key={report.id}>
                    <button
                      type="button"
                      onClick={() => loadReportIntoEditor(report)}
                      className={`w-full rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors ${
                        active
                          ? "border-[rgba(34,211,238,0.35)] bg-white/[0.04]"
                          : "border-[var(--border-subtle)] hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium text-[var(--text-primary)]">
                          {report.title ?? `Report ${formatDate(report.report_date)}`}
                        </p>
                        <ProductionReportStatusBadge status={report.status} />
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {formatDate(report.report_date)}
                        {day ? ` · Day ${day.day_number}` : ""}
                        {sheet ? ` · CS v${sheet.version}` : ""}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                        {report.creator_name ?? "—"}
                        {report.submitted_at
                          ? ` · Submitted ${formatDateTime(report.submitted_at)}`
                          : ""}
                        {report.approved_at
                          ? ` · Approved ${formatDateTime(report.approved_at)}`
                          : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </PremiumCard>

        <div className="space-y-6">
          {!draft ? (
            <PremiumCard padding="md">
              <EmptyState
                icon={ClipboardList}
                title="Select or create a report"
                description="Choose a report from the list or start a new wrap report for today's shoot."
              />
            </PremiumCard>
          ) : (
            <>
              <PremiumCard padding="md" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ProductionReportStatusBadge status={draft.status} />
                  <div className="flex flex-wrap gap-2">
                    {canEditMain && (
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                      </Button>
                    )}
                    {UUID_RE.test(draft.id) && (
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={exporting}
                      >
                        {exporting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Export PDF
                      </Button>
                    )}
                    {canManage && draft.status === "draft" && UUID_RE.test(draft.id) && (
                      <Button size="sm" onClick={handleSubmit} disabled={saving}>
                        <Send className="h-3.5 w-3.5" />
                        Submit
                      </Button>
                    )}
                    {canManage && draft.status === "submitted" && (
                      <Button size="sm" onClick={handleApprove} disabled={saving}>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>

                {canEditMain ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Report title"
                      value={draft.title ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, title: e.target.value })
                      }
                    />
                    <Input
                      label="Report date"
                      type="date"
                      value={draft.report_date}
                      onChange={(e) =>
                        setDraft({ ...draft, report_date: e.target.value })
                      }
                    />
                    <Select
                      label="Shooting day"
                      options={shootingDayOptions}
                      value={draft.shooting_day_id ?? ""}
                      onChange={(e) => onShootingDayChange(e.target.value)}
                    />
                    <Select
                      label="Linked call sheet"
                      options={callSheetOptions}
                      value={draft.call_sheet_id ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          call_sheet_id: e.target.value || undefined,
                        })
                      }
                    />
                    <Input
                      label="Actual crew call"
                      value={draft.actual_crew_call_time ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          actual_crew_call_time: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Actual first shot"
                      value={draft.actual_first_shot_time ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          actual_first_shot_time: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Actual wrap"
                      value={draft.actual_wrap_time ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          actual_wrap_time: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Meal break"
                      value={draft.meal_break_time ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          meal_break_time: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Total shooting hours"
                      type="number"
                      step="0.25"
                      value={draft.total_shooting_hours ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          total_shooting_hours: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="grid gap-2 text-[13px]">
                    <p>
                      <span className="text-[var(--text-muted)]">Title: </span>
                      {draft.title}
                    </p>
                    <p>
                      <span className="text-[var(--text-muted)]">Date: </span>
                      {formatDate(draft.report_date)}
                    </p>
                  </div>
                )}

                {canEditMain && (
                  <div className="grid gap-4">
                    <Textarea
                      label="Overtime notes"
                      value={draft.overtime_notes ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, overtime_notes: e.target.value })
                      }
                    />
                    <Textarea
                      label="Weather notes"
                      value={draft.weather_notes ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, weather_notes: e.target.value })
                      }
                    />
                    <Textarea
                      label="General production notes"
                      value={draft.general_notes ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, general_notes: e.target.value })
                      }
                    />
                  </div>
                )}
              </PremiumCard>

              {canEditMain && (
                <PremiumCard padding="md">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                      Scene status
                    </p>
                  </div>
                  {sceneRows.length === 0 ? (
                    <p className="text-[12px] text-[var(--text-muted)]">
                      Link a shooting day to load scenes for this report.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sceneRows.map((row, idx) => (
                        <div
                          key={row.id}
                          className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3 sm:grid-cols-[80px_1fr_1fr]"
                        >
                          <p className="text-[13px] font-medium">
                            Scene {row.scene_number}
                          </p>
                          <Select
                            options={SCENE_REPORT_STATUSES.map((s) => ({
                              value: s,
                              label: SCENE_REPORT_STATUS_LABELS[s],
                            }))}
                            value={row.status}
                            onChange={(e) => {
                              const next = [...sceneRows];
                              next[idx] = {
                                ...row,
                                status: e.target.value as SceneReportStatus,
                              };
                              setSceneRows(next);
                            }}
                          />
                          <Input
                            placeholder="Notes"
                            value={row.notes ?? ""}
                            onChange={(e) => {
                              const next = [...sceneRows];
                              next[idx] = { ...row, notes: e.target.value };
                              setSceneRows(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </PremiumCard>
              )}

              {canEditMain && (
                <PremiumCard padding="md">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                      Issues & problems
                    </p>
                    <Button variant="subtle" size="sm" onClick={addIssue}>
                      <Plus className="h-3.5 w-3.5" />
                      Add issue
                    </Button>
                  </div>
                  {issueRows.length === 0 ? (
                    <p className="text-[12px] text-[var(--text-muted)]">
                      No issues recorded for this day.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {issueRows.map((issue, idx) => (
                        <div
                          key={issue.id}
                          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3 space-y-2"
                        >
                          <Input
                            label="Title"
                            value={issue.title}
                            onChange={(e) => {
                              const next = [...issueRows];
                              next[idx] = { ...issue, title: e.target.value };
                              setIssueRows(next);
                            }}
                          />
                          <div className="grid gap-2 sm:grid-cols-3">
                            <Select
                              label="Category"
                              options={ISSUE_CATEGORIES.map((c) => ({
                                value: c.value,
                                label: c.label,
                              }))}
                              value={issue.category}
                              onChange={(e) => {
                                const next = [...issueRows];
                                next[idx] = {
                                  ...issue,
                                  category: e.target.value as IssueCategory,
                                };
                                setIssueRows(next);
                              }}
                            />
                            <Select
                              label="Department"
                              options={[
                                { value: "", label: "—" },
                                ...REPORT_DEPARTMENTS.map((d) => ({
                                  value: d,
                                  label: d,
                                })),
                              ]}
                              value={issue.department ?? ""}
                              onChange={(e) => {
                                const next = [...issueRows];
                                next[idx] = {
                                  ...issue,
                                  department: e.target.value || undefined,
                                };
                                setIssueRows(next);
                              }}
                            />
                            <Select
                              label="Severity"
                              options={ISSUE_SEVERITIES.map((s) => ({
                                value: s,
                                label: ISSUE_SEVERITY_LABELS[s],
                              }))}
                              value={issue.severity}
                              onChange={(e) => {
                                const next = [...issueRows];
                                next[idx] = {
                                  ...issue,
                                  severity: e.target.value as IssueSeverity,
                                };
                                setIssueRows(next);
                              }}
                            />
                          </div>
                          <Textarea
                            label="Description"
                            value={issue.description ?? ""}
                            onChange={(e) => {
                              const next = [...issueRows];
                              next[idx] = {
                                ...issue,
                                description: e.target.value,
                              };
                              setIssueRows(next);
                            }}
                          />
                          <label className="flex items-center gap-2 text-[12px]">
                            <input
                              type="checkbox"
                              checked={issue.resolved}
                              onChange={(e) => {
                                const next = [...issueRows];
                                next[idx] = {
                                  ...issue,
                                  resolved: e.target.checked,
                                };
                                setIssueRows(next);
                              }}
                            />
                            Resolved
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </PremiumCard>
              )}

              <PremiumCard padding="md">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mb-4">
                  Department notes
                </p>
                <div className="space-y-4">
                  {REPORT_DEPARTMENTS.filter((dept) => {
                    if (canManage) return true;
                    if (memberReportDept === dept) return true;
                    if (draft.status !== "draft") return Boolean(deptNotes[dept]?.trim());
                    return false;
                  }).map((dept) => {
                    const editable = canEditDept(dept);
                    return (
                      <div key={dept} className="space-y-2">
                        <Textarea
                          label={dept}
                          value={deptNotes[dept] ?? ""}
                          readOnly={!editable}
                          onChange={(e) =>
                            setDeptNotes((prev) => ({
                              ...prev,
                              [dept]: e.target.value,
                            }))
                          }
                        />
                        {editable && UUID_RE.test(draft.id) && (
                          <Button
                            variant="subtle"
                            size="sm"
                            onClick={() => handleSaveDeptNote(dept)}
                          >
                            Save {dept} note
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </PremiumCard>
            </>
          )}
        </div>
      </div>

      <Toast
        message={toast ?? ""}
        open={!!toast}
        variant={toastVariant}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
