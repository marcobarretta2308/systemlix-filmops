/** A4 dimensions in PDF points (72 dpi) */
export const PDF_A4_WIDTH = 595.28;
export const PDF_A4_HEIGHT = 841.89;
export const PDF_PAGE_MARGIN = 36;
export const PDF_PAGE_BOTTOM = 64;
export const PDF_FOOTER_HEIGHT = 28;
export const PDF_CONTENT_WIDTH = PDF_A4_WIDTH - PDF_PAGE_MARGIN * 2;
/** Max drawable height above the footer safe zone */
export const PDF_CONTENT_MAX_HEIGHT =
  PDF_A4_HEIGHT - PDF_PAGE_MARGIN - PDF_PAGE_BOTTOM - PDF_FOOTER_HEIGHT;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function safeNumber(
  value: unknown,
  fallback = 0,
  min = 0,
  max = 100000
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

export function safeText(
  value: unknown,
  fallback = "—",
  maxLength = 2000
): string {
  if (value === null || value === undefined) return fallback;
  let text = String(value).trim();
  if (!text || text === "null" || text === "undefined") return fallback;
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  if (text.length > maxLength) {
    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
  }
  return text;
}

export function safeDate(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const d = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(d.getTime())) return fallback;
  try {
    const formatted = d.toLocaleDateString("en-GB");
    return formatted === "Invalid Date" ? fallback : formatted;
  } catch {
    return fallback;
  }
}

export function safeDateTime(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const d = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(d.getTime())) return fallback;
  try {
    const formatted = d.toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return formatted.includes("Invalid") ? fallback : formatted;
  } catch {
    return fallback;
  }
}

export function safeScore(value: unknown): number {
  return Math.round(safeNumber(value, 0, 0, 100));
}

export function safeCount(value: unknown): number {
  return Math.round(safeNumber(value, 0, 0, 100000));
}

export function safeStyleDimension(
  value: unknown,
  fallback: number,
  min = 0,
  max = 10000
): number {
  return safeNumber(value, fallback, min, max);
}

export function safePercentWidth(percent: number): number {
  const p = safeNumber(percent, 0, 0, 1);
  return safeStyleDimension(
    Math.round(PDF_CONTENT_WIDTH * p * 100) / 100,
    PDF_CONTENT_WIDTH * 0.25,
    1,
    PDF_CONTENT_WIDTH
  );
}

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const size = safeCount(chunkSize) || 1;
  if (!items.length) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export const noHyphenation = (word: string): string[] => [word];

/** Italian production-pack timestamp — never returns empty or "—" */
export function formatProductionPackGeneratedAt(value?: unknown): string {
  let d = new Date();
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    d = value;
  } else if (value !== null && value !== undefined && value !== "" && value !== "—") {
    const parsed = new Date(String(value));
    if (Number.isFinite(parsed.getTime())) d = parsed;
  }
  const pad = (n: number) => String(safeCount(n)).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function truncateForPdf(
  value: unknown,
  maxLength = 180,
  fallback = "—"
): string {
  const text = safeText(value, fallback, maxLength + 1);
  if (text === fallback) return fallback;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}
