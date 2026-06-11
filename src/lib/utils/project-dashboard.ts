import type { ProjectRole } from "@/lib/types";
import type { ProjectPermissions } from "@/lib/permissions/project-permissions";

export type DashboardViewMode = "full" | "department" | "readonly";

export function getDashboardViewMode(
  projectRole: ProjectRole | null,
  isDepartmentDashboard: boolean
): DashboardViewMode {
  if (isDepartmentDashboard) return "department";
  if (!projectRole || projectRole === "viewer" || projectRole === "cast_crew_user") {
    return "readonly";
  }
  return "full";
}

export interface ModuleCardDef {
  key: string;
  label: string;
  href: string;
  count: number;
  emptyTitle: string;
  emptyDescription: string;
  visible: boolean;
}

export function buildModuleCards(
  projectId: string,
  counts: {
    scenes: number;
    castCrew: number;
    locations: number;
    shootingDays: number;
    callSheets: number;
    productionReports: number;
    documents: number;
  },
  permissions: ProjectPermissions,
  options: {
    canArchive: boolean;
    viewMode: DashboardViewMode;
  }
): ModuleCardDef[] {
  const base = `/projects/${projectId}`;
  const { viewMode, canArchive } = options;

  const cards: ModuleCardDef[] = [
    {
      key: "breakdown",
      label: "Script Breakdown",
      href: `${base}/script-breakdown`,
      count: counts.scenes,
      emptyTitle: "No scenes generated yet",
      emptyDescription:
        "Upload or paste a script to start the AI breakdown.",
      visible: permissions.can_view_breakdown,
    },
    {
      key: "scenes",
      label: "Scenes",
      href: `${base}/scenes`,
      count: counts.scenes,
      emptyTitle: "No scenes saved yet",
      emptyDescription:
        "Run Script Breakdown AI or add scenes manually to build your script database.",
      visible: permissions.can_view_scenes,
    },
    {
      key: "cast",
      label: "Cast & Crew",
      href: `${base}/cast-crew`,
      count: counts.castCrew,
      emptyTitle: "No cast or crew listed yet",
      emptyDescription:
        "Add talent, department heads and crew to coordinate calls and access.",
      visible: permissions.can_view_cast_crew,
    },
    {
      key: "locations",
      label: "Locations",
      href: `${base}/locations`,
      count: counts.locations,
      emptyTitle: "No locations added yet",
      emptyDescription:
        "Document sets, addresses and access notes before scheduling shoot days.",
      visible: permissions.can_view_locations,
    },
    {
      key: "days",
      label: "Shooting Days",
      href: `${base}/shooting-days`,
      count: counts.shootingDays,
      emptyTitle: "No shooting days planned yet",
      emptyDescription:
        "Create your first shooting day to generate a call sheet.",
      visible: permissions.can_view_shooting_days,
    },
    {
      key: "callsheets",
      label: "Call Sheets",
      href: `${base}/call-sheets`,
      count: counts.callSheets,
      emptyTitle: "No call sheets created yet",
      emptyDescription:
        "Plan a shooting day, then generate and export your first call sheet.",
      visible: permissions.can_view_call_sheets,
    },
    {
      key: "production-reports",
      label: "Production Reports",
      href: `${base}/production-reports`,
      count: counts.productionReports,
      emptyTitle: "No wrap reports yet",
      emptyDescription:
        "Document end-of-day timings, scene status and issues after each shoot.",
      visible: permissions.can_view_production_reports,
    },
    {
      key: "intelligence",
      label: "Production Intelligence",
      href: `${base}/production-intelligence`,
      count: 0,
      emptyTitle: "AI production checks",
      emptyDescription:
        "Run health checks, analyze call sheets and search project data.",
      visible:
        permissions.can_view_set_assistant || permissions.can_view_call_sheets,
    },
    {
      key: "production-pack",
      label: "Production Pack",
      href: `${base}/production-pack`,
      count: 0,
      emptyTitle: "One-click PDF export",
      emptyDescription:
        "Generate a production-ready PDF package from your project data.",
      visible:
        permissions.can_view_call_sheets ||
        permissions.can_view_scenes ||
        permissions.can_view_production_reports,
    },
    {
      key: "assistant",
      label: "Set Assistant",
      href: `${base}/set-assistant`,
      count: 0,
      emptyTitle: "Set Assistant ready",
      emptyDescription:
        "Ask production questions grounded in your project data.",
      visible: permissions.can_view_set_assistant,
    },
    {
      key: "documents",
      label: "Documents",
      href: `${base}/documents`,
      count: counts.documents,
      emptyTitle: "No documents uploaded yet",
      emptyDescription:
        "Upload scripts, production plans, department files or call sheets to centralize documentation.",
      visible: true,
    },
  ];

  if (viewMode === "full" && canArchive) {
    cards.push({
      key: "archive",
      label: "Archive / Project Lock",
      href: `${base}/archive`,
      count: 0,
      emptyTitle: "Project lifecycle controls",
      emptyDescription:
        "Archive, lock or export project data when production wraps.",
      visible: true,
    });
  }

  return cards.filter((c) => c.visible);
}
