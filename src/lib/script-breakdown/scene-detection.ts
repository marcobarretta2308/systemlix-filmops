import { normalizeScriptText } from "@/lib/script-breakdown/normalize-script";

export type SceneBlock = {
  index: number;
  heading: string;
  sceneNumber: string | null;
  text: string;
  startOffset: number;
};

const SCENE_HEADING_RE =
  /^(?:(?:(?:SCENE|SCENA)\s+)?(\d+[A-Z]?)\s*[-–—.]?\s*)?(INT\.?\/EXT\.?|INT\.?|EXT\.?|I\/E\.?|EST\.?|INTERNO|ESTERNO|INT\/EXT)(?:\s+.+)?$/i;

const NUMBERED_SCENE_LINE_RE =
  /^(\d+[A-Z]?)\s*[-–—.]\s*(INT\.?\/EXT\.?|INT\.?|EXT\.?|INTERNO|ESTERNO).+$/i;

const DAY_NIGHT_HINT_RE =
  /\b(DAY|NIGHT|EVENING|MORNING|DAWN|DUSK|GIORNO|NOTTE|SERA|MATTINA|MATTINO|ALBA|TRAMONTO)\b/i;

export function isSceneHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 140) return false;
  if (SCENE_HEADING_RE.test(trimmed) || NUMBERED_SCENE_LINE_RE.test(trimmed)) {
    if (/^(INT\.|EXT\.|INTERNO|ESTERNO)$/i.test(trimmed)) return false;
    return true;
  }
  return false;
}

/** Pull location name from slugline; preserves script language (IT/EN). */
export function extractLocationFromSlugline(slugline: string): string {
  const trimmed = slugline.trim();
  if (!trimmed) return "";

  const withoutSceneNum = trimmed.replace(/^SCENE\s+\d+[A-Z]?\s*[-–—.]?\s*/i, "");
  const match = withoutSceneNum.match(
    /^(?:\d+[A-Z]?\s*[-–—.]?\s*)?(?:INT\.?\/EXT\.?|INT\.?|EXT\.?|INTERNO|ESTERNO|INT\/EXT|I\/E\.?|EST\.?)\s+(.+?)(?:\s*[-–—]\s*(?:DAY|NIGHT|EVENING|MORNING|DAWN|DUSK|GIORNO|NOTTE|SERA|MATTINA|MATTINO|ALBA|TRAMONTO)\b.*)?$/i
  );
  if (match?.[1]) {
    return match[1].trim().replace(/\s*[-–—]\s*$/g, "");
  }

  return "";
}

export function extractSceneNumberFromHeading(heading: string): string | null {
  const trimmed = heading.trim();
  const numbered = trimmed.match(/^SCENE\s+(\d+[A-Z]?)/i);
  if (numbered?.[1]) return numbered[1];
  const prefix = trimmed.match(/^(\d+[A-Z]?)\s*[-–—.]/);
  if (prefix?.[1]) return prefix[1];
  return null;
}

export function detectSceneHeadings(scriptText: string): SceneBlock[] {
  const normalized = normalizeScriptText(scriptText);
  const lines = normalized.split("\n");
  const blocks: SceneBlock[] = [];
  let current: SceneBlock | null = null;
  let offset = 0;

  for (const line of lines) {
    const lineStart = offset;
    offset += line.length + 1;

    if (isSceneHeadingLine(line)) {
      if (current) blocks.push(current);
      const heading = line.trim();
      current = {
        index: blocks.length,
        heading,
        sceneNumber: extractSceneNumberFromHeading(heading),
        text: heading,
        startOffset: lineStart,
      };
      continue;
    }

    if (current) {
      current.text += `\n${line}`;
    }
  }

  if (current) blocks.push(current);

  return blocks.map((block, idx) => ({ ...block, index: idx }));
}

export function countLikelySceneHeadings(scriptText: string): number {
  const lines = normalizeScriptText(scriptText).split("\n");
  return lines.filter((line) => isSceneHeadingLine(line)).length;
}

export function splitIntoSceneBlocks(scriptText: string): SceneBlock[] {
  const scenes = detectSceneHeadings(scriptText);
  if (scenes.length > 0) return scenes;

  const normalized = normalizeScriptText(scriptText);
  const paragraphs = normalized.split(/\n\n+/).filter((p) => p.trim());
  return paragraphs.map((text, index) => ({
    index,
    heading: text.split("\n")[0]?.trim().slice(0, 80) || `Block ${index + 1}`,
    sceneNumber: String(index + 1),
    text: text.trim(),
    startOffset: 0,
  }));
}

export function sceneRangeLabel(blocks: SceneBlock[]): string {
  if (blocks.length === 0) return "—";
  const numbers = blocks
    .map((b) => b.sceneNumber)
    .filter((n): n is string => Boolean(n));
  if (numbers.length >= 2) {
    return `${numbers[0]}-${numbers[numbers.length - 1]}`;
  }
  if (numbers.length === 1) return numbers[0];
  return `${blocks[0].index + 1}-${blocks[blocks.length - 1].index + 1}`;
}

export { DAY_NIGHT_HINT_RE };
