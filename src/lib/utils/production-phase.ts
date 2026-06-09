import type { Project, ProjectStatus, ShootingDay } from "@/lib/types";

export type ProductionPhase =
  | "active"
  | "pre_production"
  | "shooting"
  | "wrapped"
  | "archived";

export const PRODUCTION_PHASE_LABELS: Record<ProductionPhase, string> = {
  active: "Active",
  pre_production: "Pre-production",
  shooting: "Shooting",
  wrapped: "Wrapped",
  archived: "Archived",
};

export const PRODUCTION_PHASE_VARIANTS: Record<
  ProductionPhase,
  "active" | "paused" | "cyan" | "violet" | "archived"
> = {
  active: "active",
  pre_production: "violet",
  shooting: "cyan",
  wrapped: "paused",
  archived: "archived",
};

export function deriveProductionPhase(
  project: Project,
  shootingDays: ShootingDay[]
): ProductionPhase {
  const status: ProjectStatus = project.status;

  if (status === "archived" || status === "locked") {
    return "archived";
  }

  if (status === "paused") {
    return "wrapped";
  }

  const today = new Date().toISOString().split("T")[0];
  const sorted = [...shootingDays].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return "pre_production";
  }

  const hasUpcoming = sorted.some((day) => day.date >= today);
  const hasPast = sorted.some((day) => day.date < today);

  if (hasUpcoming) {
    return "shooting";
  }

  if (hasPast) {
    return "wrapped";
  }

  return "active";
}

export function getNextShootingDay(
  shootingDays: ShootingDay[]
): ShootingDay | null {
  if (shootingDays.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const upcoming = [...shootingDays]
    .filter((day) => day.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (upcoming.length > 0) return upcoming[0];

  return [...shootingDays].sort((a, b) => b.date.localeCompare(a.date))[0];
}
