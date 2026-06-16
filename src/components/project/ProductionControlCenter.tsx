"use client";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModuleNavGrid } from "@/components/project/ModuleNavGrid";
import { ProjectFilmSettings } from "@/components/project/ProjectFilmSettings";
import { ProductionEmptyInsights } from "@/components/project/ProductionEmptyInsights";
import { ProductionPhaseBadge } from "@/components/project/ProductionPhaseBadge";
import { ProjectSetupChecklist } from "@/components/project/ProjectSetupChecklist";
import { QuickActionsBar } from "@/components/project/QuickActionsBar";
import { canSendCallSheet } from "@/lib/call-sheets/permissions";
import { normalizeCallSheetStatus } from "@/lib/call-sheets/constants";
import { PRODUCTION_REPORT_STATUS_LABELS } from "@/lib/production-reports/constants";
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import {
  canUploadDocuments,
  canViewDocuments,
  filterVisibleDocuments,
} from "@/lib/documents/permissions";
import { PROJECT_ROLE_LABELS } from "@/lib/permissions";
import type { Project } from "@/lib/types";
import {
  buildModuleCards,
  getDashboardViewMode,
} from "@/lib/utils/project-dashboard";
import {
  deriveProductionPhase,
  getNextShootingDay,
} from "@/lib/utils/production-phase";
import { computeProjectSetupChecklist } from "@/lib/utils/project-setup-checklist";
import {
  Calendar,
  Clapperboard,
  ClipboardList,
  FileText,
  FolderOpen,
  Loader2,
  MapPin,
  Send,
  Users,
} from "lucide-react";
import Link from "next/link";

