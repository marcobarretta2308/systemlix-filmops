import type { ProductionPackSectionId } from "@/lib/production-pack/types";

export function dash(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function joinList(items: string[], max = 6): string {
  if (!items.length) return "—";
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")} (+${items.length - max} more)`;
}

export type ProductionPackPdfData = {
  brand: string;
  projectTitle: string;
  companyName: string;
  workspaceName: string;
  generatedAt: string;
  snapshot: {
    sceneCount: number;
    locationCount: number;
    callSheetCount: number;
    documentCount: number;
    reportCount: number;
    shootingDayCount: number;
  };
  includedSections: ProductionPackSectionId[];
  toc: Array<{ id: string; title: string }>;
  overview?: {
    status: string;
    createdAt: string;
    sceneCount: number;
    locationCount: number;
    callSheetCount: number;
    documentCount: number;
    reportCount: number;
    operationalSummary: string;
  };
  scenes?: Array<{
    sceneNumber: string;
    intExt: string;
    dayNight: string;
    location: string;
    summary: string;
    characters: string;
    elements: string;
    notes: string;
  }>;
  cast?: Array<{
    character: string;
    actor: string;
    sceneCount: number;
    notes: string;
  }>;
  locations?: Array<{
    name: string;
    status: string;
    permitStatus: string;
    linkedScenes: string;
    address: string;
    warning: string;
  }>;
  shootingDays?: Array<{
    label: string;
    date: string;
    plannedScenes: string;
    location: string;
    notes: string;
    linkedCallSheet: string;
  }>;
  callSheets?: Array<{
    label: string;
    date: string;
    status: string;
    crewCall: string;
    firstShot: string;
    wrap: string;
    sceneCount: number;
    linkedPdf: string;
    warnings: string;
  }>;
  documents?: Array<{
    fileName: string;
    category: string;
    department: string;
    uploadedAt: string;
    notes: string;
  }>;
  reports?: Array<{
    label: string;
    status: string;
    scenesCompleted: string;
    issues: string;
    departmentNotes: string;
    approval: string;
  }>;
  departmentNotes?: Array<{
    department: string;
    reportLabel: string;
    notes: string;
  }>;
  intelligence?: {
    healthScore: number;
    critical: string[];
    warnings: string[];
    info: string[];
    suggestedActions: string[];
  };
};

export function productionPackFilename(projectTitle: string): string {
  const slug =
    projectTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project";
  const date = new Date().toISOString().slice(0, 10);
  return `systemlix-production-pack-${slug}-${date}.pdf`;
}
