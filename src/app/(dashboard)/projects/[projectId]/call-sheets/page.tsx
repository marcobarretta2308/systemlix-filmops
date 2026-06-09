"use client";

import { CallSheetInbox } from "@/components/call-sheets/CallSheetInbox";
import { CallSheetPreview } from "@/components/call-sheets/CallSheetPreview";
import { CallSheetStatusBadge } from "@/components/call-sheets/CallSheetStatusBadge";
import { ReadReceiptsPanel } from "@/components/call-sheets/ReadReceiptsPanel";
import { SendCallSheetModal } from "@/components/call-sheets/SendCallSheetModal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { useSyncProjectFromUrl } from "@/hooks/useSyncProjectFromUrl";
import {
  callSheetRequiresNewVersion,
  canManageReadReceipts,
  canSendCallSheet,
  isCallSheetRestrictedView,
} from "@/lib/call-sheets/permissions";
import { sendCallSheetDistribution } from "@/lib/call-sheets/distribution";
import type { RecipientGroupKey } from "@/lib/call-sheets/constants";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { getClientOrNull } from "@/lib/supabase/client";
import * as db from "@/lib/supabase/data";
import type { CallSheet, CallSheetStatus } from "@/lib/types";
import {
  CheckCircle,
  Download,
  FileText,
  Plus,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Tab = "generator" | "library" | "receipts";
type DeptTab = "received" | "history";

export default function CallSheetsPage() {
  const { projectId, project, isProjectReady } = useSyncProjectFromUrl();
  const searchParams = useSearchParams();
  const { activeCompany, companyRole } = useCompany();
  const { user } = useAuth();
  const {
    shootingDays,
    locations,
    scenes,
    castCrew,
    callSheets,
    activeCallSheet,
    setActiveCallSheet,
    saveCallSheet,
    canEditProject,
    projectRole,
    activeProjectMembership,
    projectPermissions,
    activeProjectTeamMembers,
    callSheetDistributions,
    callSheetRecipients,
    refreshCallSheetDistribution,
    refreshProjectMembers,
  } = useProject();

  const [tab, setTab] = useState<Tab>("generator");
  const [deptTab, setDeptTab] = useState<DeptTab>("received");
  const [selectedDayId, setSelectedDayId] = useState("");
  const [localPreview, setLocalPreview] = useState<CallSheet | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error" | "warning">("success");

  const canSend = project
    ? canSendCallSheet(project, user, companyRole, projectRole)
    : false;
  const canReceipts = canManageReadReceipts(user, companyRole, projectRole);
  const isDeptView = isCallSheetRestrictedView(projectRole, canSend, canReceipts);
  const canExportPdf = projectPermissions.can_view_call_sheets;

  const effectiveDayId = selectedDayId || shootingDays[0]?.id || "";
  const preview =
    (localPreview?.project_id === projectId ? localPreview : null) ??
    (activeCallSheet?.project_id === projectId ? activeCallSheet : null);

  const sentWarning = preview ? callSheetRequiresNewVersion(preview) : false;
  const previewIsSaved = Boolean(preview && UUID_RE.test(preview.id));

  useEffect(() => {
    const sheetId = searchParams.get("sheet");
    if (!sheetId || !projectId) return;
    const sheet = callSheets.find((s) => s.id === sheetId);
    if (sheet) {
      setLocalPreview(sheet);
      setActiveCallSheet(sheet);
      if (!isDeptView) setTab("generator");
    }
  }, [searchParams, callSheets, projectId, setActiveCallSheet, isDeptView]);

  const notify = (message: string, variant: "success" | "error" | "warning" = "success") => {
    setToastVariant(variant);
    setToast(message);
  };

  const generateCallSheet = async () => {
    const day = shootingDays.find((d) => d.id === effectiveDayId);
    if (!day || !project || !user || !projectId) return;

    const location = locations.find((l) => l.id === day.location_id);
    const sceneNums = day.selected_scene_ids.map(
      (id) => scenes.find((s) => s.id === id)?.scene_number ?? id
    );
    const version =
      (preview?.version ?? callSheets.reduce((m, c) => Math.max(m, c.version), 0)) + 1;

    const generated: CallSheet = {
      id: `cs-${projectId}-${Date.now()}`,
      project_id: projectId,
      shooting_day_id: day.id,
      version,
      status: "draft",
      generated_by: user.id,
      created_by: user.id,
      production_title: activeCompany?.name ?? "Produzione",
      project_title: project.title,
      day_number: day.day_number,
      date: day.date,
      location: location?.name ?? "—",
      maps_link: location?.maps_link ?? "",
      weather_notes: "Aggiornare previsioni meteo il giorno prima delle riprese.",
      schedule: [
        { time: day.general_crew_call, activity: "Convocazione crew generale" },
        { time: day.makeup_call, activity: "Convocazione trucco e parrucco" },
        { time: day.cast_call, activity: "Convocazione cast" },
        { time: day.first_shot, activity: "Primo ciak" },
        { time: day.lunch.split("–")[0]?.trim() ?? day.lunch, activity: "Pausa pranzo" },
        { time: day.estimated_wrap, activity: "Wrap stimato" },
      ],
      scenes_to_shoot: sceneNums,
      cast_call_times: castCrew
        .filter((c) => c.department === "Cast")
        .map((c) => ({
          name: c.full_name,
          role: c.role,
          department: c.department,
          call_time: c.call_time || day.cast_call,
        })),
      crew_call_times: castCrew
        .filter((c) => c.department !== "Cast")
        .map((c) => ({
          name: c.full_name,
          role: c.role,
          department: c.department,
          call_time: c.call_time || day.general_crew_call,
        })),
      department_notes: {
        Produzione: day.production_notes || "—",
        Trasporti: day.transport_notes || "—",
      },
      parking_notes: day.parking || location?.parking_notes || "—",
      transport_notes: day.transport_notes,
      emergency_contacts: day.emergency_contact
        ? [{ name: "Produzione", role: "Emergenza", phone: day.emergency_contact }]
        : [],
      production_notes: day.production_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLocalPreview(generated);
    setActiveCallSheet(generated);
    const { sheet: saved, error: saveError } = await saveCallSheet(generated);
    if (saved) {
      setLocalPreview(saved);
      setActiveCallSheet(saved);
      notify(`Call sheet v${version} generated for ${day.day_number}.`);
    } else {
      notify(
        `Failed to save call sheet: ${saveError ?? "unknown error"}`,
        "error"
      );
    }
  };

  const createNewVersionFromSent = async () => {
    if (!preview || !user) return;
    const next: CallSheet = {
      ...preview,
      id: `cs-${projectId}-${Date.now()}`,
      version: preview.version + 1,
      status: "draft",
      approved_by: undefined,
      approved_at: undefined,
      sent_by: undefined,
      sent_at: undefined,
      created_by: user.id,
      generated_by: user.id,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setLocalPreview(next);
    setActiveCallSheet(next);
    notify("New draft version created. Save to persist.", "warning");
  };

  const updateWorkflowStatus = async (
    status: CallSheetStatus,
    extra?: Partial<CallSheet>
  ) => {
    if (!preview || !user) return;
    if (sentWarning && status !== "archived") {
      notify(
        "This call sheet has already been sent. Create a new version before making changes.",
        "warning"
      );
      return;
    }

    const updated: CallSheet = {
      ...preview,
      ...extra,
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "approved") {
      updated.approved_by = user.id;
      updated.approved_at = new Date().toISOString();
    }

    setLocalPreview(updated);
    setActiveCallSheet(updated);

    const supabase = getClientOrNull();
    if (supabase && UUID_RE.test(preview.id)) {
      if (status === "approved") {
        await db.updateCallSheetWorkflow(supabase, preview.id, {
          status: "approved",
          approved_by: user.id,
          approved_at: updated.approved_at,
        });
      } else {
        const { error: saveError } = await saveCallSheet(updated);
        if (saveError) {
          notify(`Failed to save call sheet: ${saveError}`, "error");
          return;
        }
      }
    } else {
      const { error: saveError } = await saveCallSheet(updated);
      if (saveError) {
        notify(`Failed to save call sheet: ${saveError}`, "error");
        return;
      }
    }

    notify(`Status updated.`);
    await refreshCallSheetDistribution();
  };

  const handleSaveVersion = async () => {
    if (!preview) return;
    if (sentWarning) {
      notify(
        "This call sheet has already been sent. Create a new version before making changes.",
        "warning"
      );
      return;
    }
    const { sheet: saved, error: saveError } = await saveCallSheet(preview);
    if (saved) {
      setLocalPreview(saved);
      setActiveCallSheet(saved);
      notify(`Call sheet v${saved.version} saved.`);
    } else {
      notify(
        `Failed to save call sheet: ${saveError ?? "unknown error"}`,
        "error"
      );
    }
  };

  const handleSend = async (
    keys: RecipientGroupKey[],
    specificUserIds: string[]
  ) => {
    if (!preview || !project || !user) {
      return { ok: false, error: "Distribution failed: missing project context" };
    }
    const supabase = getClientOrNull();
    if (!supabase) {
      return { ok: false, error: "Distribution failed: Supabase not configured" };
    }

    const teamMembers =
      (await refreshProjectMembers()) || activeProjectTeamMembers;

    const result = await sendCallSheetDistribution(
      supabase,
      {
        callSheet: preview,
        project,
        sender: user,
        recipientKeys: keys,
        specificUserIds,
      },
      teamMembers
    );

    if (result.ok) {
      await refreshCallSheetDistribution();
      const updated = { ...preview, status: "sent" as CallSheetStatus };
      setLocalPreview(updated);
      setActiveCallSheet(updated);
      notify(`Call sheet sent to ${result.recipients.length} recipients.`);
      return { ok: true };
    }
    return result;
  };

  const exportPdfById = async (callSheetId: string) => {
    if (!projectId || !UUID_RE.test(callSheetId)) {
      notify("Call sheet non valida per export PDF.", "warning");
      return;
    }
    setIsExporting(true);
    try {
      const response = await fetch("/api/call-sheets/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, callSheetId }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        notify(data.error ?? "PDF export failed", "error");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "systemlix-call-sheet.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
      notify("PDF downloaded.");
    } catch {
      notify("Network error during PDF export", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!projectId) return;
    const callSheetId =
      preview?.id && UUID_RE.test(preview.id) ? preview.id : undefined;
    const shootingDayId =
      preview?.shooting_day_id && UUID_RE.test(preview.shooting_day_id)
        ? preview.shooting_day_id
        : effectiveDayId && UUID_RE.test(effectiveDayId)
          ? effectiveDayId
          : undefined;

    if (!callSheetId && !shootingDayId) {
      notify("Select a shooting day or save a call sheet before export.", "warning");
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/call-sheets/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...(callSheetId ? { callSheetId } : {}),
          ...(!callSheetId && shootingDayId ? { shootingDayId } : {}),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        notify(data.error ?? "PDF export failed", "error");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "systemlix-call-sheet.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
      notify("PDF downloaded.");
    } catch {
      notify("Network error during PDF export", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const sortedSheets = useMemo(
    () => [...callSheets].sort((a, b) => b.version - a.version),
    [callSheets]
  );

  if (!isProjectReady) {
    return (
      <EmptyState
        icon={FileText}
        title="No active project"
        description="Select a project to manage call sheets."
      />
    );
  }

  if (isDeptView && user?.id) {
    const deptLabel = activeProjectMembership?.department ?? "Reparto";
    return (
      <div className="space-y-6">
        <PageHeader
          title="Call sheet ricevute"
          description={`Conferma la presa visione delle call sheet inviate al reparto ${deptLabel}.`}
        />

        <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3">
          {(
            [
              ["received", "Call sheet ricevute"],
              ["history", "Storico"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setDeptTab(key)}
              className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] transition-colors ${
                deptTab === key
                  ? "bg-white/[0.06] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <CallSheetInbox
          projectId={projectId!}
          userId={user.id}
          memberDepartment={activeProjectMembership?.department}
          callSheets={callSheets}
          distributions={callSheetDistributions}
          recipients={callSheetRecipients}
          onAcknowledged={refreshCallSheetDistribution}
          variant="page"
          filter={deptTab === "history" ? "history" : "all"}
          canExportPdf={canExportPdf}
          onExportPdf={exportPdfById}
          onNotify={notify}
        />

        <Toast
          message={toast ?? ""}
          open={!!toast}
          onClose={() => setToast(null)}
          variant={toastVariant}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call Sheet Generator"
        description="Create, approve, distribute and track call sheet acknowledgements"
      />

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3">
        {(
          [
            ["generator", "Generator"],
            ["library", "Library"],
            ...(canReceipts ? [["receipts", "Read receipts"] as const] : []),
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] transition-colors ${
              tab === key
                ? "bg-white/[0.06] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "generator" && (
        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)] items-start">
          <div className="space-y-4 lg:sticky lg:top-20">
            <PremiumCard padding="md">
              <Select
                label="Shooting day"
                value={effectiveDayId}
                onChange={(e) => setSelectedDayId(e.target.value)}
                options={
                  shootingDays.length
                    ? shootingDays.map((d) => ({
                        value: d.id,
                        label: `${d.day_number} — ${new Date(d.date).toLocaleDateString("it-IT")}`,
                      }))
                    : [{ value: "", label: "No shooting days" }]
                }
              />
              {preview && (
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <CallSheetStatusBadge status={preview.status} />
                  <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                    v{preview.version}
                    {preview.updated_at
                      ? ` · updated ${new Date(preview.updated_at).toLocaleString("it-IT")}`
                      : ""}
                  </p>
                </div>
              )}
            </PremiumCard>

            {sentWarning && (
              <PremiumCard
                padding="md"
                className="border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.03)]"
              >
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  This call sheet has already been sent. Create a new version before making
                  changes.
                </p>
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={createNewVersionFromSent}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New version
                </Button>
              </PremiumCard>
            )}

            <PremiumCard padding="md" className="space-y-2">
              <Button
                onClick={generateCallSheet}
                disabled={!canEditProject || !effectiveDayId || sentWarning}
                className="w-full"
                size="sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate call sheet
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveVersion}
                disabled={!preview || !canEditProject || sentWarning}
                className="w-full"
                size="sm"
              >
                <Save className="h-3.5 w-3.5" />
                Save version
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={isExporting || (!preview && !effectiveDayId)}
                className="w-full"
                size="sm"
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? "Exporting…" : "Export PDF"}
              </Button>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="subtle"
                  size="sm"
                  disabled={!preview || !canEditProject || sentWarning}
                  onClick={() => updateWorkflowStatus("ready_for_approval")}
                >
                  Ready
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  disabled={!preview || !canEditProject || sentWarning}
                  onClick={() => updateWorkflowStatus("approved")}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </Button>
              </div>
              {canSend && (
                <Button
                  className="w-full"
                  size="sm"
                  disabled={
                    !previewIsSaved ||
                    (preview?.status !== "approved" && preview?.status !== "sent")
                  }
                  onClick={() => setSendOpen(true)}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send call sheet
                </Button>
              )}
            </PremiumCard>
          </div>

          <div>
            {preview ? (
              <CallSheetPreview callSheet={preview} />
            ) : (
              <EmptyState
                icon={FileText}
                title="No call sheet generated"
                description={
                  shootingDays.length === 0
                    ? "Create a shooting day to generate a call sheet."
                    : "Select a shooting day and click Generate call sheet."
                }
              />
            )}
          </div>
        </div>
      )}

      {tab === "library" && (
        <div className="space-y-3">
          {sortedSheets.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No saved call sheets"
              description="Generated call sheets appear here with version and status."
            />
          ) : (
            sortedSheets.map((sheet) => (
              <PremiumCard
                key={sheet.id}
                padding="md"
                hover
                className="cursor-pointer"
                onClick={() => {
                  setLocalPreview(sheet);
                  setActiveCallSheet(sheet);
                  setTab("generator");
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">
                      Day {sheet.day_number} · {sheet.location}
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                      {new Date(sheet.date).toLocaleDateString("it-IT")} · v{sheet.version}
                    </p>
                  </div>
                  <CallSheetStatusBadge status={sheet.status} />
                </div>
              </PremiumCard>
            ))
          )}
        </div>
      )}

      {tab === "receipts" && canReceipts && (
        <ReadReceiptsPanel
          callSheets={callSheets}
          distributions={callSheetDistributions}
          recipients={callSheetRecipients}
        />
      )}

      {project && user && (
        <SendCallSheetModal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          callSheet={preview}
          project={project}
          projectMembers={activeProjectTeamMembers}
          onSend={handleSend}
        />
      )}

      <Toast
        message={toast ?? ""}
        open={!!toast}
        onClose={() => setToast(null)}
        variant={toastVariant}
      />
    </div>
  );
}