interface ProductionControlCenterProps {
  project: Project;
  projectId: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShootDay(date: string, dayNumber?: string) {
  const formatted = new Date(date).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return dayNumber ? `Day ${dayNumber} · ${formatted}` : formatted;
}

export function ProductionControlCenter({
  project,
  projectId,
}: ProductionControlCenterProps) {
  const { activeCompany, activeWorkspace, companyRole } = useCompany();
  const { isPlatformOwner, user } = useAuth();
  const {
    scenes,
    castCrew,
    locations,
    shootingDays,
    callSheets,
    productionReports,
    callSheetDistributions,
    callSheetRecipients,
    documents,
    breakdownScenes,
    projectRole,
    projectPermissions,
    isDepartmentDashboard,
    canArchiveProject,
    canManageAccess,
    canEditProject,
    isLoadingProjectData,
    activeProjectTeamMembers,
    activeProjectMembership,
  } = useProject();

  const viewMode = getDashboardViewMode(projectRole, isDepartmentDashboard);
  const phase = deriveProductionPhase(project, shootingDays);
  const nextDay = getNextShootingDay(shootingDays);
  const nextDayLocation = nextDay
    ? locations.find((l) => l.id === nextDay.location_id)
    : null;

  const visibleDocuments = filterVisibleDocuments(
    documents,
    user,
    companyRole,
    activeProjectMembership,
    projectRole
  );
  const showDocuments = canViewDocuments(user, companyRole, projectRole);
  const allowDocumentUpload = canUploadDocuments(
    project,
    user,
    companyRole,
    projectRole
  );

  const setup = computeProjectSetupChecklist({
    hasProduction: Boolean(activeCompany),
    hasProject: true,
    breakdownScenesCount: breakdownScenes.length,
    scenesCount: scenes.length,
    castCrewCount: castCrew.length,
    locationsCount: locations.length,
    shootingDaysCount: shootingDays.length,
    callSheetsCount: callSheets.length,
    documentsCount: visibleDocuments.length,
    projectTeamMembers: activeProjectTeamMembers,
  });

  const modules = buildModuleCards(
    projectId,
    {
      scenes: scenes.length,
      castCrew: castCrew.length,
      locations: locations.length,
      shootingDays: shootingDays.length,
      callSheets: callSheets.length,
      productionReports: productionReports.length,
      documents: visibleDocuments.length,
    },
    projectPermissions,
    { canArchive: canArchiveProject, viewMode }
  ).filter((mod) => mod.key !== "documents" || showDocuments);

  const departmentLabel = activeProjectMembership?.department ?? "Department";

  const sentDistributions = callSheetDistributions.filter((d) => d.sent_at);
  const pendingAcknowledgements = callSheetRecipients.filter(
    (r) => !r.acknowledged_at
  ).length;
  const latestSentDistribution = [...sentDistributions].sort(
    (a, b) =>
      new Date(b.sent_at ?? 0).getTime() - new Date(a.sent_at ?? 0).getTime()
  )[0];
  const latestSentSheet = latestSentDistribution
    ? callSheets.find((s) => s.id === latestSentDistribution.call_sheet_id)
    : null;
  const latestSendableSheet = [...callSheets]
    .filter((s) => {
      const status = normalizeCallSheetStatus(s.status);
      return status === "approved" || status === "sent";
    })
    .sort((a, b) => b.version - a.version)[0];
  const allowSendCallSheet = canSendCallSheet(
    project,
    user,
    companyRole,
    projectRole
  );

  const latestReport = [...productionReports].sort(
    (a, b) =>
      new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
  )[0];
  const pendingReports = productionReports.filter(
    (r) => r.status === "draft" || r.status === "submitted"
  ).length;

  if (isLoadingProjectData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          <p className="text-[13px] text-[var(--text-muted)]">
            Loading production data…
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === "department") {
    return (
      <div className="space-y-8">
        <PageHeader
          breadcrumb={
            <Breadcrumb
              items={[
                { label: activeCompany?.name ?? "Production", href: "/dashboard" },
                { label: project.title },
              ]}
            />
          }
          title={`${departmentLabel} overview`}
          description={`Production control for ${project.title}`}
          badge={<ProductionPhaseBadge phase={phase} />}
        />

        <div className="grid gap-[var(--card-gap)] grid-cols-2 lg:grid-cols-4">
          {projectPermissions.can_view_scenes && (
            <StatCard
              label="Scenes"
              value={scenes.length}
              icon={FileText}
              href={`/projects/${projectId}/scenes`}
            />
          )}
          {projectPermissions.can_view_shooting_days && (
            <StatCard
              label="Shooting days"
              value={shootingDays.length}
              icon={Calendar}
              href={`/projects/${projectId}/shooting-days`}
            />
          )}
          {projectPermissions.can_view_call_sheets && (
            <StatCard
              label="Call sheets"
              value={callSheets.length}
              icon={FileText}
              href={`/projects/${projectId}/call-sheets`}
            />
          )}
          {projectPermissions.can_view_production_reports && (
            <StatCard
              label="Wrap reports"
              value={productionReports.length}
              icon={ClipboardList}
              href={`/projects/${projectId}/production-reports`}
            />
          )}
        </div>

        {nextDay && projectPermissions.can_view_shooting_days && (
          <PremiumCard padding="md">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Next shooting day
            </p>
            <p className="mt-1.5 text-[14px] text-[var(--text-primary)]">
              {formatShootDay(nextDay.date, nextDay.day_number)}
            </p>
            {nextDayLocation && (
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                {nextDayLocation.name}
              </p>
            )}
          </PremiumCard>
        )}

        <ProjectSetupChecklist setup={setup} compact />
        <QuickActionsBar
          projectId={projectId}
          permissions={projectPermissions}
          viewMode={viewMode}
          canManageAccess={false}
          canUploadDocuments={allowDocumentUpload}
          canSendCallSheet={allowSendCallSheet}
          latestSendableSheetId={latestSendableSheet?.id}
        />
        <ModuleNavGrid modules={modules} title="Your tools" />
        <ProductionEmptyInsights modules={modules} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: activeCompany?.name ?? "Production", href: "/dashboard" },
              { label: activeWorkspace?.name ?? "Workspace", href: "/workspaces" },
              { label: project.title },
            ]}
          />
        }
        title={project.title}
        description={
          project.description ||
          `${activeCompany?.name ?? "Production"} · ${project.production_type}`
        }
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <ProductionPhaseBadge phase={phase} />
            <StatusBadge status={project.status} />
          </div>
        }
        actions={
          viewMode === "full" ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${projectId}/script-breakdown`}>
                <span className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-[var(--accent-cyan)] px-3 text-[12px] font-medium text-[#041016]">
                  Open tools
                </span>
              </Link>
              {canArchiveProject && (
                <Link href={`/projects/${projectId}/archive`}>
                  <span className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] px-3 text-[12px] text-[var(--text-secondary)] hover:bg-white/[0.03]">
                    Archive / Lock
                  </span>
                </Link>
              )}
            </div>
          ) : undefined
        }
      />

      {viewMode === "full" && <ProjectFilmSettings project={project} />}

      {/* Hero metrics */}
      <div className="grid gap-[var(--card-gap)] lg:grid-cols-3">
        <PremiumCard padding="md" variant="elevated" className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Production Control Center
              </p>
              <p className="mt-2 text-[18px] font-medium text-[var(--text-primary)] tracking-tight">
                {activeCompany?.name ?? "—"}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                {project.production_type}
                {projectRole ? ` · ${PROJECT_ROLE_LABELS[projectRole]}` : ""}
                {isPlatformOwner ? " · Platform Owner" : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Last updated
              </p>
              <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
                {project.updated_at
                  ? formatDateTime(project.updated_at)
                  : "—"}
              </p>
            </div>
          </div>

          {nextDay ? (
            <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Next shooting day
              </p>
              <p className="mt-1 text-[14px] text-[var(--text-primary)]">
                {formatShootDay(nextDay.date, nextDay.day_number)}
              </p>
              {nextDayLocation && (
                <p className="mt-0.5 text-[12px] text-[var(--text-muted)] flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {nextDayLocation.name}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-5 text-[12px] text-[var(--text-muted)]">
              No shooting days planned yet. Create your first shooting day to
              generate a call sheet.
            </p>
          )}

          {latestReport && projectPermissions.can_view_production_reports && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Latest production report
              </p>
              <p className="mt-1 text-[14px] text-[var(--text-primary)]">
                {latestReport.title ?? formatShootDay(latestReport.report_date)}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                {PRODUCTION_REPORT_STATUS_LABELS[latestReport.status]}
                {pendingReports > 0
                  ? ` · ${pendingReports} pending`
                  : ""}
              </p>
              <Link
                href={`/projects/${projectId}/production-reports?report=${latestReport.id}`}
                className="mt-2 inline-block text-[12px] text-[var(--accent-cyan)] hover:underline"
              >
                View report
              </Link>
            </div>
          )}

          {latestSentSheet && latestSentDistribution && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Latest sent call sheet
              </p>
              <p className="mt-1 text-[14px] text-[var(--text-primary)]">
                Day {latestSentSheet.day_number} · v{latestSentDistribution.version_number}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                Sent {formatDateTime(latestSentDistribution.sent_at!)}
                {pendingAcknowledgements > 0
                  ? ` · ${pendingAcknowledgements} pending acknowledgement${pendingAcknowledgements === 1 ? "" : "s"}`
                  : ""}
              </p>
              <Link
                href={`/projects/${projectId}/call-sheets?sheet=${latestSentSheet.id}`}
                className="mt-2 inline-block text-[12px] text-[var(--accent-cyan)] hover:underline"
              >
                View call sheet
              </Link>
            </div>
          )}
        </PremiumCard>

        <PremiumCard padding="md" variant="elevated">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Project setup
          </p>
          <p className="mt-2 text-3xl font-medium text-[var(--text-primary)] tabular-nums">
            {setup.percent}%
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">complete</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
            <div
              className="h-full rounded-full bg-[var(--accent-cyan)]"
              style={{ width: `${setup.percent}%` }}
            />
          </div>
        </PremiumCard>
      </div>

      {/* KPI row */}
      <div className="grid gap-[var(--card-gap)] grid-cols-2 lg:grid-cols-5">
        {projectPermissions.can_view_scenes && (
          <StatCard label="Scenes" value={scenes.length} icon={FileText} href={`/projects/${projectId}/scenes`} />
        )}
        {projectPermissions.can_view_call_sheets && (
          <StatCard label="Call sheets" value={callSheets.length} icon={FileText} href={`/projects/${projectId}/call-sheets`} />
        )}
        {projectPermissions.can_view_production_reports && (
          <StatCard
            label="Wrap reports"
            value={productionReports.length}
            icon={ClipboardList}
            href={`/projects/${projectId}/production-reports`}
          />
        )}
        {projectPermissions.can_view_production_reports && pendingReports > 0 && (
          <StatCard
            label="Pending reports"
            value={pendingReports}
            icon={ClipboardList}
            href={`/projects/${projectId}/production-reports`}
          />
        )}
        {projectPermissions.can_view_call_sheets && sentDistributions.length > 0 && (
          <StatCard
            label="Sent"
            value={sentDistributions.length}
            icon={Send}
            href={`/projects/${projectId}/call-sheets`}
          />
        )}
        {projectPermissions.can_view_call_sheets && pendingAcknowledgements > 0 && (
          <StatCard
            label="Pending ack"
            value={pendingAcknowledgements}
            icon={FileText}
            href={`/projects/${projectId}/call-sheets`}
          />
        )}
        {projectPermissions.can_view_cast_crew && (
          <StatCard label="Cast & crew" value={castCrew.length} icon={Users} href={`/projects/${projectId}/cast-crew`} />
        )}
        {projectPermissions.can_view_locations && (
          <StatCard label="Locations" value={locations.length} icon={MapPin} href={`/projects/${projectId}/locations`} />
        )}
        {projectPermissions.can_view_shooting_days && (
          <StatCard label="Shoot days" value={shootingDays.length} icon={Calendar} href={`/projects/${projectId}/shooting-days`} />
        )}
        {showDocuments && (
          <StatCard
            label="Documents"
            value={visibleDocuments.length}
            icon={FolderOpen}
            href={`/projects/${projectId}/documents`}
          />
        )}
      </div>

      {viewMode === "full" && <ProjectSetupChecklist setup={setup} />}

      <QuickActionsBar
        projectId={projectId}
        permissions={projectPermissions}
        viewMode={viewMode}
        canManageAccess={canManageAccess}
        canUploadDocuments={allowDocumentUpload}
        canSendCallSheet={allowSendCallSheet}
        latestSendableSheetId={latestSendableSheet?.id}
      />

      <ModuleNavGrid modules={modules} />

      {viewMode === "full" && (
        <ProductionEmptyInsights modules={modules} />
      )}

      {viewMode === "readonly" && scenes.length === 0 && (
        <EmptyState
          icon={Clapperboard}
          title="Limited project view"
          description="You have read-only access. Production data will appear here as the team publishes scenes, schedules and call sheets."
        />
      )}

      {!canEditProject && viewMode !== "readonly" && (
        <p className="text-[12px] text-[var(--text-muted)]">
          View-only or restricted mode — editing is not available for your role
          or current project status.
        </p>
      )}
    </div>
  );
}
