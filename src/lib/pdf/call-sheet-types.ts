import type { CallSheetStatus, CastCrewStatus, Complexity } from "@/lib/types";

export type CallSheetPdfSceneRow = {
  scene_number: string;
  int_ext: string;
  day_night: string;
  location: string;
  short_description: string;
  characters: string;
  props: string;
  complexity: string;
};

export type CallSheetPdfCastRow = {
  name: string;
  role: string;
  department: string;
  call_time: string;
  status: string;
};

export type CallSheetPdfScheduleRow = {
  label: string;
  time: string;
};

export type CallSheetPdfEmergencyContact = {
  name: string;
  role: string;
  phone: string;
};

export type CallSheetPdfData = {
  projectTitle: string;
  productionTitle: string;
  productionType: string;
  version: number;
  statusLabel: string;
  generatedAt: string;
  dayNumber: string;
  date: string;
  locationName: string;
  locationAddress: string;
  mapsLink: string;
  parkingNotes: string;
  accessNotes: string;
  locationProductionNotes: string;
  schedule: CallSheetPdfScheduleRow[];
  scenes: CallSheetPdfSceneRow[];
  castCrew: CallSheetPdfCastRow[];
  transportNotes: string;
  productionNotes: string;
  emergencyContacts: CallSheetPdfEmergencyContact[];
};

export const CALL_SHEET_STATUS_LABELS: Record<CallSheetStatus, string> = {
  draft: "Bozza",
  final: "Finale",
  locked: "Bloccato",
  archived: "Archiviato",
};

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
  very_high: "Molto alta",
};

export const CAST_STATUS_LABELS: Record<CastCrewStatus, string> = {
  confirmed: "Confermato",
  pending: "In attesa",
  issue: "Problema",
};

export function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text || "—";
}

export function slugifyFilenamePart(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "progetto"
  );
}

export function buildCallSheetFilename(data: CallSheetPdfData): string {
  const project = slugifyFilenamePart(data.projectTitle);
  const day = slugifyFilenamePart(data.dayNumber);
  return `systemlix-call-sheet-${project}-${day}-v${data.version}.pdf`;
}

export function formatPdfDate(dateIso: string): string {
  if (!dateIso) return "—";
  try {
    return new Date(dateIso).toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateIso;
  }
}

export function formatGeneratedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
