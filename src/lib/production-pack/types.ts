export const PRODUCTION_PACK_SECTION_IDS = [
  "overview",
  "scenes",
  "cast",
  "locations",
  "shooting_days",
  "call_sheets",
  "documents",
  "reports",
  "department_notes",
  "intelligence",
] as const;

export type ProductionPackSectionId =
  (typeof PRODUCTION_PACK_SECTION_IDS)[number];

export const PRODUCTION_PACK_SECTION_LABELS: Record<
  ProductionPackSectionId,
  string
> = {
  overview: "Project Overview",
  scenes: "Scenes",
  cast: "Cast & Characters",
  locations: "Locations",
  shooting_days: "Shooting Days",
  call_sheets: "Call Sheets Summary",
  documents: "Documents Index",
  reports: "Production Reports",
  department_notes: "Department Notes",
  intelligence: "Production Intelligence Check",
};

export const DEFAULT_PRODUCTION_PACK_SECTIONS: ProductionPackSectionId[] = [
  ...PRODUCTION_PACK_SECTION_IDS,
];
