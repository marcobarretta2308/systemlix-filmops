import {
  CHUNK_MAX_CHARS,
  CHUNK_MAX_SCENES,
  CHUNK_MIN_SPLIT_CHARS,
  CHUNK_OVERLAP_CHARS,
  CHUNK_FORCE_MIN_CHARS,
  CHUNK_FORCE_MIN_PAGES,
  CHUNK_FORCE_MIN_SCENES,
  SINGLE_SHOT_MAX_CHARS,
} from "@/lib/script-breakdown/config";
import {
  sceneRangeLabel,
  type SceneBlock,
  splitIntoSceneBlocks,
} from "@/lib/script-breakdown/scene-detection";

export type ScriptChunk = {
  chunk_index: number;
  scene_range: string;
  input_text: string;
  scene_count: number;
  char_count: number;
};

export type ChunkingOptions = {
  maxChars?: number;
  maxScenesPerChunk?: number;
  estimatedPages?: number;
  detectedSceneHeadings?: number;
};

export function shouldRequireChunkedPipeline(input: {
  charCount: number;
  sceneCount?: number;
  estimatedPages?: number;
}): boolean {
  return (
    input.charCount > SINGLE_SHOT_MAX_CHARS ||
    input.charCount > CHUNK_FORCE_MIN_CHARS ||
    (input.sceneCount ?? 0) >= CHUNK_FORCE_MIN_SCENES ||
    (input.estimatedPages ?? 0) >= CHUNK_FORCE_MIN_PAGES
  );
}

function splitOversizedText(text: string, maxChars: number): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return [trimmed];

  const paragraphs = trimmed.split(/\n\n+/).filter((p) => p.trim());
  const parts: string[] = [];
  let buffer = "";

  const flush = () => {
    if (!buffer.trim()) return;
    parts.push(buffer.trim());
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      flush();
      let lineBuf = "";
      for (const line of paragraph.split("\n")) {
        const next = lineBuf ? `${lineBuf}\n${line}` : line;
        if (next.length > maxChars && lineBuf) {
          parts.push(lineBuf);
          lineBuf = line;
        } else {
          lineBuf = next;
        }
      }
      if (lineBuf) parts.push(lineBuf);
      continue;
    }

    const next = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (next.length > maxChars && buffer.trim()) {
      flush();
      buffer = paragraph;
    } else {
      buffer = next;
    }
  }
  flush();

  return parts.length > 0 ? parts : [trimmed.slice(0, maxChars)];
}

function pushChunk(
  chunks: ScriptChunk[],
  blocks: SceneBlock[],
  text: string
): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  chunks.push({
    chunk_index: chunks.length,
    scene_range: sceneRangeLabel(blocks),
    input_text: trimmed,
    scene_count: blocks.length,
    char_count: trimmed.length,
  });
}

function buildChunksFromBlocks(
  blocks: SceneBlock[],
  maxChars: number,
  maxScenesPerChunk: number
): ScriptChunk[] {
  const chunks: ScriptChunk[] = [];
  let currentBlocks: SceneBlock[] = [];
  let currentText = "";

  const flush = () => {
    if (!currentText.trim()) return;
    pushChunk(chunks, currentBlocks, currentText);
    currentBlocks = [];
    currentText = "";
  };

  for (const block of blocks) {
    const blockText = block.text.trim();

    if (blockText.length > maxChars) {
      flush();
      const parts = splitOversizedText(blockText, maxChars);
      for (const part of parts) {
        pushChunk(chunks, [block], part);
      }
      continue;
    }

    const nextText = currentText ? `${currentText}\n\n${blockText}` : blockText;
    const exceedsChars = nextText.length > maxChars && currentText.trim();
    const exceedsScenes =
      currentBlocks.length >= maxScenesPerChunk && currentBlocks.length > 0;

    if (exceedsChars || exceedsScenes) {
      flush();
      currentBlocks = [block];
      currentText = blockText;
    } else {
      currentBlocks.push(block);
      currentText = nextText;
    }
  }

  flush();
  return chunks;
}

/** Force scene-count splits when char-based chunking still yields a single chunk. */
function forceSceneGroupChunks(
  blocks: SceneBlock[],
  maxScenesPerChunk: number
): ScriptChunk[] {
  const chunks: ScriptChunk[] = [];
  for (let i = 0; i < blocks.length; i += maxScenesPerChunk) {
    const slice = blocks.slice(i, i + maxScenesPerChunk);
    const text = slice.map((b) => b.text.trim()).join("\n\n");
    pushChunk(chunks, slice, text);
  }
  return chunks;
}

function splitParagraphFallback(
  scriptText: string,
  maxChars: number
): ScriptChunk[] {
  const parts = splitOversizedText(scriptText, maxChars);
  return parts.map((text, index) => ({
    chunk_index: index,
    scene_range: `block ${index + 1}`,
    input_text: text,
    scene_count: 0,
    char_count: text.length,
  }));
}

export function chunkSceneBlocks(
  scriptText: string,
  options: ChunkingOptions = {}
): ScriptChunk[] {
  const maxChars = options.maxChars ?? CHUNK_MAX_CHARS;
  const maxScenesPerChunk = options.maxScenesPerChunk ?? CHUNK_MAX_SCENES;
  const blocks = splitIntoSceneBlocks(scriptText);

  if (blocks.length === 0) {
    return splitParagraphFallback(scriptText, maxChars);
  }

  let chunks = buildChunksFromBlocks(blocks, maxChars, maxScenesPerChunk);

  const mustSplit =
    shouldRequireChunkedPipeline({
      charCount: scriptText.length,
      sceneCount: options.detectedSceneHeadings ?? blocks.length,
      estimatedPages: options.estimatedPages,
    }) && chunks.length === 1;

  if (mustSplit && blocks.length > 1) {
    chunks = forceSceneGroupChunks(blocks, maxScenesPerChunk);
  } else if (mustSplit && blocks.length === 1 && scriptText.length > CHUNK_MIN_SPLIT_CHARS) {
    const smallerMax = Math.max(
      CHUNK_MIN_SPLIT_CHARS,
      Math.floor(maxChars * 0.55)
    );
    chunks = splitParagraphFallback(scriptText, smallerMax);
  }

  if (chunks.length === 0 && scriptText.trim()) {
    return splitParagraphFallback(scriptText, maxChars);
  }

  return chunks.map((chunk, index) => ({ ...chunk, chunk_index: index }));
}

export function shouldUseChunkedPipeline(charCount: number): boolean {
  return shouldRequireChunkedPipeline({ charCount });
}
