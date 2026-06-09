export const DOCUMENT_BUCKET = "project-documents";

export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DOCUMENT_CATEGORIES = [
  "Script",
  "Script Revision",
  "Call Sheet",
  "Production Plan",
  "Cast",
  "Crew",
  "Location",
  "Costume",
  "Props",
  "VFX",
  "Stunts",
  "Vehicles",
  "Contracts",
  "Moodboard",
  "Notes",
  "Other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_DEPARTMENTS = [
  "Production",
  "Direction",
  "AD Department",
  "Camera",
  "Lighting",
  "Sound",
  "Art",
  "Costume",
  "Makeup",
  "Props",
  "VFX",
  "Stunts",
  "Locations",
  "Transport",
  "Cast",
  "Other",
] as const;

export type DocumentDepartment = (typeof DOCUMENT_DEPARTMENTS)[number];

export const DOCUMENT_VISIBILITY_OPTIONS = [
  { value: "project", label: "All project members" },
  { value: "department", label: "Specific department" },
] as const;

export type DocumentVisibility = "project" | "department";

/** Map reparto FilmOps membership → document department */
export const MEMBER_DEPARTMENT_TO_DOCUMENT: Record<string, DocumentDepartment> = {
  Costumi: "Costume",
  Trucco: "Makeup",
  Props: "Props",
  Trasporti: "Transport",
  Location: "Locations",
};

export const SCRIPT_CATEGORIES: DocumentCategory[] = [
  "Script",
  "Script Revision",
];
