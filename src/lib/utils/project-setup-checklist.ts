import type { ProjectMember } from "@/lib/types";

export interface ChecklistItem {
  id: string;
  label: string;
  complete: boolean;
  description?: string;
}

export interface ProjectSetupState {
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  percent: number;
}

export interface ProjectSetupInput {
  hasProduction: boolean;
  hasProject: boolean;
  breakdownScenesCount: number;
  scenesCount: number;
  castCrewCount: number;
  locationsCount: number;
  shootingDaysCount: number;
  callSheetsCount: number;
  documentsCount: number;
  projectTeamMembers: ProjectMember[];
}

export function computeProjectSetupChecklist(
  input: ProjectSetupInput
): ProjectSetupState {
  const activeMembers = input.projectTeamMembers.filter(
    (m) => m.access_status === "active"
  );
  const hasBreakdown =
    input.breakdownScenesCount > 0 || input.scenesCount > 0;
  const teamInvited = activeMembers.length >= 2;
  const accessVerified =
    input.projectTeamMembers.length > 0 &&
    input.projectTeamMembers.every((m) => m.access_status === "active");

  const items: ChecklistItem[] = [
    {
      id: "production",
      label: "Production created",
      complete: input.hasProduction,
      description: "Company / production workspace configured",
    },
    {
      id: "project",
      label: "Project created",
      complete: input.hasProject,
      description: "FilmOps project record active",
    },
    {
      id: "breakdown",
      label: "Script breakdown generated",
      complete: hasBreakdown,
      description: "AI script breakdown run or scenes imported",
    },
    {
      id: "scenes",
      label: "Scenes saved",
      complete: input.scenesCount > 0,
      description: "Scene database populated",
    },
    {
      id: "cast",
      label: "Cast & crew added",
      complete: input.castCrewCount > 0,
      description: "Talent and crew listed on project",
    },
    {
      id: "locations",
      label: "Locations added",
      complete: input.locationsCount > 0,
      description: "Shooting locations documented",
    },
    {
      id: "days",
      label: "Shooting days planned",
      complete: input.shootingDaysCount > 0,
      description: "Production schedule with shoot days",
    },
    {
      id: "callsheet",
      label: "First call sheet generated",
      complete: input.callSheetsCount > 0,
      description: "At least one call sheet saved",
    },
    {
      id: "documents",
      label: "Documents uploaded",
      complete: input.documentsCount > 0,
      description: "Production files stored in project vault",
    },
    {
      id: "team",
      label: "Team members invited",
      complete: teamInvited,
      description: "Multiple platform users assigned to project",
    },
    {
      id: "access",
      label: "Project access verified",
      complete: accessVerified,
      description: "All assigned members have active access",
    },
  ];

  const completedCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;
  const percent = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  return { items, completedCount, totalCount, percent };
}
