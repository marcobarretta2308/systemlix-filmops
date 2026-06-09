const SCENE_HEADING_LINE_RE =
  /^(?:(?:SCENE\s+)?(\d+[A-Z]?)\s*[-–—.]?\s*)?(INT\.?\/EXT\.?|INT\.?|EXT\.?|I\/E\.?|EST\.?|INTERNO|ESTERNO|INT\/EXT)(?:\s+.+)?$/i;

function looksLikeSceneHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (!SCENE_HEADING_LINE_RE.test(trimmed)) return false;
  if (/^(INT\.|EXT\.|INTERNO|ESTERNO)$/i.test(trimmed)) return false;
  return true;
}

/** Base normalization for pasted or plain-text scripts. */
export function normalizeScriptText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

const ORPHAN_SLUGLINE_PREFIX_RE =
  /^(INT\.?\/EXT\.?|INT\.?|EXT\.?|I\/E\.?|EST\.?|INTERNO|ESTERNO|INT\/EXT)$/i;

/**
 * PDF-specific cleanup: fix broken line wraps and spacing while preserving sluglines.
 */
export function normalizePdfExtractedText(raw: string): string {
  let text = normalizeScriptText(raw);

  // Hyphenated word breaks across lines (e.g. "loca-\ntion")
  text = text.replace(/([\p{L}])-\n([\p{L}])/gu, "$1$2");

  const lines = text.split("\n");
  const merged: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      merged.push("");
      continue;
    }

    // Orphan INT./EXT. prefix on its own line → join with next line
    if (ORPHAN_SLUGLINE_PREFIX_RE.test(trimmed) && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (next) {
        merged.push(`${trimmed} ${next}`);
        i += 1;
        continue;
      }
    }

    // Collapse multiple spaces (preserve deep screenplay indents)
    if (/^\s{8,}/.test(line)) {
      merged.push(line.replace(/([^\s])[ \t]{2,}/g, "$1 "));
    } else {
      merged.push(trimmed.replace(/ {2,}/g, " "));
    }

    // Lowercase continuation from PDF word wrap (not sluglines)
    if (i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      if (
        nextTrimmed &&
        /^[a-zàèéìòùáéíóú]/.test(nextTrimmed) &&
        !looksLikeSceneHeading(nextTrimmed) &&
        !ORPHAN_SLUGLINE_PREFIX_RE.test(nextTrimmed) &&
        merged.length > 0
      ) {
        const prev = merged[merged.length - 1];
        if (
          prev &&
          !prev.endsWith(".") &&
          !prev.endsWith("!") &&
          !prev.endsWith("?") &&
          !prev.endsWith(":") &&
          !looksLikeSceneHeading(prev)
        ) {
          merged[merged.length - 1] = `${prev} ${nextTrimmed}`;
          i += 1;
        }
      }
    }
  }

  return normalizeScriptText(merged.join("\n"));
}
