import type { ProductionPackPdfData } from "@/lib/pdf/production-pack-types";
import {
  formatProductionPackGeneratedAt,
  safeCount,
  safeScore,
  safeText,
} from "@/lib/pdf/pdf-safe";

function safeStringList(items: unknown, maxItems = 50): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, maxItems)
    .map((item) => safeText(item, "—", 500))
    .filter(Boolean);
}

export function sanitizeProductionPackData(
  data: ProductionPackPdfData
): ProductionPackPdfData {
  const sanitized: ProductionPackPdfData = {
    brand: safeText(data.brand, "FilmOps", 120),
    projectTitle: safeText(data.projectTitle, "Untitled Project", 300),
    companyName: safeText(data.companyName),
    workspaceName: safeText(data.workspaceName),
    generatedAt: formatProductionPackGeneratedAt(data.generatedAt),
    snapshot: {
      sceneCount: safeCount(data.snapshot?.sceneCount),
      locationCount: safeCount(data.snapshot?.locationCount),
      callSheetCount: safeCount(data.snapshot?.callSheetCount),
      documentCount: safeCount(data.snapshot?.documentCount),
      reportCount: safeCount(data.snapshot?.reportCount),
      shootingDayCount: safeCount(data.snapshot?.shootingDayCount),
    },
    includedSections: Array.isArray(data.includedSections)
      ? data.includedSections
      : [],
    toc: Array.isArray(data.toc)
      ? data.toc.map((item) => ({
          id: safeText(item?.id, "section", 40),
          title: safeText(item?.title, "Section", 200),
        }))
      : [],
  };

  if (data.overview) {
    sanitized.overview = {
      status: safeText(data.overview.status),
      createdAt: safeText(data.overview.createdAt),
      sceneCount: safeCount(data.overview.sceneCount),
      locationCount: safeCount(data.overview.locationCount),
      callSheetCount: safeCount(data.overview.callSheetCount),
      documentCount: safeCount(data.overview.documentCount),
      reportCount: safeCount(data.overview.reportCount),
      operationalSummary: safeText(data.overview.operationalSummary, "—", 1500),
    };
  }

  if (data.scenes) {
    sanitized.scenes = data.scenes.slice(0, 500).map((s) => ({
      sceneNumber: safeText(s.sceneNumber, "—", 40),
      intExt: safeText(s.intExt),
      dayNight: safeText(s.dayNight),
      location: safeText(s.location, "—", 300),
      summary: safeText(s.summary, "—", 800),
      characters: safeText(s.characters, "—", 500),
      elements: safeText(s.elements, "—", 500),
      notes: safeText(s.notes, "—", 500),
    }));
  }

  if (data.cast) {
    sanitized.cast = data.cast.slice(0, 300).map((c) => ({
      character: safeText(c.character, "—", 120),
      actor: safeText(c.actor),
      sceneCount: safeCount(c.sceneCount),
      notes: safeText(c.notes),
    }));
  }

  if (data.locations) {
    sanitized.locations = data.locations.slice(0, 200).map((l) => ({
      name: safeText(l.name, "—", 200),
      status: safeText(l.status),
      permitStatus: safeText(l.permitStatus),
      linkedScenes: safeText(l.linkedScenes, "—", 400),
      address: safeText(l.address, "—", 400),
      warning: safeText(l.warning),
    }));
  }

  if (data.shootingDays) {
    sanitized.shootingDays = data.shootingDays.slice(0, 200).map((d) => ({
      label: safeText(d.label, "—", 80),
      date: safeText(d.date),
      plannedScenes: safeText(d.plannedScenes, "—", 400),
      location: safeText(d.location, "—", 200),
      notes: safeText(d.notes, "—", 500),
      linkedCallSheet: safeText(d.linkedCallSheet),
    }));
  }

  if (data.callSheets) {
    sanitized.callSheets = data.callSheets.slice(0, 200).map((s) => ({
      label: safeText(s.label, "—", 120),
      date: safeText(s.date),
      status: safeText(s.status),
      crewCall: safeText(s.crewCall),
      firstShot: safeText(s.firstShot),
      wrap: safeText(s.wrap),
      sceneCount: safeCount(s.sceneCount),
      linkedPdf: safeText(s.linkedPdf, "—", 300),
      warnings: safeText(s.warnings, "—", 500),
    }));
  }

  if (data.documents) {
    sanitized.documents = data.documents.slice(0, 300).map((d) => ({
      fileName: safeText(d.fileName, "—", 200),
      category: safeText(d.category),
      department: safeText(d.department),
      uploadedAt: safeText(d.uploadedAt),
      notes: safeText(d.notes, "—", 300),
    }));
  }

  if (data.reports) {
    sanitized.reports = data.reports.slice(0, 200).map((r) => ({
      label: safeText(r.label, "—", 200),
      status: safeText(r.status),
      scenesCompleted: safeText(r.scenesCompleted),
      issues: safeText(r.issues, "—", 500),
      departmentNotes: safeText(r.departmentNotes, "—", 400),
      approval: safeText(r.approval),
    }));
  }

  if (data.departmentNotes) {
    sanitized.departmentNotes = data.departmentNotes.slice(0, 300).map((n) => ({
      department: safeText(n.department, "—", 80),
      reportLabel: safeText(n.reportLabel, "—", 200),
      notes: safeText(n.notes, "—", 800),
    }));
  }

  if (data.intelligence) {
    sanitized.intelligence = {
      healthScore: safeScore(data.intelligence.healthScore),
      critical: safeStringList(data.intelligence.critical, 30),
      warnings: safeStringList(data.intelligence.warnings, 40),
      info: safeStringList(data.intelligence.info, 40),
      suggestedActions: safeStringList(data.intelligence.suggestedActions, 20),
    };
  }

  return sanitized;
}
