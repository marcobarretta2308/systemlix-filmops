import {
  dash,
  type CallSheetPdfData,
  type CallSheetPdfScheduleRow,
} from "@/lib/pdf/call-sheet-types";

export function toTitleCase(value: string): string {
  if (!value || value === "—") return "—";

  return value
    .split(/(\s+|\/|-)/)
    .map((part) => {
      if (!part.trim() || /^[\s/\-]+$/.test(part)) return part;
      if (part === part.toUpperCase() && part.length <= 4) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

export function truncateText(value: string, maxLength: number): string {
  if (!value || value === "—") return "—";
  if (value.length <= maxLength) return value;

  const slice = value.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed =
    lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice.trimEnd();

  return `${trimmed}…`;
}

export function formatMapsDisplay(mapsLink: string): string {
  if (!mapsLink || mapsLink === "—") return "—";
  if (/^https?:\/\//i.test(mapsLink) && mapsLink.length > 36) {
    return "Apri mappa";
  }
  return truncateText(mapsLink, 52);
}

export const PDF_CONTENT_WIDTH = 595.28 - 32 * 2;

export function sceneColumnWidth(percent: number): number {
  return Math.round(PDF_CONTENT_WIDTH * percent * 100) / 100;
}

export function getScheduleTime(
  schedule: CallSheetPdfScheduleRow[],
  matchers: string[]
): string {
  const item = schedule.find((entry) =>
    matchers.some((matcher) =>
      entry.label.toLowerCase().includes(matcher.toLowerCase())
    )
  );
  return dash(item?.time);
}

export function formatEmergencyContacts(
  contacts: CallSheetPdfData["emergencyContacts"]
): string {
  if (!contacts.length) return "—";

  return contacts
    .map((contact) => {
      const name = dash(contact.name);
      const role = dash(contact.role);
      const phone = dash(contact.phone);
      return `${name} (${role}): ${phone}`;
    })
    .join("\n");
}

export function normalizeCallSheetPdfData(data: CallSheetPdfData): CallSheetPdfData {
  return {
    ...data,
    projectTitle: dash(data.projectTitle),
    productionTitle: dash(data.productionTitle),
    productionType: dash(data.productionType),
    statusLabel: dash(data.statusLabel),
    generatedAt: dash(data.generatedAt),
    dayNumber: dash(data.dayNumber),
    date: dash(data.date),
    locationName: dash(data.locationName),
    locationAddress: dash(data.locationAddress),
    mapsLink: dash(data.mapsLink),
    parkingNotes: dash(data.parkingNotes),
    accessNotes: dash(data.accessNotes),
    locationProductionNotes: dash(data.locationProductionNotes),
    transportNotes: dash(data.transportNotes),
    productionNotes: dash(data.productionNotes),
    schedule: data.schedule.map((item) => ({
      label: dash(item.label),
      time: dash(item.time),
    })),
    scenes: data.scenes.map((scene) => ({
      scene_number: dash(scene.scene_number),
      int_ext: dash(scene.int_ext),
      day_night: dash(scene.day_night),
      location: dash(scene.location),
      short_description: dash(scene.short_description),
      characters: dash(scene.characters),
      props: dash(scene.props),
      complexity: dash(scene.complexity),
    })),
    castCrew: data.castCrew.map((member) => ({
      name: toTitleCase(dash(member.name)),
      role: toTitleCase(dash(member.role)),
      department: toTitleCase(dash(member.department)),
      call_time: dash(member.call_time),
      status: dash(member.status),
    })),
    emergencyContacts: data.emergencyContacts.map((contact) => ({
      name: toTitleCase(dash(contact.name)),
      role: toTitleCase(dash(contact.role)),
      phone: dash(contact.phone),
    })),
  };
}
