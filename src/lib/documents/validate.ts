import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from "./constants";

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export function validateDocumentFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      ok: false,
      error: `File too large. Maximum size is ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB.`,
    };
  }

  const lower = file.name.toLowerCase();
  const extOk = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const mimeOk = ALLOWED_DOCUMENT_MIME_TYPES.includes(
    file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]
  );

  if (!extOk && !mimeOk) {
    return {
      ok: false,
      error:
        "Unsupported file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, JPG, PNG, WEBP.",
    };
  }

  return { ok: true };
}

export function buildDocumentStoragePath(
  companyId: string,
  projectId: string,
  documentId: string,
  originalFileName: string
): string {
  const safeName = sanitizeFileName(originalFileName);
  return `${companyId}/${projectId}/${documentId}/${safeName}`;
}
